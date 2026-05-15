"use client";

import { useEffect, useState } from "react";

const navLinks = [
  { href: "#setup", label: "Setup" },
  { href: "#env", label: "Env Vars" },
  {
    href: "https://github.com/djokobozinov/gjoko-ai-agent",
    label: "github →",
    external: true,
  },
];

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
    dailyWeatherReport: FeatureReadiness;
    dailyCalendarReport: FeatureReadiness;
  };
  missing?: string[];
}

const ENV_VARS_REFERENCE: {
  name: string;
  description: string;
  feature: string;
}[] = [
  {
    name: "GOOGLE_CLIENT_ID",
    description: "OAuth client from Google Cloud Console",
    feature: "Email summaries",
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    description: "OAuth secret from Google Cloud Console",
    feature: "Email summaries",
  },
  {
    name: "GOOGLE_REFRESH_TOKEN",
    description: "One per Google account (use Setup Gmail)",
    feature: "Email & calendar",
  },
  {
    name: "GOOGLE_CALENDAR_IDS",
    description: "Optional comma-separated extra calendar IDs",
    feature: "Calendar report",
  },
  {
    name: "GOOGLE_HOLIDAY_CALENDAR_ID",
    description: "Optional; defaults to Slovenian holidays",
    feature: "Calendar report",
  },
  {
    name: "GOOGLE_BIRTHDAY_CALENDAR_ID",
    description: "Optional; defaults to Google birthdays",
    feature: "Calendar report",
  },
  {
    name: "OPENAI_API_KEY",
    description: "API key from platform.openai.com",
    feature: "Summaries & Assistant",
  },
  {
    name: "OPENAI_MODEL",
    description: "Optional; default gpt-5-nano",
    feature: "AI",
  },
  {
    name: "TELEGRAM_BOT_TOKEN",
    description: "Create via @BotFather on Telegram",
    feature: "Telegram",
  },
  {
    name: "TELEGRAM_CHAT_ID",
    description: "Get from @userinfobot on Telegram",
    feature: "Telegram",
  },
  {
    name: "NOTION_API_KEY",
    description: "Notion integration secret",
    feature: "Notion notes",
  },
  {
    name: "NOTION_NOTES_PAGE_ID",
    description: "Target page ID or URL",
    feature: "Notion notes",
  },
  {
    name: "APP_URL",
    description: "e.g. https://yourdomain.com",
    feature: "Webhook & OAuth",
  },
  {
    name: "TEST_PASSWORD",
    description: "Password for utility pages",
    feature: "Setup pages",
  },
  {
    name: "MAX_EMAILS_PER_RUN",
    description: "Optional; default 5",
    feature: "Email summaries",
  },
  {
    name: "LABEL_FILTER",
    description: "Optional; e.g. IMPORTANT",
    feature: "Email summaries",
  },
  {
    name: "EXCLUDE_CATEGORIES",
    description: "Optional; e.g. promotions or promotions,social",
    feature: "Email summaries",
  },
  {
    name: "TELEGRAM_WEBHOOK_SECRET",
    description: "Optional header secret for webhook",
    feature: "Webhook",
  },
  {
    name: "CRON_SECRET",
    description: "Optional bearer token for cron",
    feature: "Scheduling",
  },
];

const features = [
  {
    title: "Telegram Assistant",
    description:
      "Send any message to your Telegram bot and get OpenAI-powered replies for questions, drafting, and brainstorming.",
    slug: "assistant",
  },
  {
    title: "Notion Notes",
    description:
      "Prefix any Telegram message with * to save as a note, use `*<name>,` to save to a subpage, or reply with `*` to save the replied message.",
    slug: "notion",
  },
  {
    title: "Gmail Summaries",
    description:
      "Connect up to 5 Gmail accounts via read-only OAuth2 and summarize unread messages with OpenAI.",
    slug: "gmail",
  },
  {
    title: "Telegram Delivery",
    description:
      "Send summaries, assistant replies, notes confirmations, tests, and weather reports back to your Telegram chat.",
    slug: "telegram",
  },
  {
    title: "Daily Weather Report",
    description:
      "Every evening at 20:00, sends a short Vransko forecast with practical clothing advice for you and the kids.",
    slug: "weather",
  },
  {
    title: "Daily Calendar Report",
    description:
      "Every evening at 20:00, sends tomorrow's calendar events, holidays, and birthdays to Telegram.",
    slug: "calendar",
  },
  {
    title: "Smart Scheduling",
    description:
      "Cron-based automation runs recurring work every 30 minutes. Deploy on Vercel or use any external cron service.",
    slug: "cron",
  },
];

