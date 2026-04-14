import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { PhotoItem, VideoSettings, PropertyDetails, AgentBranding } from "./types";

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

export function KeywordOverlay({
  keyword,
  template,
  photoProgress,
  width,
  height,
}: {
  keyword?: string;
  template: string;
  photoProgress: number;
  width: number;
  height: number;
}) {
  if (!keyword || template === "none") return null;

  const fadeIn = Math.min(1, photoProgress * 4);
  const fadeOut = Math.min(1, (1 - photoProgress) * 4);
  const alpha = Math.min(fadeIn, fadeOut);
  const slideIn = easeOut(Math.min(1, photoProgress * 3));

  if (template === "bold") {
    const fontSize = Math.max(22, width * 0.05);
    const offsetX = (1 - slideIn) * -40;
    return (
      <div style={{ position: "absolute", bottom: `${height * 0.1}px`, left: 0, width: "50%", opacity: alpha }}>
        <div style={{
          position: "absolute", left: 0, top: `-${fontSize * 1.2}px`,
          width: "100%", height: `${fontSize * 2.4}px`,
          background: "linear-gradient(to right, rgba(0,0,0,0.5), transparent)",
        }} />
        <div style={{
          position: "absolute", left: `${width * 0.05 + offsetX}px`, top: `-${fontSize * 0.8}px`,
          width: 4, height: `${fontSize * 1.2}px`, backgroundColor: "#fff",
        }} />
        <div style={{
          marginLeft: `${width * 0.05 + 4 + fontSize * 0.5 + offsetX}px`,
          fontSize, fontWeight: 800, fontFamily: '"Oswald", "Montserrat", system-ui, sans-serif',
          color: "#fff", textShadow: "2px 2px 10px rgba(0,0,0,0.8)",
          letterSpacing: "0.02em",
        }}>
          {keyword.toUpperCase()}
        </div>
      </div>
    );
  }

  if (template === "minimal") {
    const fontSize = Math.max(16, width * 0.038);
    const slideUp = easeOut(Math.min(1, photoProgress * 3));
    const offsetY = (1 - slideUp) * 20;
    return (
      <div style={{
        position: "absolute", bottom: `${height * 0.08 - offsetY}px`,
        left: `${width * 0.06}px`, opacity: alpha,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 3, height: `${fontSize * 0.9}px`,
          background: "linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.3))",
        }} />
        <div style={{
          fontSize, fontWeight: 600, fontFamily: '"Montserrat", system-ui, sans-serif',
          color: "#fff", textShadow: "0 0 8px rgba(0,0,0,0.6)",
        }}>
          {keyword.toUpperCase()}
        </div>
      </div>
    );
  }

  if (template === "elegant") {
    const fontSize = Math.max(18, width * 0.042);
    const spaced = keyword.toUpperCase().split("").join("\u200A");
    return (
      <div style={{
        position: "absolute", bottom: `${height * 0.12}px`, left: 0, right: 0,
        textAlign: "center", opacity: alpha,
      }}>
        <div style={{
          fontSize, fontWeight: 400, fontStyle: "italic",
          fontFamily: '"Playfair Display", Georgia, serif',
          color: "#fff", textShadow: "0 0 12px rgba(0,0,0,0.6)", letterSpacing: "0.15em",
        }}>
          {spaced}
        </div>
        <div style={{
          margin: "8px auto 0", width: `${Math.min(200, width * 0.25)}px`,
          height: 1, backgroundColor: "rgba(255,255,255,0.4)",
        }} />
      </div>
    );
  }

  const fontSize = Math.max(18, width * 0.042);
  return (
    <div style={{
      position: "absolute", top: `${height * 0.12}px`, left: 0, right: 0,
      display: "flex", justifyContent: "center", opacity: alpha,
    }}>
      <div style={{
        padding: `${fontSize * 0.6}px ${fontSize}px`,
        background: "linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.55), rgba(0,0,0,0.7))",
        borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
      }}>
        <div style={{
          fontSize, fontWeight: 700, fontFamily: '"Montserrat", system-ui, sans-serif',
          color: "#fff", textAlign: "center",
        }}>
          {keyword.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

export function CaptionOverlay({
  caption,
  template,
  showCaptions,
  photoProgress,
  width,
  height,
}: {
  caption?: string;
  template: string;
  showCaptions: boolean;
  photoProgress: number;
  width: number;
  height: number;
}) {
  if (!caption || !showCaptions || template === "none") return null;
  if (template === "bold" || template === "minimal") return null;

  const fadeIn = Math.min(1, photoProgress * 5);
  const fadeOut = Math.min(1, (1 - photoProgress) * 5);
  const alpha = Math.min(fadeIn, fadeOut);

  if (template === "elegant") {
    const fontSize = Math.max(13, width * 0.028);
    return (
      <div style={{
        position: "absolute", bottom: `${height * 0.08}px`, left: 0, right: 0,
        textAlign: "center", opacity: alpha,
      }}>
        <div style={{
          fontSize, fontWeight: 400, fontStyle: "italic",
          fontFamily: '"Playfair Display", Georgia, serif',
          color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}>
          {caption}
        </div>
      </div>
    );
  }

  const fontSize = Math.max(14, width * 0.03);
  return (
    <div style={{
      position: "absolute", bottom: `${height * 0.06}px`, left: 0, right: 0,
      display: "flex", justifyContent: "center", opacity: alpha,
    }}>
      <div style={{
        padding: `${fontSize * 0.7}px ${fontSize * 1.2}px`,
        background: "linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.55), rgba(0,0,0,0.7))",
        borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)",
      }}>
        <div style={{
          fontSize, fontWeight: 500, fontFamily: '"Montserrat", system-ui, sans-serif',
          color: "#fff", textAlign: "center",
        }}>
          {caption}
        </div>
      </div>
    </div>
  );
}

export function BrandingOverlay({
  agentBranding,
  settings,
  width,
  height,
}: {
  agentBranding: AgentBranding;
  settings: VideoSettings;
  width: number;
  height: number;
}) {
  if (settings.textTemplate === "none") return null;

  const lines: string[] = [];
  if (agentBranding.showName && agentBranding.name) lines.push(agentBranding.name);
  if (agentBranding.showPhone && agentBranding.phone) lines.push(agentBranding.phone);
  if (agentBranding.showEmail && agentBranding.email) lines.push(agentBranding.email);
  if (agentBranding.showBrokerage && agentBranding.brokerageName) lines.push(agentBranding.brokerageName);
  if (lines.length === 0) return null;

  const tmpl = settings.textTemplate || "classic";
  const isElegant = tmpl === "elegant";
  const fontFamily = isElegant ? '"Playfair Display", Georgia, serif' : '"Montserrat", system-ui, sans-serif';
  const nameSize = Math.max(12, width * 0.026);
  const detailSize = nameSize * 0.78;
  const padding = nameSize * 0.8;
  const lineH = nameSize * 1.2;
  const margin = width * 0.03;

  const positionStyle: Record<string, string | number> = { position: "absolute" };
  switch (settings.brandingPosition) {
    case "top-left": positionStyle.top = margin; positionStyle.left = margin; break;
    case "top-right": positionStyle.top = margin; positionStyle.right = margin; break;
    case "bottom-left": positionStyle.bottom = margin; positionStyle.left = margin; break;
    default: positionStyle.bottom = margin; positionStyle.right = margin;
  }

  return (
    <div style={{
      ...positionStyle,
      background: "linear-gradient(135deg, rgba(0,0,0,0.65), rgba(0,0,0,0.45))",
      borderRadius: 8, padding: `${padding * 0.8}px ${padding}px`,
      opacity: 0.92, display: "flex", gap: 8,
    }}>
      <div style={{ width: 3, backgroundColor: "#fff", borderRadius: 2, alignSelf: "stretch" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: lineH * 0.15 }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            fontSize: i === 0 ? nameSize : detailSize,
            fontWeight: i === 0 ? 700 : 400,
            fontFamily,
            color: i === 0 ? "#fff" : "rgba(255,255,255,0.8)",
            lineHeight: `${lineH}px`,
          }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
