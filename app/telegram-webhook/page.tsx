"use client";

import { useState } from "react";
import Link from "next/link";

export default function TelegramWebhookPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secretEnabled, setSecretEnabled] = useState<boolean | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setDescription("");
    setWebhookUrl("");
    setSecretEnabled(null);

    try {
      const res = await fetch("/api/telegram-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Request failed");
        setStatus("error");
        return;
      }

      setStatus("success");
      setDescription(
        typeof data.description === "string"
          ? data.description
          : "Webhook set successfully."
      );
      setWebhookUrl(typeof data.webhookUrl === "string" ? data.webhookUrl : "");
      setSecretEnabled(Boolean(data.secretEnabled));
    } catch {
      setError("Network error");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 font-sans">
      <main className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Set Telegram Webhook
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          Enter password to register Telegram webhook automatically using your
          configured APP_URL.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
              required
            />
          </div>

          {status === "error" && error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {status === "success" && (
            <div className="space-y-2 text-sm text-green-600 dark:text-green-500">
              <p>{description}</p>
              {webhookUrl && (
                <p className="break-all text-zinc-600 dark:text-zinc-300">
                  URL:{" "}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                    {webhookUrl}
                  </code>
                </p>
              )}
              <p className="text-zinc-600 dark:text-zinc-300">
                Secret token: {secretEnabled ? "enabled" : "not set"}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {status === "loading" ? "Setting webhook…" : "Set Telegram Webhook"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
        >
          ← Back to home
        </Link>
      </main>
    </div>
  );
}