const howItWorks = [
  {
    title: "Telegram Assistant",
    description:
      "Send any message to your bot. It's forwarded to OpenAI, and the reply comes back to you in Telegram. Use it for questions, drafting, or brainstorming.",
    example:
      'You: "Draft a 2-line reply declining the meeting." Bot: "Thank you for the invite. I won\'t be able to attend..."',
  },
  {
    title: "Notion Notes",
    description:
      "Messages that start with * (asterisk) are saved as notes in your Notion page. Use `*<name>,` to save to a subpage in Notes, or reply with `*` to capture the replied message as a note.",
    example:
      '*Call back John re: project scope by Friday -> appended to main Notes. *Work, Review Q1 roadmap -> saved to subpage "Work" under Notes.',
  },
  {
    title: "Gmail Summaries",
    description:
      "The agent connects to up to 5 Gmail accounts via OAuth2. It reads unread messages from inbox, social, and promotions, skips spam, and summarizes relevant mail.",
    example:
      'A long newsletter becomes: "Q4 Product Launch Recap" - Key features shipped · Beta feedback summary · Next steps.',
  },
  {
    title: "Telegram Delivery",
    description:
      "Summaries are sent to your Telegram chat. Social emails get category prefixes and promotions are marked separately, so you can skim by type at a glance.",
    example:
      'You receive a compact summary in Telegram with sender, subject, title, and a few bullets.',
  },
  {
    title: "Daily Weather Report",
    description:
      "The cron route checks local Ljubljana time and, at 20:00, gets tomorrow's Vransko forecast from Open-Meteo.",
    example:
      "Vransko tomorrow: 8-16°C, rain 50%, wind 18 km/h. Dress: warm layers; waterproof jackets for the kids.",
  },
  {
    title: "Daily Calendar Report",
    description:
      "The same cron route reads Google Calendar with read-only OAuth and sends tomorrow's events, holidays, and birthdays to Telegram.",
    example:
      "Tomorrow (2026-05-14) Events: 09:00 Standup. Holidays: Ascension Day. Birthdays: Ana's birthday.",
  },
  {
    title: "Smart Scheduling",
    description:
      "A cron job runs every 30 minutes (or on your schedule). It triggers enabled recurring work, including email checks and the evening weather report.",
    example:
      "At 9:00, 9:30, 10:00... the agent checks enabled modules and sends useful updates to Telegram.",
  },
];

