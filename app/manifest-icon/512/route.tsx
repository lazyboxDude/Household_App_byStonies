import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ea580c",
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: 280,
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          H
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
