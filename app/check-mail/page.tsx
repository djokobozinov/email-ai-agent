"use client";

import { useState } from "react";

export default function CheckMailPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [processed, setProcessed] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setProcessed(null);

    try {
      const res = await fetch("/api/check-mail", {
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

      setProcessed(data.processed ?? 0);
      setStatus("success");
    } catch {
      setError("Network error");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 font-sans">
      <main className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Check Mail
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          Trigger summarize mail for unread emails and send to Telegram.
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
          {status === "success" && processed !== null && (
            <p className="text-sm text-green-600 dark:text-green-500">
              Done. {processed} email{processed === 1 ? "" : "s"} summarized and sent to Telegram.
            </p>
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {status === "loading" ? "Checking mail…" : "Check & Summarize Mail"}
          </button>
        </form>
        <a
          href="/"
          className="mt-6 block text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
        >
          ← Back to home
        </a>
      </main>
    </div>
  );
}
