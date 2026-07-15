# gjoko-ai-agent

A self-hosted personal AI agent for small, useful automations across everyday tools. It can chat with you through Telegram, summarize Gmail, capture quick notes into Notion, send local weather clothing advice, and expose password-protected setup utilities. Each capability is optional and enabled independently with environment variables; there is no database.

## Features

- **Telegram AI assistant**: message the bot and get OpenAI-powered replies in the same Telegram chat.
- **Notion note capture**: save `*`-prefixed Telegram messages to a Notion notes page, including automatic subpages with `*<name>, <note>`.
- **Reply-to-note capture**: reply to any Telegram message with `*` to save the replied message text into Notion.
- **Gmail summaries**: connect up to 5 Gmail accounts with read-only OAuth and summarize unread messages with OpenAI.
- **Receipt capture**: detect receipts/invoices in Gmail and save structured details plus a direct email link to the `Invoices` Notion subpage.
- **Telegram delivery**: receive Gmail summaries in Telegram, including category prefixes for social and promotions.
- **Daily weather report**: get 07:30 and 20:30 Europe/Ljubljana Vransko forecasts with practical clothing advice for adults and kids.
- **Daily calendar report**: get a 20:00 Europe/Ljubljana Telegram message with tomorrow's Google Calendar events, holidays, and birthdays.
- **Calendar event creation**: send Telegram messages like `add event Dentist on 2026-05-21 at 14:30` to create a Google Calendar event.
- **Cron automation**: run scheduled work every 30 minutes through Vercel Cron or any external cron caller.
- **Manual utilities**: password-protected pages for setting the Telegram webhook, testing Telegram delivery, and manually checking mail.
- **Feature readiness checks**: setup/status UI shows which optional modules are enabled and which env vars are missing.
- **Email filtering controls**: limit processed mail with `MAX_EMAILS_PER_RUN`, `LABEL_FILTER`, `EXCLUDE_CATEGORIES`, `EMAIL_SUMMARY_ALLOWED_SENDERS`, and `EMAIL_SUMMARY_IGNORED_SENDERS`.
- **Webhook security**: optional Telegram webhook secret validation.
- **No database**: configuration is env-var driven, keeping the deployment simple and portable.

## Feature Optionality

There are **no globally required env vars**. Each feature enables itself only when its own required variables are present.

- **Telegram assistant replies** require:
  `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`
- **Telegram `*` notes to Notion** require:
  `TELEGRAM_BOT_TOKEN`, `NOTION_API_KEY`, `NOTION_NOTES_PAGE_ID`
- **Email summaries (Gmail → OpenAI → Telegram chat)** require:
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, at least one of `GOOGLE_REFRESH_TOKEN`..`GOOGLE_REFRESH_TOKEN_5`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- **Receipt capture (Gmail → Notion Invoices)** requires:
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, at least one Google refresh token, `OPENAI_API_KEY`, `NOTION_API_KEY`, `NOTION_NOTES_PAGE_ID`
- **Daily Vransko weather report** requires:
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- **Daily calendar report** requires:
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, at least one of `GOOGLE_REFRESH_TOKEN`..`GOOGLE_REFRESH_TOKEN_5`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- **Utility pages**:
  - `/telegram-test`: `TEST_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  - `/telegram-webhook`: `TEST_PASSWORD`, `APP_URL`, `TELEGRAM_BOT_TOKEN`
  - `/check-mail`: `TEST_PASSWORD` (plus email-summary vars if you want it to process mail)

## Setup

### 1. Telegram Bot (Optional: needed for Telegram features)

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

### 2. Notion Notes (Optional)

If you want Telegram messages that start with `*` to be stored as notes:

1. Create a Notion integration in **Settings & members -> Integrations**
2. Copy the integration secret into `NOTION_API_KEY`
3. Create or choose a Notion page to hold notes (this is the root Notes page)
4. Share that page with your integration (so it has write access)
5. Put the page ID or page URL into `NOTION_NOTES_PAGE_ID`
6. Optional subpages are auto-managed by the bot:
   - `*<name>, <note>` saves into subpage `<name>` under your root Notes page
   - If subpage `<name>` does not exist yet, it is created automatically

### 3. Google Cloud (Optional: for Gmail summaries and calendar reports)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Gmail API** and **Google Calendar API**
3. Configure OAuth consent screen (External, add your email as test user)
4. Create OAuth 2.0 credentials (Desktop app or Web application)
5. Add redirect URI: `https://your-domain.com/api/auth/gmail` (or `http://localhost:3000/api/auth/gmail` for local dev)

### 4. Environment Variables

Copy `.env.example` to `.env` and set only what you need:

