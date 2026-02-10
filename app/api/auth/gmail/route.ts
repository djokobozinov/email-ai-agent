import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const MAX_ACCOUNTS = 5;

function getRefreshTokenVar(accountId: number): string {
  return accountId === 1 ? "GOOGLE_REFRESH_TOKEN" : `GOOGLE_REFRESH_TOKEN_${accountId}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // account id from init

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL;

  if (!clientId || !clientSecret || !appUrl) {
    return NextResponse.json(
      { error: "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or APP_URL" },
      { status: 500 }
    );
  }

  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/gmail`;
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  if (action === "init") {
    const accountId = Math.min(
      Math.max(1, parseInt(searchParams.get("account") ?? "1", 10) || 1),
      MAX_ACCOUNTS
    );
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      state: String(accountId),
    });
    return NextResponse.redirect(authUrl);
  }

  if (code) {
    const accountId = state ? Math.min(Math.max(1, parseInt(state, 10) || 1), MAX_ACCOUNTS) : 1;
    const envVar = getRefreshTokenVar(accountId);

    try {
      const { tokens } = await oauth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;

      if (!refreshToken) {
        return new NextResponse(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Setup - No Refresh Token</title></head><body>
            <h1>No refresh token received</h1>
            <p>Try revoking app access at <a href="https://myaccount.google.com/permissions">Google Account permissions</a>, then run the setup again.</p>
          </body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      return new NextResponse(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Setup Complete</title></head><body>
          <h1>Gmail OAuth Setup Complete (Account ${accountId})</h1>
          <p>Add this to your <code>.env</code> or environment variables:</p>
          <pre style="background:#f0f0f0;padding:1em;overflow-x:auto;">${envVar}=${refreshToken}</pre>
          <p>Then restart the application.</p>
          <p><a href="${appUrl}">← Back to app</a></p>
          ${accountId < MAX_ACCOUNTS ? `<p><a href="${appUrl}/api/auth/gmail?action=init&account=${accountId + 1}">Add account ${accountId + 1}</a></p>` : ""}
        </body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new NextResponse(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Setup Error</title></head><body>
          <h1>OAuth Error</h1>
          <p>${message}</p>
          <p><a href="${appUrl}/api/auth/gmail?action=init&account=${accountId}">Try again</a></p>
        </body></html>`,
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }
  }

  return NextResponse.redirect(appUrl);
}
