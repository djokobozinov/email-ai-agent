"use client";

import { useEffect, useState } from "react";

interface FeatureReadiness {
  enabled: boolean;
  missing: string[];
}

interface AccountStatus {
  configured: boolean;
  features?: {
    emailSummaries: FeatureReadiness;
    telegramAssistant: FeatureReadiness;
    notionNotes: FeatureReadiness;
    telegramTest: FeatureReadiness;
    telegramWebhookSetup: FeatureReadiness;
  };
  missing?: string[];
}

const ENV_VARS_REFERENCE: { name: string; description: string; feature: string }[] = [
  { name: "GOOGLE_CLIENT_ID", description: "OAuth client from Google Cloud Console", feature: "Email summaries" },
  { name: "GOOGLE_CLIENT_SECRET", description: "OAuth secret from Google Cloud Console", feature: "Email summaries" },
  { name: "GOOGLE_REFRESH_TOKEN", description: "One per Gmail account (use Setup Gmail)", feature: "Email summaries" },
  { name: "OPENAI_API_KEY", description: "API key from platform.openai.com", feature: "Summaries & Assistant" },
  { name: "OPENAI_MODEL", description: "Optional; default gpt-5-nano", feature: "AI" },
  { name: "TELEGRAM_BOT_TOKEN", description: "Create via @BotFather on Telegram", feature: "Telegram" },
  { name: "TELEGRAM_CHAT_ID", description: "Get from @userinfobot on Telegram", feature: "Telegram" },
  { name: "NOTION_API_KEY", description: "Notion integration secret", feature: "Notion notes" },
  { name: "NOTION_NOTES_PAGE_ID", description: "Target page ID or URL", feature: "Notion notes" },
  { name: "APP_URL", description: "e.g. https://yourdomain.com", feature: "Webhook & OAuth" },
  { name: "TEST_PASSWORD", description: "Password for utility pages", feature: "Setup pages" },
  { name: "MAX_EMAILS_PER_RUN", description: "Optional; default 5", feature: "Email summaries" },
  { name: "LABEL_FILTER", description: "Optional; e.g. IMPORTANT", feature: "Email summaries" },
  { name: "TELEGRAM_WEBHOOK_SECRET", description: "Optional header secret for webhook", feature: "Webhook" },
  { name: "CRON_SECRET", description: "Optional bearer token for cron", feature: "Scheduling" },
];

const features = [
  {
    title: "Gmail Integration",
    description:
      "Connect up to 5 Gmail accounts via OAuth2. Reads new emails automatically with read-only access — your inbox stays safe.",
    icon: "📧",
    gradient: "from-red-500 to-orange-500",
  },
  {
    title: "AI Summaries",
    description:
      "Each email is summarized by OpenAI into a concise title and 2–3 bullet points. No more reading walls of text.",
    icon: "✨",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    title: "Telegram Delivery",
    description:
      "Summaries are instantly sent to your Telegram chat. Social emails get a 👥 prefix, promotions get 🏷️.",
    icon: "📤",
    gradient: "from-sky-400 to-blue-500",
  },
  {
    title: "AI Chat Assistant",
    description:
      "Send any message to your Telegram bot and get intelligent AI-powered replies back instantly via OpenAI.",
    icon: "💬",
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    title: "Notion Notes",
    description:
      "Prefix any Telegram message with * to save as a note, or `*<name>`, to save to a subpage in Notes with that name.",
    icon: "📝",
    gradient: "from-amber-400 to-yellow-500",
  },
  {
    title: "Smart Scheduling",
    description:
      "Cron-based automation checks your inboxes every 30 minutes. Deploy on Vercel or use any external cron service.",
    icon: "⏰",
    gradient: "from-pink-500 to-rose-500",
  },
];

