package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Config struct {
	Port                   string
	Env                    string
	MailerAPIKey           string
	MailerAPIURL           string
	Domain                 string
	DBPath                 string
	MailTTLHours           int
	MailboxTTLHours        int
	MailboxCooldownMinutes int
}

func loadEnvFile(paths ...string) {
	for _, p := range paths {
		f, err := os.Open(p)
		if err != nil {
			continue
		}
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				k := strings.TrimSpace(parts[0])
				v := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
				if os.Getenv(k) == "" {
					os.Setenv(k, v)
				}
			}
		}
		_ = f.Close()
		return
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}

func Load() *Config {
	loadEnvFile(".env", filepath.Join("..", ".env"), filepath.Join("backend", ".env"))

	apiURL := strings.TrimSuffix(getEnv("MAILER_API_URL", "https://api.mailer.lukaulcar.com"), "/")

	return &Config{
		Port:                   getEnv("PORT", "8080"),
		Env:                    getEnv("ENV", "development"),
		MailerAPIKey:           os.Getenv("MAILER_API_KEY"),
		MailerAPIURL:           apiURL,
		Domain:                 getEnv("DOMAIN", "garmdata.com"),
		DBPath:                 getEnv("DB_PATH", "tmail.db"),
		MailTTLHours:           getEnvInt("MAIL_TTL_HOURS", 24),
		MailboxTTLHours:        getEnvInt("MAILBOX_TTL_HOURS", 24),
		MailboxCooldownMinutes: getEnvInt("MAILBOX_COOLDOWN_MINUTES", 15),
	}
}
