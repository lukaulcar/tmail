package db

import (
	"database/sql"
	"fmt"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

type Mailbox struct {
	ID              string `json:"id"`
	Address         string `json:"address"`
	Token           string `json:"token"`
	CreatedAt       int64  `json:"created_at"`
	LastRefreshedAt int64  `json:"last_refreshed_at"`
	ExpiresAt       int64  `json:"expires_at"`
	CanRefresh      bool   `json:"can_refresh"`
	NextRefreshAt   int64  `json:"next_refresh_at"`
}

type Message struct {
	ID             string `json:"id"`
	MailboxAddress string `json:"mailbox_address"`
	Sender         string `json:"sender"`
	Recipient      string `json:"recipient"`
	Subject        string `json:"subject"`
	Body           string `json:"body"`
	BodyHTML       string `json:"body_html"`
	SizeBytes      int64  `json:"size_bytes"`
	Date           string `json:"date"`
	CreatedAt      int64  `json:"created_at"`
	IsRead         bool   `json:"is_read"`
}

type DB struct {
	db                *sql.DB
	cooldownSeconds   int64
	mailboxTTLSeconds int64
	messageTTLSeconds int64
	mu                sync.RWMutex
}

type rowScanner interface {
	Scan(dest ...any) error
}

func cleanAddress(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func scanMessage(s rowScanner) (*Message, error) {
	var m Message
	var isReadInt int
	err := s.Scan(&m.ID, &m.MailboxAddress, &m.Sender, &m.Recipient, &m.Subject, &m.Body, &m.BodyHTML, &m.SizeBytes, &m.Date, &m.CreatedAt, &isReadInt)
	if err != nil {
		return nil, err
	}
	m.IsRead = isReadInt == 1
	return &m, nil
}

func New(dbPath string, cooldownMinutes, mailboxTTLHours, mailTTLHours int) (*DB, error) {
	conn, err := sql.Open("sqlite", dbPath+"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	conn.SetMaxOpenConns(1)
	conn.SetMaxIdleConns(1)
	conn.SetConnMaxLifetime(0)

	d := &DB{
		db:                conn,
		cooldownSeconds:   int64(cooldownMinutes * 60),
		mailboxTTLSeconds: int64(mailboxTTLHours * 3600),
		messageTTLSeconds: int64(mailTTLHours * 3600),
	}

	if err := d.migrate(); err != nil {
		_ = conn.Close()
		return nil, err
	}

	return d, nil
}

func (d *DB) Close() error {
	return d.db.Close()
}

func (d *DB) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS mailboxes (
		id TEXT PRIMARY KEY,
		address TEXT NOT NULL UNIQUE,
		token TEXT NOT NULL UNIQUE,
		created_at INTEGER NOT NULL,
		last_refreshed_at INTEGER NOT NULL,
		expires_at INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_mailboxes_token ON mailboxes(token);
	CREATE INDEX IF NOT EXISTS idx_mailboxes_address ON mailboxes(address);
	CREATE INDEX IF NOT EXISTS idx_mailboxes_expires_at ON mailboxes(expires_at);

	CREATE TABLE IF NOT EXISTS messages (
		id TEXT PRIMARY KEY,
		mailbox_address TEXT NOT NULL,
		sender TEXT NOT NULL,
		recipient TEXT NOT NULL,
		subject TEXT NOT NULL,
		body TEXT NOT NULL,
		body_html TEXT NOT NULL,
		size_bytes INTEGER NOT NULL,
		date TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		is_read INTEGER NOT NULL DEFAULT 0
	);
	CREATE INDEX IF NOT EXISTS idx_messages_mailbox ON messages(mailbox_address);
	CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

	CREATE TABLE IF NOT EXISTS used_usernames (
		username TEXT PRIMARY KEY,
		created_at INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_used_usernames ON used_usernames(username);

	CREATE TABLE IF NOT EXISTS generator_sequence (
		id INTEGER PRIMARY KEY,
		next_val INTEGER NOT NULL
	);
	INSERT OR IGNORE INTO generator_sequence (id, next_val) VALUES (1, 1);
	`
	_, err := d.db.Exec(schema)
	return err
}

func (d *DB) NextSequence() (uint64, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	var val uint64
	err := d.db.QueryRow(`UPDATE generator_sequence SET next_val = next_val + 1 WHERE id = 1 RETURNING next_val - 1`).Scan(&val)
	if err != nil {
		return 0, err
	}
	return val, nil
}

func (d *DB) IsUsernameUsed(username string) bool {
	d.mu.RLock()
	defer d.mu.RUnlock()

	clean := cleanAddress(username)
	var count int
	_ = d.db.QueryRow(`SELECT COUNT(*) FROM used_usernames WHERE username = ?`, clean).Scan(&count)
	if count > 0 {
		return true
	}
	_ = d.db.QueryRow(`SELECT COUNT(*) FROM mailboxes WHERE address LIKE ?`, clean+"@%").Scan(&count)
	return count > 0
}

func (d *DB) CreateMailbox(id, address, token string) (*Mailbox, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now().Unix()
	expiresAt := now + d.mailboxTTLSeconds
	addr := cleanAddress(address)

	query := `INSERT INTO mailboxes (id, address, token, created_at, last_refreshed_at, expires_at)
	          VALUES (?, ?, ?, ?, ?, ?)`
	_, err := d.db.Exec(query, id, addr, token, now, now, expiresAt)
	if err != nil {
		return nil, err
	}

	username := strings.Split(addr, "@")[0]
	_, _ = d.db.Exec(`INSERT OR IGNORE INTO used_usernames (username, created_at) VALUES (?, ?)`, username, now)

	return &Mailbox{
		ID:              id,
		Address:         addr,
		Token:           token,
		CreatedAt:       now,
		LastRefreshedAt: now,
		ExpiresAt:       expiresAt,
		CanRefresh:      false,
		NextRefreshAt:   now + d.cooldownSeconds,
	}, nil
}

func (d *DB) getMailbox(query, key string) (*Mailbox, error) {
	clean := strings.TrimSpace(key)
	if clean == "" {
		return nil, sql.ErrNoRows
	}

	var mb Mailbox
	err := d.db.QueryRow(query, clean).Scan(&mb.ID, &mb.Address, &mb.Token, &mb.CreatedAt, &mb.LastRefreshedAt, &mb.ExpiresAt)
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()
	if now >= mb.ExpiresAt {
		return nil, sql.ErrNoRows
	}

	mb.NextRefreshAt = mb.LastRefreshedAt + d.cooldownSeconds
	mb.CanRefresh = now >= mb.NextRefreshAt
	return &mb, nil
}

func (d *DB) GetMailboxByToken(token string) (*Mailbox, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.getMailbox(`SELECT id, address, token, created_at, last_refreshed_at, expires_at FROM mailboxes WHERE token = ?`, token)
}

func (d *DB) GetMailboxByAddress(address string) (*Mailbox, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.getMailbox(`SELECT id, address, token, created_at, last_refreshed_at, expires_at FROM mailboxes WHERE address = ?`, cleanAddress(address))
}

func (d *DB) RefreshMailboxAddress(oldToken, newAddress string) (*Mailbox, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	cleanToken := strings.TrimSpace(oldToken)
	mb, err := d.getMailbox(`SELECT id, address, token, created_at, last_refreshed_at, expires_at FROM mailboxes WHERE token = ?`, cleanToken)
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()
	if now < mb.NextRefreshAt {
		rem := mb.NextRefreshAt - now
		return nil, fmt.Errorf("cooldown active: %d seconds remaining", rem)
	}

	newAddr := cleanAddress(newAddress)
	upd := `UPDATE mailboxes SET address = ?, last_refreshed_at = ? WHERE token = ?`
	if _, err := d.db.Exec(upd, newAddr, now, cleanToken); err != nil {
		return nil, err
	}

	newUsername := strings.Split(newAddr, "@")[0]
	_, _ = d.db.Exec(`INSERT OR IGNORE INTO used_usernames (username, created_at) VALUES (?, ?)`, newUsername, now)

	mb.Address = newAddr
	mb.LastRefreshedAt = now
	mb.NextRefreshAt = now + d.cooldownSeconds
	mb.CanRefresh = false

	return mb, nil
}

func (d *DB) SaveMessage(m *Message) (bool, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	query := `INSERT OR IGNORE INTO messages (id, mailbox_address, sender, recipient, subject, body, body_html, size_bytes, date, created_at, is_read)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	isReadInt := 0
	if m.IsRead {
		isReadInt = 1
	}
	res, err := d.db.Exec(query, m.ID, cleanAddress(m.MailboxAddress), m.Sender, m.Recipient, m.Subject, m.Body, m.BodyHTML, m.SizeBytes, m.Date, m.CreatedAt, isReadInt)
	if err != nil {
		return false, err
	}
	rows, _ := res.RowsAffected()
	return rows > 0, nil
}

func (d *DB) ListMessages(mailboxAddress string) ([]*Message, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	clean := cleanAddress(mailboxAddress)
	query := `SELECT id, mailbox_address, sender, recipient, subject, body, body_html, size_bytes, date, created_at, is_read
	          FROM messages WHERE mailbox_address = ? ORDER BY created_at DESC`
	rows, err := d.db.Query(query, clean)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*Message, 0)
	for rows.Next() {
		m, err := scanMessage(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return list, nil
}

func (d *DB) GetMessage(id, mailboxAddress string) (*Message, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	clean := cleanAddress(mailboxAddress)
	query := `SELECT id, mailbox_address, sender, recipient, subject, body, body_html, size_bytes, date, created_at, is_read
	          FROM messages WHERE id = ? AND mailbox_address = ?`
	return scanMessage(d.db.QueryRow(query, strings.TrimSpace(id), clean))
}

func (d *DB) MarkMessageRead(id, mailboxAddress string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	query := `UPDATE messages SET is_read = 1 WHERE id = ? AND mailbox_address = ?`
	_, err := d.db.Exec(query, strings.TrimSpace(id), cleanAddress(mailboxAddress))
	return err
}

func (d *DB) DeleteMessage(id, mailboxAddress string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	query := `DELETE FROM messages WHERE id = ? AND mailbox_address = ?`
	_, err := d.db.Exec(query, strings.TrimSpace(id), cleanAddress(mailboxAddress))
	return err
}

func (d *DB) CleanupExpired() (int64, int64, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now().Unix()
	msgCutoff := now - d.messageTTLSeconds

	resMsg, err := d.db.Exec(`DELETE FROM messages WHERE created_at < ?`, msgCutoff)
	if err != nil {
		return 0, 0, err
	}
	deletedMsgs, _ := resMsg.RowsAffected()

	resMbx, err := d.db.Exec(`DELETE FROM mailboxes WHERE expires_at < ?`, now)
	if err != nil {
		return deletedMsgs, 0, err
	}
	deletedMbxs, _ := resMbx.RowsAffected()

	return deletedMsgs, deletedMbxs, nil
}
