# Optional Gmail Summaries + Telegram Assistant + Notion Notes

Automated agent that can read new Gmail, summarize messages with OpenAI, send summaries to Telegram, reply to Telegram messages with an AI assistant, and save `*`-prefixed Telegram notes to Notion. Minimal web UI for setup only. All features are optional and independently enabled via environment variables; no database.

## Features

- Optional email summaries (Gmail API + OpenAI + Telegram destination chat)
- Optional Telegram assistant replies (Telegram webhook + OpenAI)
- Optional Telegram notes to Notion (messages starting with `*`, with optional subpages)
- Up to 5 Gmail accounts (same client ID/secret)
- Password-protected utility pages (set webhook, Telegram test, manual check-mail)
- Cron-based scheduling (every 30 minutes)
- Minimal mobile-friendly UI for setup/status

## Feature Optionality

There are **no globally required env vars**. Each feature enables itself only when its own required variables are present.

- **Email summaries (Gmail → OpenAI → Telegram chat)** require:
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, at least one of `GOOGLE_REFRESH_TOKEN`..`GOOGLE_REFRESH_TOKEN_5`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- **Telegram assistant replies** require:
  `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`
- **Telegram `*` notes to Notion** require:
  `TELEGRAM_BOT_TOKEN`, `NOTION_API_KEY`, `NOTION_NOTES_PAGE_ID`
- **Utility pages**:
  - `/telegram-test`: `TEST_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  - `/telegram-webhook`: `TEST_PASSWORD`, `APP_URL`, `TELEGRAM_BOT_TOKEN`
  - `/check-mail`: `TEST_PASSWORD` (plus email-summary vars if you want it to process mail)

## Setup

### 1. Google Cloud (Optional: only for email summaries)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Gmail API**
3. Configure OAuth consent screen (External, add your email as test user)
4. Create OAuth 2.0 credentials (Desktop app or Web application)
5. Add redirect URI: `https://your-domain.com/api/auth/gmail` (or `http://localhost:3000/api/auth/gmail` for local dev)

### 2. Telegram Bot (Optional: needed for Telegram features)

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
3. Create or choose a Notion page to hold notes (this is the root Notes page)
4. Share that page with your integration (so it has write access)
5. Put the page ID or page URL into `NOTION_NOTES_PAGE_ID`
6. Optional subpages are auto-managed by the bot:
   - `*<name>, <note>` saves into subpage `<name>` under your root Notes page
   - If subpage `<name>` does not exist yet, it is created automatically

### 3. Environment Variables

Copy `.env.example` to `.env` and set only what you need:

| Variable | Used by |
|----------|---------|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Gmail OAuth + email summaries |
| `GOOGLE_REFRESH_TOKEN`..`GOOGLE_REFRESH_TOKEN_5` | Gmail accounts for email summaries |
| `OPENAI_API_KEY` | Email summaries + Telegram assistant |
| `OPENAI_MODEL` | Optional model override (default `gpt-5-nano`) |
| `TELEGRAM_BOT_TOKEN` | Telegram assistant, email delivery, webhook setup, Telegram test |
| `TELEGRAM_CHAT_ID` | Email delivery destination + `/telegram-test` |
| `NOTION_API_KEY`, `NOTION_NOTES_PAGE_ID` | Telegram `*` notes to Notion |
| `APP_URL` | Gmail OAuth redirect + webhook setup utility page |
| `TEST_PASSWORD` | Password for `/telegram-webhook`, `/telegram-test`, `/check-mail` |
| `CRON_SECRET` | Optional bearer auth for external cron callers |
| `TELEGRAM_WEBHOOK_SECRET` | Optional Telegram webhook header validation |
| `MAX_EMAILS_PER_RUN`, `LABEL_FILTER` | Optional email-processing behavior |

### Telegram Assistant Behavior

- When you send a text message to your bot, Telegram calls `/api/telegram/webhook`.
- If the text starts with `*`, it is treated as a note and saved to Notion instead of sending to OpenAI.
- `*note text` appends to the root page configured by `NOTION_NOTES_PAGE_ID`.
- `*<name>, <note text>` appends to Notion subpage `<name>` under the root page (auto-creates the subpage when missing).
- Otherwise, the app sends the text to OpenAI (default model: `gpt-5-nano`).
- The app sends a confirmation/reply back to the same Telegram chat.

### 4. Get Gmail Refresh Tokens (Optional)

Use the same Google OAuth client for all accounts. Each account gets its own refresh token.

1. Run the app: `npm run dev`
2. Open the UI and click **Setup Gmail** (or go to `/api/auth/gmail?action=init`)
3. Complete the Google OAuth flow for the first account
4. Copy the displayed refresh token into `.env` as `GOOGLE_REFRESH_TOKEN`
5. For more accounts, go to `/api/auth/gmail?action=init&account=2` (or 3, 4, 5)
6. Add each token as `GOOGLE_REFRESH_TOKEN_2`, `GOOGLE_REFRESH_TOKEN_3`, etc.
7. Restart the app

### 5. Disconnect Gmail (Optional)

To remove a Gmail account, delete its `GOOGLE_REFRESH_TOKEN` (or `GOOGLE_REFRESH_TOKEN_N`) from your environment and restart.

## Running

```bash
npm install
npm run dev    # Development
npm run build && npm start   # Production
```

## Scheduling

**Vercel Cron**: Deploy to Vercel; cron runs every 30 minutes. Set `CRON_SECRET` in Vercel env if you also call this endpoint outside Vercel.

**External cron**: Call `GET /api/cron/process` with header:
```
Authorization: Bearer YOUR_CRON_SECRET
```

Example (system cron, every 30 minutes):
```bash
*/30 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/process
```

If email summaries are not configured, `/api/cron/process` returns `processed: 0` with a `skipped` reason (no error).

## Filtering

- Processes unread inbox, social, and promotions
- Skips: spam only
- Skips very short emails (< 5 chars)
- Social emails show 👥 prefix; promotions show 🏷️ prefix
- Optional: set `LABEL_FILTER=IMPORTANT` to process only important label

## License

MIT
