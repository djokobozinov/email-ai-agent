import { ImageResponse } from "next/og";

export const alt = "gjoko-ai-agent - self-hosted personal AI agent";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
          padding: "48px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            gjoko-ai-agent
          </div>
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: "900px",
          }}
        >
          Telegram assistant • Notion notes • Gmail summaries • Weather
        </div>
        <div
          style={{
            marginTop: "40px",
            fontSize: 24,
            color: "#64748b",
          }}
        >
          Open-source — deploy and run yourself
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
