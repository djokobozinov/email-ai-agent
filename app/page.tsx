"use client";

import { useEffect, useState } from "react";

interface FeatureStatus {
  enabled: boolean;
  missing?: string[];
}

interface AccountStatus {
  configured: boolean;
  features: {
    emailSummaries: FeatureStatus;
    telegramAssistant: FeatureStatus;
    notionNotes: FeatureStatus;
    telegramTest: FeatureStatus;
    telegramWebhookSetup: FeatureStatus;
  };
}

const FEATURE_LABELS: Array<{
  key: keyof AccountStatus["features"];
  label: string;
}> = [
  {
    key: "emailSummaries",
    label: "Email summaries (Gmail + OpenAI + Telegram chat)",
  },
  {
    key: "telegramAssistant",
    label: "Telegram assistant replies (Telegram + OpenAI)",
  },
  {
    key: "notionNotes",
    label: "Telegram * notes to Notion (Telegram + Notion)",
  },
  {
    key: "telegramTest",
    label: "Telegram test page (/telegram-test)",
  },
  {
    key: "telegramWebhookSetup",
    label: "Webhook setup page (/telegram-webhook)",
  },
];

export default function Home() {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        setLoadError(false);
      })
      .catch(() => {
        setLoadError(true);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 font-sans">
      <main className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Optional Gmail + Telegram + Notion Features
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          Enable any feature independently. Email summaries, Telegram assistant,
          and{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">*</code>
          -prefixed Notion notes are all optional.
        </p>

        {!loadError && status === null && (
          <p className="text-zinc-500">Loading…</p>
        )}

        {loadError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Could not load feature status.
          </p>
        )}

        {status?.configured && (
          <div className="space-y-4">
            <p className="text-green-600 dark:text-green-500">
              At least one feature is enabled.
            </p>
          </div>
        )}

        {status && !status.configured && (
          <div className="space-y-4">
            <p className="text-amber-600 dark:text-amber-500">
              No optional features are enabled yet.
            </p>
          </div>
        )}

        {status?.features && (
          <div className="mt-6 space-y-3">
            {FEATURE_LABELS.map(({ key, label }) => {
              const feature = status.features[key];
              return (
                <div
                  key={key}
                  className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700"
                >
                  <p
                    className={`text-sm font-medium ${
                      feature.enabled
                        ? "text-green-600 dark:text-green-500"
                        : "text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    {label}: {feature.enabled ? "enabled" : "disabled"}
                  </p>
                  {!feature.enabled &&
                    Array.isArray(feature.missing) &&
                    feature.missing.length > 0 && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Missing:{" "}
                        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                          {feature.missing.join(", ")}
                        </code>
                      </p>
                    )}
                </div>
              );
            })}
          </div>
        )}

        <a
          href="/api/auth/gmail?action=init"
          className="mt-6 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Setup Gmail
        </a>

        <div className="mt-6 space-y-2">
          <a
            href="/telegram-webhook"
            className="block text-sm text-zinc-600 hover:text-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            Set Telegram Webhook
          </a>
          <a
            href="/telegram-test"
            className="block text-sm text-zinc-600 hover:text-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            Telegram Test
          </a>
          <a
            href="/check-mail"
            className="block text-sm text-zinc-600 hover:text-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            Check Mail
          </a>
        </div>
      </main>
    </div>
  );
}
