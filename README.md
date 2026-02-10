# Email → Summary → Telegram

Automated agent that reads new Gmail, summarizes each via OpenAI, and sends to Telegram. Minimal web UI for setup only. All configuration via environment variables; no database.

## Features

- Gmail API (OAuth2, read-only)
- OpenAI summarization (1 title + 2–3 bullets per email)
- Telegram delivery
- Cron-based scheduling (e.g. every 6 hours)
- Minimal mobile-friendly UI for Gmail setup

## Setup

### 1. Google Cloud (Gmail API)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Gmail API**
3. Configure OAuth consent screen (External, add your email as test user)
4. Create OAuth 2.0 credentials (Desktop app or Web application)
5. Add redirect URI: `https://your-domain.com/api/auth/gmail` (or `http://localhost:3000/api/auth/gmail` for local dev)

### 2. Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) to create a bot; copy the token
2. Message [@userinfobot](https://t.me/userinfobot) to get your chat ID

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | From Google Cloud OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud OAuth credentials |
| `GOOGLE_REFRESH_TOKEN` | From one-time OAuth flow (see below) |
| `APP_URL` | Full URL of your app (e.g. `https://your-domain.com`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `TELEGRAM_BOT_TOKEN` | From BotFather |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |
| `CRON_SECRET` | Min 16 chars; used to protect the cron endpoint |

Optional: `MAX_EMAILS_PER_RUN` (default 5), `LABEL_FILTER` (e.g. `IMPORTANT`)

### 4. Get Gmail Refresh Token

1. Run the app: `npm run dev`
2. Open the UI and click **Setup Gmail**
3. Complete the Google OAuth flow
4. Copy the displayed refresh token into `.env` as `GOOGLE_REFRESH_TOKEN`
5. Restart the app

### 5. Disconnect

To remove Gmail access, delete `GOOGLE_REFRESH_TOKEN` from your environment and restart.

## Running

```bash
npm install
npm run dev    # Development
npm run build && npm start   # Production
```

## Scheduling

**Vercel Cron**: Deploy to Vercel; cron runs every 6 hours. Set `CRON_SECRET` in Vercel env.

**External cron**: Call `GET /api/cron/process` with header:
```
Authorization: Bearer YOUR_CRON_SECRET
```

Example (system cron, every 6 hours):
```bash
0 */6 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/process
```

## Filtering

- Processes unread inbox only
- Skips: spam, promotions, social
- Skips very short emails (< 50 chars)
- Optional: set `LABEL_FILTER=IMPORTANT` to process only important label

## License

MIT
