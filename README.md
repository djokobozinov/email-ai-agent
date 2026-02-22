# Gmail → AI Summaries + Telegram Assistant + Notion Notes

Automated agent that reads new Gmail, summarizes each via OpenAI, sends summaries to Telegram, replies to Telegram messages with an AI assistant, and saves `*`-prefixed Telegram notes to Notion. Minimal web UI for setup only. All configuration via environment variables; no database.

## Features

- Gmail API (OAuth2, read-only)
- Up to 5 Gmail accounts (same client ID/secret)
- OpenAI summarization (1 title + 2–3 bullets per email)
- Telegram delivery
- Telegram bot replies (incoming message -> OpenAI -> Telegram response)
- Telegram notes to Notion (messages starting with `*`)
- Password-protected utility pages (set webhook, Telegram test, manual check-mail)
- Cron-based scheduling (every 30 minutes)
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
3. Set `TEST_PASSWORD` in your environment (used by protected utility pages)
4. Optional (recommended): set `TELEGRAM_WEBHOOK_SECRET`
5. Open `/telegram-webhook`, enter password, and submit. The app will call Telegram `setWebhook` automatically using:
   - `url = <APP_URL>/api/telegram/webhook`
   - `secret_token = <TELEGRAM_WEBHOOK_SECRET>` (only when configured)
6. Optional fallback: set webhook manually with curl:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -d "url=https://your-domain.com/api/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```

### 2.5 Notion Notes (Optional)

If you want Telegram messages that start with `*` to be stored as notes:

1. Create a Notion integration in **Settings & members → Integrations**
2. Copy the integration secret into `NOTION_API_KEY`
3. Create or choose a Notion page to hold notes
4. Share that page with your integration (so it has write access)
5. Put the page ID or page URL into `NOTION_NOTES_PAGE_ID`

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | From Google Cloud OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud OAuth credentials |
| `GOOGLE_REFRESH_TOKEN` | Account 1 – from OAuth flow (see below) |
| `GOOGLE_REFRESH_TOKEN_2` | Account 2 (optional) |
| `GOOGLE_REFRESH_TOKEN_3` | Account 3 (optional) |
| `GOOGLE_REFRESH_TOKEN_4` | Account 4 (optional) |
| `GOOGLE_REFRESH_TOKEN_5` | Account 5 (optional) |
| `APP_URL` | Full URL of your app (e.g. `https://your-domain.com`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Optional; defaults to `gpt-5-nano` (latest low-cost model) |
| `TELEGRAM_BOT_TOKEN` | From BotFather |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |
| `CRON_SECRET` | Min 16 chars; used to protect the cron endpoint |
| `TEST_PASSWORD` | Password for `/telegram-webhook`, `/telegram-test`, and `/check-mail` |
| `TELEGRAM_WEBHOOK_SECRET` | Optional secret header validation for Telegram webhook |
| `NOTION_API_KEY` | Optional; Notion integration secret for Telegram notes |
| `NOTION_NOTES_PAGE_ID` | Optional; Notion page ID (or page URL) where `*` notes are appended |

Optional: `MAX_EMAILS_PER_RUN` (default 5), `LABEL_FILTER` (e.g. `IMPORTANT`), `TELEGRAM_WEBHOOK_SECRET`, `NOTION_API_KEY`, `NOTION_NOTES_PAGE_ID`

### Telegram Assistant Behavior

- When you send a text message to your bot, Telegram calls `/api/telegram/webhook`.
- If the text starts with `*`, it is treated as a note and saved to Notion instead of sending to OpenAI.
- Otherwise, the app sends the text to OpenAI (default model: `gpt-5-nano`).
- The app sends a confirmation/reply back to the same Telegram chat.

### 4. Get Gmail Refresh Tokens

Use the same Google OAuth client for all accounts. Each account gets its own refresh token.

1. Run the app: `npm run dev`
2. Open the UI and click **Setup Gmail** (or go to `/api/auth/gmail?action=init`)
3. Complete the Google OAuth flow for the first account
4. Copy the displayed refresh token into `.env` as `GOOGLE_REFRESH_TOKEN`
5. For more accounts, go to `/api/auth/gmail?action=init&account=2` (or 3, 4, 5)
6. Add each token as `GOOGLE_REFRESH_TOKEN_2`, `GOOGLE_REFRESH_TOKEN_3`, etc.
7. Restart the app

### 5. Disconnect

To remove a Gmail account, delete its `GOOGLE_REFRESH_TOKEN` (or `GOOGLE_REFRESH_TOKEN_N`) from your environment and restart.

## Running

```bash
npm install
npm run dev    # Development
npm run build && npm start   # Production
```

## Scheduling

**Vercel Cron**: Deploy to Vercel; cron runs every 30 minutes. Set `CRON_SECRET` in Vercel env.

**External cron**: Call `GET /api/cron/process` with header:
```
Authorization: Bearer YOUR_CRON_SECRET
```

Example (system cron, every 30 minutes):
```bash
*/30 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/process
```

## Filtering

- Processes unread inbox, social, and promotions
- Skips: spam only
- Skips very short emails (< 5 chars)
- Social emails show 👥 prefix; promotions show 🏷️ prefix
- Optional: set `LABEL_FILTER=IMPORTANT` to process only important label

## License

MIT
