package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"tmail/backend/pkg/api"
	"tmail/backend/pkg/config"
	"tmail/backend/pkg/db"
	"tmail/backend/pkg/hub"
	"tmail/backend/pkg/streamer"
)

func main() {
	cfg := config.Load()

	database, err := db.New(cfg.DBPath, cfg.MailboxCooldownMinutes, cfg.MailboxTTLHours, cfg.MailTTLHours)
	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}
	defer database.Close()

	wsHub := hub.New()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	mailStreamer := streamer.New(cfg, database, wsHub)
	go mailStreamer.Start(ctx)

	server := api.NewServer(cfg, database, wsHub)

	mux := http.NewServeMux()
	server.RegisterRoutes(mux)

	candidateDistPaths := []string{
		filepath.Join("..", "frontend", "dist"),
		filepath.Join("frontend", "dist"),
		"dist",
	}

	for _, p := range candidateDistPaths {
		if info, err := os.Stat(p); err == nil && info.IsDir() {
			mux.Handle("/", server.ServeSPA(p))
			break
		}
	}

	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	httpServer := &http.Server{
		Addr:              serverAddr,
		Handler:           server.CORS(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("tmail backend running on %s", serverAddr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server listen error: %v", err)
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	cancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server shutdown warning: %v", err)
	}
}
