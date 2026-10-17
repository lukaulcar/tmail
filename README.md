# tmail

A fast, real-time disposable email service.

Live site: [tmail.lukaulcar.com](https://tmail.lukaulcar.com)

---

## How it works & Built with mailer-go

Running a temporary mail service usually means running your own mail server (Postfix/Exim), dealing with spam, open relays, DNS headaches, or constantly polling an IMAP inbox every few seconds.

This project is built using [**mailer-go**](https://mailer.lukaulcar.com/). 

Instead of polling or hosting an MTA, the Go backend establishes a persistent WebSocket connection to mailer-go's `/v1/stream` endpoint. When an email hits the domain's catch-all address, mailer-go pushes the parsed message (headers, HTML, and text) over the stream in real-time. The backend matches the recipient to an active temporary mailbox, writes it to SQLite, and pushes it directly to the user's browser over WebSockets.

If you need an email backend with real-time stream ingestion or transactional sending, check out [mailer-go](https://mailer.lukaulcar.com/).

---

## Features

- **Instant updates**: New emails show up in the UI immediately via WebSockets (no manual refresh needed).
- **Realistic generated addresses**: Uses `gofakeit` to generate human-readable emails (`firstname.lastname@domain.com`).
- **Custom addresses**: You can enter any custom name you want.
- **Session persistence**: Mailboxes use a generated token stored in `localStorage` so refreshing the page doesn't lose your inbox.
- **Automatic cleanup**: Configurable TTL for messages and mailboxes (default 24h), plus a 15-minute cooldown before released addresses can be reused.
- **No CGO required**: Uses `modernc.org/sqlite` in WAL mode, so compiling and cross-compiling Go binaries is straightforward on any platform.
- **Simple, clean UI**: React 19, TypeScript, Vite, and Tailwind CSS. Includes mobile QR code, copy buttons, and HTML email previews.

---

## Tech Stack

- **Backend**: Go 1.26, pure-Go SQLite (`modernc.org/sqlite`), Gorilla WebSocket
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide
- **Inbound mail**: [mailer-go](https://mailer.lukaulcar.com/)
- **Hosting**: Cloudflare Pages for the frontend (`wrangler.jsonc`), or direct single-binary serving from the Go backend

---

## Getting Started

### Prerequisites

- Go 1.26+
- Node.js 20.19+ (or 22.12+)
- An API key from [mailer.lukaulcar.com](https://mailer.lukaulcar.com/) and a domain with catch-all configured

### 1. Clone the repo

```bash
git clone https://github.com/lukaulcar/tmail.git
cd tmail
```

### 2. Configure environment

Copy the example env file:

```bash
cp backend/.env.example backend/.env
```

Fill in your configuration:

```env
PORT=8080
ENV=development
DOMAIN=yourdomain.com
MAILER_API_KEY=mg_live_xxxxxxxxxxxx
MAILER_API_URL=https://api.mailer.lukaulcar.com
DB_PATH=tmail.db
MAIL_TTL_HOURS=24
MAILBOX_TTL_HOURS=24
MAILBOX_COOLDOWN_MINUTES=15
```

### 3. Run the backend

```bash
cd backend
go run .
```

The API starts on `http://localhost:8080`.

### 4. Run the frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. In dev mode, the frontend automatically points to `http://localhost:8080`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port the backend listens on |
| `ENV` | `development` | `development` or `production` |
| `DOMAIN` | `yourdomain.com` | Domain name used for generated addresses |
| `MAILER_API_KEY` | *(required)* | API key from [mailer-go](https://mailer.lukaulcar.com/) |
| `MAILER_API_URL` | `https://api.mailer.lukaulcar.com` | mailer-go API base URL |
| `DB_PATH` | `tmail.db` | SQLite database file location |
| `MAIL_TTL_HOURS` | `24` | How long emails stay before being purged |
| `MAILBOX_TTL_HOURS` | `24` | How long an inactive mailbox stays valid |
| `MAILBOX_COOLDOWN_MINUTES` | `15` | Delay before an expired mailbox name can be claimed again |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `""` | Backend API URL. Leave empty to use auto-detection (localhost:8080 in dev, current host in prod) |

---

## API Endpoints

All mailbox endpoints use the `X-Mailbox-Token` header for authentication.

- `GET /api/health` - Health check
- `POST /api/mailbox` - Create a new mailbox or claim a custom one (`?address=name@domain.com`)
- `POST /api/mailbox/refresh` - Refresh/extend mailbox expiration
- `GET /api/mailbox/messages` - Get all messages for the mailbox
- `GET /api/mailbox/messages/:id` - Get full message (including HTML body)
- `DELETE /api/mailbox/messages/:id` - Delete a single message
- `GET /api/ws?token=...` - WebSocket connection for real-time incoming mail alerts

---

## Deployment

### Option 1: Cloudflare Pages + Go VPS / Container

Build the frontend:
```bash
cd frontend
npm run build
npx wrangler pages deploy dist
```
Run the Go backend on your VPS or Docker container, setting `VITE_API_URL` to your backend domain.

### Option 2: Single Binary (Go serves the frontend)

Build the frontend first:
```bash
cd frontend && npm run build && cd ..
```
Then build and run the Go backend:
```bash
cd backend
go build -o ../tmail .
cd ..
./tmail
```
If `frontend/dist` exists, the Go server automatically serves it as a single-page app on `http://localhost:8080`.

---

## License

[MIT](LICENSE)
