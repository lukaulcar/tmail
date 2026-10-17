package hub

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct {
	hub            *Hub
	conn           *websocket.Conn
	send           chan []byte
	mailboxAddress string
	closeOnce      sync.Once
}

func (c *Client) closeSend() {
	c.closeOnce.Do(func() {
		close(c.send)
	})
}

type Hub struct {
	clients map[string]map[*Client]bool
	mu      sync.RWMutex
}

func New() *Hub {
	return &Hub{
		clients: make(map[string]map[*Client]bool),
	}
}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	addr := strings.ToLower(c.mailboxAddress)
	if _, ok := h.clients[addr]; !ok {
		h.clients[addr] = make(map[*Client]bool)
	}
	h.clients[addr][c] = true
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	addr := strings.ToLower(c.mailboxAddress)
	if set, ok := h.clients[addr]; ok {
		if set[c] {
			delete(set, c)
			c.closeSend()
			if len(set) == 0 {
				delete(h.clients, addr)
			}
		}
	}
}

func (h *Hub) BroadcastToMailbox(mailboxAddress string, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	addr := strings.ToLower(strings.TrimSpace(mailboxAddress))
	if set, ok := h.clients[addr]; ok {
		for c := range set {
			select {
			case c.send <- data:
			default:
			}
		}
	}
}

func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request, mailboxAddress string) error {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return err
	}

	client := &Client{
		hub:            h,
		conn:           conn,
		send:           make(chan []byte, 64),
		mailboxAddress: strings.ToLower(strings.TrimSpace(mailboxAddress)),
	}

	h.register(client)

	go client.writePump()
	go client.readPump()

	return nil
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister(c)
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(4096)
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)
			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
