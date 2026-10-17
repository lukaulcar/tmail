package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"tmail/backend/pkg/config"
	"tmail/backend/pkg/db"
	"tmail/backend/pkg/generator"
	"tmail/backend/pkg/hub"
)

type Server struct {
	cfg *config.Config
	db  *db.DB
	hub *hub.Hub
}

func NewServer(cfg *config.Config, database *db.DB, h *hub.Hub) *Server {
	return &Server{
		cfg: cfg,
		db:  database,
		hub: h,
	}
}

func (s *Server) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/health", s.handleHealth)
	mux.HandleFunc("/api/mailbox", s.handleMailbox)
	mux.HandleFunc("/api/mailbox/refresh", s.handleMailboxRefresh)
	mux.HandleFunc("/api/mailbox/messages", s.handleMessages)
	mux.HandleFunc("/api/mailbox/messages/", s.handleMessageByID)
	mux.HandleFunc("/api/ws", s.handleWS)
}

func (s *Server) CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Mailbox-Token")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"time":   time.Now().Unix(),
	})
}

func (s *Server) extractToken(r *http.Request) string {
	if tok := r.Header.Get("X-Mailbox-Token"); tok != "" {
		return strings.TrimSpace(tok)
	}

	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
	}

	if tok := r.URL.Query().Get("token"); tok != "" {
		return strings.TrimSpace(tok)
	}

	return ""
}

func (s *Server) handleMailbox(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	requestedAddress := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("address")))
	if requestedAddress != "" && strings.HasSuffix(requestedAddress, "@"+strings.ToLower(s.cfg.Domain)) {
		mb, err := s.db.GetMailboxByAddress(requestedAddress)
		if err == nil && mb != nil {
			writeJSON(w, http.StatusOK, map[string]any{"mailbox": mb})
			return
		}
		mbID := generator.GenerateMailboxID()
		newToken := generator.GenerateToken()
		mb, err = s.db.CreateMailbox(mbID, requestedAddress, newToken)
		if err == nil && mb != nil {
			writeJSON(w, http.StatusOK, map[string]any{"mailbox": mb})
			return
		}
	}

	token := s.extractToken(r)
	if token != "" {
		mb, err := s.db.GetMailboxByToken(token)
		if err == nil && mb != nil {
			writeJSON(w, http.StatusOK, map[string]any{"mailbox": mb})
			return
		}
	}

	mbID := generator.GenerateMailboxID()
	address, err := generator.GenerateNextAddress(s.db.NextSequence, s.db.IsUsernameUsed, s.cfg.Domain)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate address")
		return
	}
	newToken := generator.GenerateToken()

	mb, err := s.db.CreateMailbox(mbID, address, newToken)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create mailbox")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"mailbox": mb})
}

func (s *Server) handleMailboxRefresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	token := s.extractToken(r)
	if token == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized: token required")
		return
	}

	newAddress, err := generator.GenerateNextAddress(s.db.NextSequence, s.db.IsUsernameUsed, s.cfg.Domain)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate address")
		return
	}

	mb, err := s.db.RefreshMailboxAddress(token, newAddress)
	if err != nil {
		if strings.Contains(err.Error(), "cooldown active") {
			parts := strings.Fields(err.Error())
			remSec := 0
			if len(parts) >= 3 {
				remSec, _ = strconv.Atoi(parts[2])
			}
			writeJSON(w, http.StatusTooManyRequests, map[string]any{
				"error":             err.Error(),
				"seconds_remaining": remSec,
			})
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to refresh mailbox address")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"mailbox": mb})
}

func (s *Server) handleMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	token := s.extractToken(r)
	if token == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized: token required")
		return
	}

	mb, err := s.db.GetMailboxByToken(token)
	if err != nil || mb == nil {
		writeError(w, http.StatusNotFound, "Mailbox not found or expired")
		return
	}

	messages, err := s.db.ListMessages(mb.Address)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load messages")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"messages": messages,
		"total":    len(messages),
	})
}

func (s *Server) handleMessageByID(w http.ResponseWriter, r *http.Request) {
	token := s.extractToken(r)
	if token == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized: token required")
		return
	}

	mb, err := s.db.GetMailboxByToken(token)
	if err != nil || mb == nil {
		writeError(w, http.StatusNotFound, "Mailbox not found or expired")
		return
	}

	id := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/mailbox/messages/"))
	if id == "" {
		writeError(w, http.StatusBadRequest, "Message ID required")
		return
	}

	switch r.Method {
	case http.MethodGet:
		msg, err := s.db.GetMessage(id, mb.Address)
		if err != nil || msg == nil {
			writeError(w, http.StatusNotFound, "Message not found")
			return
		}
		_ = s.db.MarkMessageRead(id, mb.Address)
		msg.IsRead = true
		writeJSON(w, http.StatusOK, map[string]any{"message": msg})

	case http.MethodDelete:
		if err := s.db.DeleteMessage(id, mb.Address); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to delete message")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	token := s.extractToken(r)
	if token == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	mb, err := s.db.GetMailboxByToken(token)
	if err != nil || mb == nil {
		http.Error(w, "Mailbox not found", http.StatusNotFound)
		return
	}

	_ = s.hub.HandleWS(w, r, mb.Address)
}

func (s *Server) ServeSPA(distPath string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		path := filepath.Join(distPath, filepath.Clean(r.URL.Path))
		info, err := os.Stat(path)
		if err == nil && !info.IsDir() {
			http.ServeFile(w, r, path)
			return
		}

		http.ServeFile(w, r, filepath.Join(distPath, "index.html"))
	})
}
