"use client";

import { useEffect, useState } from "react";

interface AccountStatus {
  configured: boolean;
  missing?: string[];
}

export default function Home() {
  const [status, setStatus] = useState<AccountStatus | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false }));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 font-sans">
      <main className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Email → Summary → Telegram
        </h1>

        {status === null && (
          <p className="text-zinc-500">Loading…</p>
        )}

        {status?.configured && (
          <div className="space-y-4">
            <p className="text-green-600 dark:text-green-500">Configured</p>
            <p className="text-sm text-zinc-500">
              To disconnect, remove <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">GOOGLE_REFRESH_TOKEN</code> from your environment and restart.
            </p>
          </div>
        )}

        {status && !status.configured && (
          <div className="space-y-4">
            <p className="text-amber-600 dark:text-amber-500">Not configured</p>
            {status.missing && status.missing.length > 0 && (
              <p className="text-sm text-zinc-500">
                Missing: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{status.missing.join(", ")}</code>
              </p>
            )}
            <a
              href="/api/auth/gmail?action=init"
              className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Setup Gmail
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