const howItWorks = [
  {
    icon: "📧",
    title: "Gmail Integration",
    description:
      "The agent connects to up to 5 Gmail accounts via OAuth2. It reads unread messages from inbox, social, and promotions — spam is automatically skipped. Access is read-only, so nothing is modified in your inbox.",
    example: (
      <>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Example:</span> You receive 12 new emails. The agent scans all connected accounts, skips spam, and processes the 8 relevant unread messages.
      </>
    ),
  },
  {
    icon: "✨",
    title: "AI Summaries",
    description:
      "Each email is sent to OpenAI, which returns a short title and 2–3 bullet points. You get the gist without opening the email.",
    example: (
      <>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Example:</span> A long newsletter becomes: <strong>{"\"Q4 Product Launch Recap\""}</strong> — Key features shipped · Beta feedback summary · Next steps.
      </>
    ),
  },
  {
    icon: "📤",
    title: "Telegram Delivery",
    description:
      "Summaries are sent to your Telegram chat. Social emails get a 👥 prefix, promotions get 🏷️, so you can skim by category at a glance.",
    example: (
      <>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Example:</span> You receive: <strong>{"\"🏷️ 20% off Site-Wide — Summer sale ends Sunday · Free shipping over $50.\""}</strong>
      </>
    ),
  },
  {
    icon: "💬",
    title: "AI Chat Assistant",
    description:
      "Send any message to your bot. It's forwarded to OpenAI, and the reply comes back to you in Telegram. Use it for questions, drafting, or brainstorming.",
    example: (
      <>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Example:</span> You: {"\"Draft a 2-line reply declining the meeting.\""} Bot: {"\"Thank you for the invite. I won't be able to attend — please proceed without me and share notes if possible.\""}
      </>
    ),
  },
  {
    icon: "📝",
    title: "Notion Notes",
    description:
      "Messages that start with * (asterisk) are saved as notes in your Notion page instead of being sent to the AI. Use `*<name>`, to save to a subpage in Notes with that given name — great for organizing notes by category.",
    example: (
      <>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Example 1:</span>{" "}
        <strong>{"*Call back John re: project scope by Friday"}</strong> → appended to the main Notes page.
        <br />
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Example 2:</span>{" "}
        <strong>{"*Work, Review Q1 roadmap by EOD"}</strong> → saved to a subpage named {"\"Work\""} under Notes.
      </>
    ),
  },
  {
    icon: "⏰",
    title: "Smart Scheduling",
    description:
      "A cron job runs every 30 minutes (or on your schedule). It triggers the email check and processing. Works with Vercel Cron or any external cron service.",
    example: (
      <>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Example:</span> At 9:00, 9:30, 10:00… the agent checks for new mail, summarizes it, and sends to Telegram — no manual refresh needed.
      </>
    ),
  },
];