| Variable | Used by |
|----------|---------|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Gmail OAuth + email summaries |
| `GOOGLE_REFRESH_TOKEN`..`GOOGLE_REFRESH_TOKEN_5` | Google accounts for email summaries and calendar reports |
| `GOOGLE_CALENDAR_IDS` | Optional extra Google Calendar IDs, comma-separated |
| `GOOGLE_HOLIDAY_CALENDAR_ID` | Optional holiday calendar ID; defaults to Slovenian holidays |
| `GOOGLE_BIRTHDAY_CALENDAR_ID` | Optional birthday calendar ID; defaults to Google birthdays |
| `OPENAI_API_KEY` | Email summaries + Telegram assistant |
| `OPENAI_MODEL` | Optional model override (default `gpt-5-nano`) |
| `TELEGRAM_BOT_TOKEN` | Telegram assistant, email delivery, webhook setup, Telegram test |
| `TELEGRAM_CHAT_ID` | Email delivery destination + `/telegram-test` |
| `NOTION_API_KEY`, `NOTION_NOTES_PAGE_ID` | Telegram `*` notes to Notion |
| `APP_URL` | Gmail OAuth redirect + webhook setup utility page |
| `TEST_PASSWORD` | Password for `/telegram-webhook`, `/telegram-test`, `/check-mail` |
| `CRON_SECRET` | Optional bearer auth for external cron callers |
| `TELEGRAM_WEBHOOK_SECRET` | Optional Telegram webhook header validation |
| `MAX_EMAILS_PER_RUN`, `LABEL_FILTER`, `EXCLUDE_CATEGORIES`, `EMAIL_SUMMARY_ALLOWED_SENDERS`, `EMAIL_SUMMARY_IGNORED_SENDERS` | Optional email-processing behavior |

The daily weather report uses Open-Meteo and needs no weather API key. It sends today's Vransko forecast at 07:30, tomorrow's forecast at 20:30, and short clothing advice for adults and kids.

The daily calendar report reads your primary Google Calendar plus optional extra calendars, the configured holiday calendar, and the configured birthday calendar. It sends tomorrow's events, holidays, and birthdays to Telegram at 20:00 Europe/Ljubljana. The Telegram assistant can create one-hour events on your primary calendar when your message includes an add/create/schedule intent plus a title, date, and time.

### Telegram Assistant Behavior

- When you send a text message to your bot, Telegram calls `/api/telegram/webhook`.
- If the text starts with `*`, it is treated as a note and saved to Notion instead of sending to OpenAI.
- `*note text` appends to the root page configured by `NOTION_NOTES_PAGE_ID`.
- `*<name>, <note text>` appends to Notion subpage `<name>` under the root page (auto-creates the subpage when missing).
- `*` as a reply to another Telegram message saves the replied message text as the note.
- Otherwise, the app sends the text to OpenAI (default model: `gpt-5-nano`).
- The app sends a confirmation/reply back to the same Telegram chat.

### 5. Get Google Refresh Tokens (Optional)

Use the same Google OAuth client for all accounts. Each account gets its own refresh token.

1. Run the app: `npm run dev`
2. Open the UI and click **Setup Gmail** (or go to `/api/auth/gmail?action=init`)
3. Complete the Google OAuth flow for the first account
4. Copy the displayed refresh token into `.env` as `GOOGLE_REFRESH_TOKEN`
5. For more accounts, go to `/api/auth/gmail?action=init&account=2` (or 3, 4, 5)
6. Add each token as `GOOGLE_REFRESH_TOKEN_2`, `GOOGLE_REFRESH_TOKEN_3`, etc.
7. Restart the app

Existing refresh tokens created before the calendar feature only have Gmail scope. Run setup again and replace the refresh token so Google grants Calendar read-only access too.
Existing refresh tokens created before event creation also need setup again so Google grants Calendar event write access.

### Receipt Capture Setup

Receipt capture uses the existing Notion notes integration. When a receipt is detected, the agent appends its extracted details and Gmail link to an `Invoices` child page under `NOTION_NOTES_PAGE_ID`. If that child page does not exist yet, the existing Notion implementation creates it automatically.

### 6. Disconnect Gmail (Optional)

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
- Optional: set `EXCLUDE_CATEGORIES=promotions` to skip promotions; use `promotions,social` for both
- Optional: set `EMAIL_SUMMARY_ALLOWED_SENDERS=person@example.com,other@example.com` to summarize only those senders; leave empty to summarize all senders
- Optional: set `EMAIL_SUMMARY_IGNORED_SENDERS=noise@example.com` to always skip those senders, even if they are also in the allow-list

## License

MIT
