package generator

import (
	"crypto/rand"
	"fmt"
	"regexp"
	"strings"

	"github.com/brianvoe/gofakeit/v7"
	"github.com/google/uuid"
)

var cleanRegex = regexp.MustCompile("[^a-z0-9]")

func cleanName(s string) string {
	return cleanRegex.ReplaceAllString(strings.ToLower(strings.TrimSpace(s)), "")
}

func GenerateMailboxID() string {
	return "mbx_" + strings.ReplaceAll(uuid.New().String(), "-", "")[:16]
}

func GenerateToken() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return fmt.Sprintf("tm_%x", b)
}

func GenerateNextAddress(nextSeq func() (uint64, error), isUsed func(string) bool, domain string) (string, error) {
	for attempt := 0; attempt < 100; attempt++ {
		seq, err := nextSeq()
		if err != nil {
			return "", err
		}

		f := gofakeit.New(seq * 2654435761)
		fn := cleanName(f.FirstName())
		ln := cleanName(f.LastName())

		if fn == "" {
			fn = "user"
		}
		if ln == "" {
			ln = fmt.Sprintf("%d", seq)
		}

		addr := fmt.Sprintf("%s.%s@%s", fn, ln, domain)
		user := strings.Split(addr, "@")[0]

		if !isUsed(user) {
			return addr, nil
		}
	}

	seq, err := nextSeq()
	if err != nil {
		seq = 1
	}
	f := gofakeit.New(seq * 2654435761)
	fn := cleanName(f.FirstName())
	ln := cleanName(f.LastName())
	if fn == "" {
		fn = "user"
	}
	return fmt.Sprintf("%s.%s%d@%s", fn, ln, seq%1000, domain), nil
}
