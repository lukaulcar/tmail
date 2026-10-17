package streamer

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/mail"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"tmail/backend/pkg/config"
	"tmail/backend/pkg/db"
	"tmail/backend/pkg/generator"
	"tmail/backend/pkg/hub"
)

type UpstreamMessage struct {
	ID        string `json:"id"`
	Mailbox   string `json:"mailbox"`
	Folder    string `json:"folder"`
	From      string `json:"from"`
	To        string `json:"to"`
	Subject   string `json:"subject"`
	Body      string `json:"body"`
	BodyHTML  string `json:"body_html,omitempty"`
	SizeBytes int64  `json:"size_bytes"`
	Date      string `json:"date"`
	CreatedAt int64  `json:"created_at"`
}

type UpstreamLiveEvent struct {
	Type      string          `json:"type"`
	Address   string          `json:"address,omitempty"`
	Folder    string          `json:"folder,omitempty"`
	Message   UpstreamMessage `json:"message,omitempty"`
	Timestamp int64           `json:"timestamp"`
}

type Streamer struct {
	cfg         *config.Config
	db          *db.DB
	hub         *hub.Hub
	processed   map[string]time.Time
	processedMu sync.Mutex
}

func New(cfg *config.Config, database *db.DB, h *hub.Hub) *Streamer {
	return &Streamer{
		cfg:       cfg,
		db:        database,
		hub:       h,
		processed: make(map[string]time.Time),
	}
}

func (s *Streamer) Start(ctx context.Context) {
	go s.streamLoop(ctx)

	cleanupTicker := time.NewTicker(1 * time.Minute)
	defer cleanupTicker.Stop()

	s.cleanupOnce()

	for {
		select {
		case <-ctx.Done():
			return
		case <-cleanupTicker.C:
			s.cleanupOnce()
		}
	}
}

func (s *Streamer) streamLoop(ctx context.Context) {
	if s.cfg.MailerAPIKey == "" {
		return
	}

	baseURL := s.cfg.MailerAPIURL
	if strings.HasPrefix(baseURL, "https://") {
		baseURL = "wss://" + strings.TrimPrefix(baseURL, "https://")
	} else if strings.HasPrefix(baseURL, "http://") {
		baseURL = "ws://" + strings.TrimPrefix(baseURL, "http://")
	}
	endpointURL := strings.TrimRight(baseURL, "/") + "/v1/stream"
	wsURL := endpointURL + "?key=" + s.cfg.MailerAPIKey + "&token=" + s.cfg.MailerAPIKey

	retryDelay := 2 * time.Second

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		headers := http.Header{}
		headers.Set("Authorization", "Bearer "+s.cfg.MailerAPIKey)
		headers.Set("User-Agent", "tmail-streamer/1.0")

		dialer := websocket.Dialer{
			HandshakeTimeout: 10 * time.Second,
		}

		conn, resp, err := dialer.DialContext(ctx, wsURL, headers)
		if resp != nil && resp.Body != nil {
			_ = resp.Body.Close()
		}

		if err != nil {
			errStr := strings.ReplaceAll(err.Error(), s.cfg.MailerAPIKey, "[REDACTED]")
			log.Printf("[STREAM] Connection failed to %s: %s", endpointURL, errStr)
			waitDuration := retryDelay
			if resp != nil && resp.StatusCode == http.StatusUnauthorized {
				log.Printf("[STREAM] Unauthorized (HTTP %d). Retrying in 30s...", resp.StatusCode)
				waitDuration = 30 * time.Second
			} else {
				if retryDelay < 30*time.Second {
					retryDelay *= 2
				}
			}

			select {
			case <-ctx.Done():
				return
			case <-time.After(waitDuration):
				continue
			}
		}

		retryDelay = 2 * time.Second
		log.Printf("[STREAM] Connected to live stream at %s", endpointURL)

		_ = conn.WriteJSON(map[string]string{
			"key": s.cfg.MailerAPIKey,
		})

		s.readStream(ctx, conn)
		_ = conn.Close()
		log.Printf("[STREAM] Disconnected from live stream, reconnecting...")

		select {
		case <-ctx.Done():
			return
		case <-time.After(2 * time.Second):
		}
	}
}