export default function Home() {
  const [status, setStatus] = useState<AccountStatus | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false }));
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans dark:bg-zinc-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-200/60 via-sky-200/40 to-pink-200/60 blur-3xl dark:from-violet-900/20 dark:via-sky-900/10 dark:to-pink-900/20" />
        </div>

        <div className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center sm:pt-28 sm:pb-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            AI-Powered Email Agent
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-white">
            Gmail Summaries, Telegram Assistant &{" "}
            <span className="bg-gradient-to-r from-violet-600 to-sky-500 bg-clip-text text-transparent dark:from-violet-400 dark:to-sky-400">
              Notion Notes
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            An automated agent that reads your Gmail, summarizes emails with AI,
            delivers them to Telegram, answers your messages with an AI
            assistant, and saves your notes to Notion — all on autopilot.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#setup"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 hover:shadow-xl hover:-translate-y-0.5 dark:bg-white dark:text-zinc-900 dark:shadow-white/10 dark:hover:bg-zinc-100"
            >
              Get Started →
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:-translate-y-0.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Explore Features
            </a>
            <a
              href="https://github.com/djokobozinov/email-ai-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:-translate-y-0.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              ⭐ Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Everything You Need
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500 dark:text-zinc-400">
            A complete pipeline from your inbox to actionable summaries,
            intelligent replies, and organized notes.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-zinc-100 bg-white p-6 transition-all duration-300 hover:border-zinc-200 hover:shadow-lg hover:shadow-zinc-100 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:shadow-zinc-900"
            >
              <div className="mb-4 text-2xl">
                {f.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {f.description}
              </p>
              <div
                className={`absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r ${f.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-500 dark:text-zinc-400">
              Every feature explained with real examples — fully automated once configured.
            </p>
          </div>

          <div className="space-y-8">
            {howItWorks.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-zinc-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {item.description}
                    </p>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {item.example}
                    </p>
                    {item.title === "Notion Notes" && (
                      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                        Uses <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">*</code> prefix; <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">*&lt;name&gt;</code> saves to a subpage with that name. Other messages go to the AI assistant.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filtering & Smart Features */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <div className="rounded-3xl border border-zinc-100 bg-gradient-to-br from-zinc-50 to-white p-8 sm:p-12 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
                Smart Filtering
              </h2>
              <p className="mt-4 text-zinc-500 dark:text-zinc-400">
                Intelligent email processing so you only see what matters.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Processes unread inbox, social, and promotions",
                  "Automatically skips spam",
                  "Skips very short emails (< 5 chars)",
                  "Social emails show 👥 prefix",
                  "Promotions show 🏷️ prefix",
                  "Optional IMPORTANT label filter",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="text-emerald-500">✅</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
                Security & Control
              </h2>
              <p className="mt-4 text-zinc-500 dark:text-zinc-400">
                Built with safety and privacy in mind.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Read-only Gmail access",
                  "Password-protected utility pages",
                  "Webhook secret validation",
                  "Configurable rate limits (MAX_EMAILS_PER_RUN)",
                  "Up to 5 Gmail accounts with one OAuth client",
                  "No database — all config via environment variables",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="text-violet-500">🔒</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Setup / Status */}
      <section id="setup" className="mx-auto max-w-5xl px-6 pb-16 sm:pb-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Setup & Status
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500 dark:text-zinc-400">
            Connect your accounts and manage your agent.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Account Status Card */}
          <div className="flex min-h-[248px] flex-col rounded-2xl border border-zinc-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xl dark:bg-zinc-800">
                📧
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Account Status
              </h3>
            </div>
            {status === null && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400" />
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  Checking configuration...
                </p>
              </div>
            )}
            {status?.configured && (
              <div className="flex flex-1 flex-col gap-4">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Configured & Active
                </div>
                {status.features && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Enabled features:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        ["emailSummaries", "Email summaries"],
                        ["telegramAssistant", "AI Assistant"],
                        ["notionNotes", "Notion Notes"],
                        ["telegramTest", "Telegram Test"],
                        ["telegramWebhookSetup", "Webhook Setup"],
                      ]
                        .filter(([key]) => status.features?.[key as keyof typeof status.features]?.enabled)
                        .map(([_, label]) => (
                          <span
                            key={label}
                            className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          >
                            {label}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                <p className="flex-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Your agent is running. To disconnect, remove the relevant{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium dark:bg-zinc-800">
                    GOOGLE_REFRESH_TOKEN
                  </code>{" "}
                  from your environment and restart.
                </p>
              </div>
            )}
            {status && !status.configured && (
              <div className="flex flex-1 flex-col gap-4">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Not Configured
                </div>
                {(() => {
                  const missing = status.features
                    ? [
                        ...(status.features.emailSummaries?.missing ?? []),
                        ...(status.features.telegramAssistant?.missing ?? []),
                        ...(status.features.notionNotes?.missing ?? []),
                        ...(status.features.telegramTest?.missing ?? []),
                        ...(status.features.telegramWebhookSetup?.missing ?? []),
                      ]
                    : status.missing ?? [];
                  const uniqueMissing = [...new Set(missing)];
                  return (
                    uniqueMissing.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Missing variables:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {uniqueMissing.map((m) => (
                            <code
                              key={m}
                              className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium dark:bg-zinc-800"
                            >
                              {m}
                            </code>
                          ))}
                        </div>
                      </div>
                    )
                  );
                })()}
                <a
                  href="/api/auth/gmail?action=init"
                  className="mt-auto inline-flex w-fit items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  → Setup Gmail
                </a>
              </div>
            )}
          </div>

          {/* Quick Links Card */}
          <div className="flex min-h-[248px] flex-col rounded-2xl border border-zinc-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xl dark:bg-zinc-800">
                ⚡
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Quick Actions
              </h3>
            </div>
            <div className="space-y-2">
              {[
                {
                  href: "/telegram-webhook",
                  label: "Set Telegram Webhook",
                  desc: "Configure webhook for receiving Telegram messages",
                  icon: "🔗",
                },
                {
                  href: "/telegram-test",
                  label: "Telegram Test",
                  desc: "Send a test message to verify your bot setup",
                  icon: "📨",
                },
                {
                  href: "/check-mail",
                  label: "Check Mail Now",
                  desc: "Manually trigger email processing",
                  icon: "📬",
                },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center text-lg">
                    {link.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {link.label}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {link.desc}
                    </p>
                  </div>
                  <span className="ml-auto text-zinc-400 dark:text-zinc-500">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Environment Variables Reference */}
        <details className="group mt-8 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-left font-semibold text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800/50 sm:rounded-t-2xl">
            Environment variables
            <span className="text-zinc-400 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Set these in <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">.env.local</code> or your deployment env. Copy from <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">.env.example</code>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ENV_VARS_REFERENCE.map((v) => (
                <div
                  key={v.name}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <code className="block text-sm font-medium text-zinc-900 dark:text-white">
                    {v.name}
                  </code>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {v.description}
                  </p>
                  <span className="mt-1.5 inline-block text-xs text-zinc-400 dark:text-zinc-500">
                    {v.feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </details>
      </section>

      {/* GitHub Star CTA */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <a
          href="https://github.com/djokobozinov/email-ai-agent"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-8 text-center transition-all hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950 dark:hover:border-amber-500"
        >
          <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
            If you find this useful, please add a star on GitHub!
          </p>
          <span className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all group-hover:scale-105 group-hover:bg-amber-500 dark:bg-white dark:text-zinc-900 dark:group-hover:bg-amber-400">
            ⭐ Star on GitHub
          </span>
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Email AI Agent &middot; MIT License
          </p>
          <a
            href="https://github.com/djokobozinov/email-ai-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-amber-500 dark:text-zinc-400 dark:hover:text-amber-400"
          >
            GitHub →
          </a>
        </div>
      </footer>
    </div>
  );
}
