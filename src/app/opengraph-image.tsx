import { ImageResponse } from "next/og";

export const alt = "Orange Brick — Portal de notícias de games";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0d0e12",
          color: "#ffffff",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", backgroundColor: "#FF5E00", padding: "10px 22px" }}>
            <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: 5, color: "#000000" }}>NEWS</span>
          </div>
          <span style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 6, color: "#999BA3" }}>
            DIRETO AO PONTO
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ display: "flex", fontSize: 110, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2 }}>
            ORANGE<span style={{ color: "#FF5E00" }}>_</span>BRICK
          </span>
          <span style={{ display: "flex", marginTop: 18, fontSize: 34, fontWeight: 600, color: "#C7C8CD" }}>
            Notícias de games, hardware e indústria — sem frescura.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "flex", height: 6, width: 90, backgroundColor: "#FF5E00" }} />
          <span style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 3, color: "#999BA3" }}>
            PORTAL DE NOTÍCIAS DE GAMES
          </span>
        </div>
      </div>
    ),
    size
  );
}