export default function Home() {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false }));
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1117] font-mono text-sm text-[#c9d1d9]">
      {/* Terminal-style header */}
      <header className="sticky top-0 z-50 border-b border-[#30363d] bg-[#161b22]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
            <span className="shrink-0 text-[#8b949e]">$</span>
            <span className="truncate text-[#58a6ff]">gjoko-ai-agent</span>
            <span className="hidden shrink-0 rounded border border-[#30363d] bg-[#21262d] px-2 py-0.5 text-xs text-[#8b949e] sm:inline">
              MIT
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap text-[#8b949e] underline decoration-[#8b949e]/40 underline-offset-2 hover:text-[#c9d1d9] hover:decoration-[#c9d1d9]"
                >
                  {link.label}
                </a>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="whitespace-nowrap text-[#58a6ff] underline decoration-[#58a6ff]/40 underline-offset-2 hover:decoration-[#58a6ff]"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[#30363d] text-[#8b949e] hover:border-[#58a6ff] hover:text-[#c9d1d9] md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <span className="text-lg leading-none">×</span>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile nav panel */}
        {mobileMenuOpen && (
          <nav
            className="border-t border-[#30363d] bg-[#0d1117] md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="mx-auto max-w-5xl space-y-1 px-4 py-3">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded border border-transparent px-4 py-3 text-[#8b949e] underline decoration-[#8b949e]/40 underline-offset-2 hover:border-[#30363d] hover:bg-[#161b22] hover:text-[#c9d1d9] hover:decoration-[#c9d1d9]"
                  >
                    {link.label}
                  </a>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded border border-transparent px-4 py-3 text-[#58a6ff] underline decoration-[#58a6ff]/40 underline-offset-2 hover:border-[#30363d] hover:bg-[#161b22] hover:decoration-[#58a6ff]"
                  >
                    {link.label}
                  </a>
                ),
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Hero — README style */}
        <section className="mb-12">
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">gjoko-ai-agent</h1>
          </div>
          <p className="mb-6 text-[#8b949e]">
            Personal AI assistant for Telegram, Notion notes, Gmail summaries,
            weather, and small automations. Self-hosted, open source.
          </p>
          <div className="mb-6 rounded-md border border-[#30363d] bg-[#161b22] p-4">
            <p className="text-[#8b949e]">
              <span className="text-[#7d8590]">{"//"}</span> Deploy, configure env
              vars, connect the modules you want.
              <br />
              <span className="text-[#7d8590]">{"//"}</span> Cron runs every 30min.
              Useful updates hit Telegram.{" "}
              <code className="text-[#bc8cff]">*</code> prefix saves to Notion.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="#setup"
              className="inline-flex items-center gap-1 rounded border border-[#30363d] bg-[#21262d] px-4 py-2 text-white hover:border-[#58a6ff] hover:bg-[#21262d]"
            >
              <span className="text-[#3fb950]">→</span> Get started
            </a>
            <a
              href="https://github.com/djokobozinov/gjoko-ai-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded border border-[#30363d] px-4 py-2 text-[#8b949e] hover:border-[#30363d] hover:text-[#c9d1d9]"
            >
              ★ Star on GitHub
            </a>
          </div>
        </section>

        {/* Features — doc blocks */}
        <section id="features" className="mb-12">
          <h2 className="mb-4 border-b border-[#30363d] pb-2 text-lg font-semibold text-white">
            ## Features
          </h2>
          <div className="space-y-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded border border-[#30363d] bg-[#161b22] p-4"
              >
                <h3 className="mb-1 font-semibold text-white">
                  <span className="text-[#58a6ff]">.</span>
                  {f.slug}
                </h3>
                <p className="text-[#8b949e]">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="mb-4 border-b border-[#30363d] pb-2 text-lg font-semibold text-white">
            ## How it works
          </h2>
          <div className="space-y-6">
            {howItWorks.map((item) => (
              <div
                key={item.title}
                className="rounded border border-[#30363d] bg-[#161b22] p-4"
              >
                <h3 className="mb-2 font-semibold text-white">{item.title}</h3>
                <p className="mb-3 text-[#8b949e]">{item.description}</p>
                <div className="rounded border border-[#21262d] bg-[#0d1117] px-3 py-2">
                  <span className="text-[#7d8590]">{"// example:"}</span>
                  <p className="mt-1 text-[#8b949e]">{item.example}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Filtering & Security — two columns */}
        <section className="mb-12">
          <h2 className="mb-4 border-b border-[#30363d] pb-2 text-lg font-semibold text-white">
            ## Config
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded border border-[#30363d] bg-[#161b22] p-4">
              <h3 className="mb-2 font-semibold text-[#3fb950]">Filtering</h3>
              <ul className="space-y-1 text-[#8b949e]">
                {[
                  "inbox, social, promotions — unread only",
                  "skips spam",
                  "skips < 5 char emails",
                  "👥 social · 🏷️ promotions",
                  "optional LABEL_FILTER, EXCLUDE_CATEGORIES",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#3fb950]">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded border border-[#30363d] bg-[#161b22] p-4">
              <h3 className="mb-2 font-semibold text-[#bc8cff]">Security</h3>
              <ul className="space-y-1 text-[#8b949e]">
                {[
                  "read-only Gmail",
                  "password-protected utils",
                  "webhook secret validation",
                  "MAX_EMAILS_PER_RUN",
                  "5 accounts / 1 OAuth client",
                  "no DB — env vars only",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#bc8cff]">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Setup & Status */}
        <section id="setup" className="mb-12">
          <h2 className="mb-4 border-b border-[#30363d] pb-2 text-lg font-semibold text-white">
            ## Setup & Status
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Account Status */}
            <div className="rounded border border-[#30363d] bg-[#161b22] p-4">
              <h3 className="mb-3 font-semibold text-white">Account Status</h3>
              {status === null && (
                <div className="flex items-center gap-2 text-[#8b949e]">
                  <span className="animate-pulse">▌</span>
                  <span>Checking config...</span>
                </div>
              )}
              {status?.configured && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#3fb950]" />
                    <span className="text-[#3fb950]">configured</span>
                  </div>
                  {status.features && (
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["emailSummaries", "email"],
                        ["telegramAssistant", "assistant"],
                        ["notionNotes", "notion"],
                        ["telegramTest", "telegram-test"],
                        ["telegramWebhookSetup", "webhook"],
                        ["dailyWeatherReport", "weather"],
                        ["dailyCalendarReport", "calendar"],
                      ]
                        .filter(
                          ([key]) =>
                            status.features?.[
                              key as keyof typeof status.features
                            ]?.enabled,
                        )
                        .map(([, label]) => (
                          <span
                            key={label}
                            className="rounded border border-[#30363d] bg-[#21262d] px-2 py-0.5 text-xs text-[#8b949e]"
                          >
                            {label}
                          </span>
                        ))}
                    </div>
                  )}
                  <p className="text-xs text-[#8b949e]">
                    To disconnect: remove{" "}
                    <code className="text-[#bc8cff]">GOOGLE_REFRESH_TOKEN</code>{" "}
                    from env.
                  </p>
                </div>
              )}
              {status && !status.configured && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#d29922]" />
                    <span className="text-[#d29922]">not configured</span>
                  </div>
                  {(() => {
                    const missing = status.features
                      ? [
                          ...(status.features.emailSummaries?.missing ?? []),
                          ...(status.features.telegramAssistant?.missing ?? []),
                          ...(status.features.notionNotes?.missing ?? []),
                          ...(status.features.telegramTest?.missing ?? []),
                          ...(status.features.telegramWebhookSetup?.missing ??
                            []),
                          ...(status.features.dailyWeatherReport?.missing ??
                            []),
                          ...(status.features.dailyCalendarReport?.missing ??
                            []),
                        ]
                      : (status.missing ?? []);
                    const uniqueMissing = [...new Set(missing)];
                    return (
                      uniqueMissing.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-[#8b949e]">missing:</p>
                          <div className="flex flex-wrap gap-1">
                            {uniqueMissing.map((m) => (
                              <code
                                key={m}
                                className="rounded bg-[#21262d] px-2 py-0.5 text-[#f85149]"
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
                    className="inline-flex items-center gap-1 rounded border border-[#30363d] bg-[#21262d] px-3 py-2 text-white hover:border-[#58a6ff]"
                  >
                    <span className="text-[#3fb950]">$</span> Setup Gmail
                  </a>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="rounded border border-[#30363d] bg-[#161b22] p-4">
              <h3 className="mb-3 font-semibold text-white">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  {
                    href: "/api/auth/gmail?action=init",
                    label: "Reconnect Google Calendar",
                    desc: "Refresh OAuth",
                  },
                  {
                    href: "/telegram-webhook",
                    label: "Set Telegram Webhook",
                    desc: "Configure webhook",
                  },
                  {
                    href: "/telegram-test",
                    label: "Telegram Test",
                    desc: "Test bot",
                  },
                  {
                    href: "/check-mail",
                    label: "Check Mail Now",
                    desc: "Manually trigger",
                  },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between rounded border border-transparent px-3 py-2 text-[#8b949e] underline decoration-[#8b949e]/40 underline-offset-2 hover:border-[#30363d] hover:text-[#c9d1d9] hover:decoration-[#c9d1d9]"
                  >
                    <span>{link.label}</span>
                    <span className="text-[#7d8590]">→</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Env vars — code block style */}
        <section id="env" className="mb-12">
          <h2 className="mb-4 border-b border-[#30363d] pb-2 text-lg font-semibold text-white">
            ## Environment Variables
          </h2>
          <p className="mb-4 text-[#8b949e]">
            Set in <code className="text-[#bc8cff]">.env.local</code> or
            deployment env. See{" "}
            <code className="text-[#bc8cff]">.env.example</code>.
          </p>
          <div className="overflow-x-auto rounded border border-[#30363d] bg-[#0d1117]">
            <div className="border-b border-[#30363d] px-4 py-2 text-xs text-[#8b949e]">
              .env
            </div>
            <div className="p-4 font-mono text-xs">
              {ENV_VARS_REFERENCE.map((v) => (
                <div
                  key={v.name}
                  className="flex flex-wrap gap-x-4 gap-y-1 py-1 sm:flex-nowrap"
                >
                  <code className="shrink-0 text-[#58a6ff]">{v.name}</code>
                  <span className="text-[#7d8590]"># {v.description}</span>
                  <span className="shrink-0 text-[#7d8590]">({v.feature})</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GitHub CTA */}
        <section className="mb-12">
          <div className="rounded border border-[#30363d] bg-[#161b22] p-6 text-center">
            <p className="mb-4 text-[#8b949e]">
              If you find this useful, star it on GitHub.
            </p>
            <a
              href="https://github.com/djokobozinov/gjoko-ai-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded border border-[#30363d] bg-[#21262d] px-6 py-3 text-white hover:border-[#58a6ff]"
            >
              ★ Star on GitHub
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#30363d] py-6 text-center text-[#8b949e]">
          <p>
            gjoko-ai-agent · MIT ·{" "}
            <a
              href="https://github.com/djokobozinov/gjoko-ai-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#58a6ff] underline decoration-[#58a6ff]/40 underline-offset-2 hover:decoration-[#58a6ff]"
            >
              github
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