func (s *Streamer) readStream(ctx context.Context, conn *websocket.Conn) {
	conn.SetReadLimit(2 * 1024 * 1024)
	_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	stopPing := make(chan struct{})
	defer close(stopPing)

	go func() {
		ticker := time.NewTicker(20 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-stopPing:
				return
			case <-ctx.Done():
				return
			case <-ticker.C:
				_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					_ = conn.Close()
					return
				}
			}
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		_, data, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[STREAM] Stream closed or read error: %v", err)
			return
		}
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		var event UpstreamLiveEvent
		if err := json.Unmarshal(data, &event); err == nil && event.Type == "message_received" && event.Message.ID != "" {
			s.processMessage(event.Message)
			continue
		}

		var directMsg UpstreamMessage
		if err := json.Unmarshal(data, &directMsg); err == nil && directMsg.ID != "" {
			s.processMessage(directMsg)
		}
	}
}

func (s *Streamer) isDuplicate(id string) bool {
	s.processedMu.Lock()
	defer s.processedMu.Unlock()

	if _, ok := s.processed[id]; ok {
		return true
	}
	s.processed[id] = time.Now()

	if len(s.processed) > 5000 {
		cutoff := time.Now().Add(-6 * time.Hour)
		for k, t := range s.processed {
			if t.Before(cutoff) {
				delete(s.processed, k)
			}
		}
	}
	return false
}

func (s *Streamer) processMessage(msg UpstreamMessage) {
	if msg.ID == "" {
		return
	}

	if s.isDuplicate(msg.ID) {
		return
	}

	domainLower := strings.ToLower(s.cfg.Domain)
	recipients := extractEmailAddresses(msg.To)

	if msg.Mailbox != "" {
		cleanMailbox := strings.ToLower(strings.TrimSpace(msg.Mailbox))
		if strings.HasSuffix(cleanMailbox, "@"+domainLower) {
			recipients = append(recipients, cleanMailbox)
		}
	}

	seen := make(map[string]bool)

	for _, rcpt := range recipients {
		cleanRcpt := strings.ToLower(strings.TrimSpace(rcpt))
		if !strings.HasSuffix(cleanRcpt, "@"+domainLower) || seen[cleanRcpt] {
			continue
		}
		seen[cleanRcpt] = true

		mb, err := s.db.GetMailboxByAddress(cleanRcpt)
		if err != nil || mb == nil {
			mbID := generator.GenerateMailboxID()
			token := generator.GenerateToken()
			mb, err = s.db.CreateMailbox(mbID, cleanRcpt, token)
			if err != nil || mb == nil {
				continue
			}
		}

		log.Printf("[MAIL RECEIVED] For: %s | From: %s | Subject: %q", cleanRcpt, msg.From, msg.Subject)

		createdAt := msg.CreatedAt
		if createdAt <= 0 {
			createdAt = time.Now().Unix()
		}

		record := &db.Message{
			ID:             msg.ID,
			MailboxAddress: cleanRcpt,
			Sender:         msg.From,
			Recipient:      cleanRcpt,
			Subject:        msg.Subject,
			Body:           msg.Body,
			BodyHTML:       msg.BodyHTML,
			SizeBytes:      msg.SizeBytes,
			Date:           msg.Date,
			CreatedAt:      createdAt,
			IsRead:         false,
		}

		inserted, err := s.db.SaveMessage(record)
		if err == nil && inserted {
			s.hub.BroadcastToMailbox(cleanRcpt, map[string]any{
				"type":    "new_message",
				"message": record,
			})
		}
	}
}

func (s *Streamer) cleanupOnce() {
	deletedMsgs, deletedMbxs, err := s.db.CleanupExpired()
	if err != nil {
		log.Printf("Cleanup error: %v", err)
		return
	}
	if deletedMsgs > 0 || deletedMbxs > 0 {
		log.Printf("Cleaned up expired records: %d messages, %d mailboxes", deletedMsgs, deletedMbxs)
	}
}

func extractEmailAddresses(raw string) []string {
	if raw == "" {
		return nil
	}

	list, err := mail.ParseAddressList(raw)
	if err == nil && len(list) > 0 {
		out := make([]string, 0, len(list))
		for _, addr := range list {
			if addr != nil && addr.Address != "" {
				out = append(out, strings.ToLower(strings.TrimSpace(addr.Address)))
			}
		}
		return out
	}

	parts := strings.Split(raw, ",")
	var out []string
	for _, p := range parts {
		cleaned := strings.TrimSpace(p)
		if idx := strings.Index(cleaned, "<"); idx != -1 {
			if end := strings.Index(cleaned, ">"); end > idx {
				cleaned = cleaned[idx+1 : end]
			}
		}
		cleaned = strings.TrimSpace(cleaned)
		if cleaned != "" {
			out = append(out, strings.ToLower(cleaned))
		}
	}
	return out
}
