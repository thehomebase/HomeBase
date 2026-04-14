import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { AgentBranding, VideoSettings } from "./types";

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

export function ClosingSlide({
  agentBranding,
  template,
}: {
  agentBranding: AgentBranding;
  template: string;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  if (!agentBranding.showClosingSlide || template === "none") return null;

  const isElegant = template === "elegant";
  const headFont = isElegant ? '"Playfair Display", Georgia, serif' : '"Montserrat", system-ui, sans-serif';
  const bodyFont = isElegant ? '"Playfair Display", Georgia, serif' : '"Montserrat", system-ui, sans-serif';

  const totalFrames = 4 * fps;
  const slideProgress = frame / totalFrames;
  const fadeIn = easeOut(Math.min(1, slideProgress * 3));
  const scaleIn = 0.95 + 0.05 * fadeIn;

  const hasPhoto = agentBranding.showAgentPhoto && !!agentBranding.agentPhotoUrl;
  const hasLogo = agentBranding.showBrokerageLogo && !!agentBranding.brokerageLogoUrl;

  const photoSize = Math.max(60, width * 0.12);
  const nameSize = Math.max(24, width * 0.06);
  const roleSize = Math.max(12, width * 0.024);
  const contactSize = Math.max(13, width * 0.028);
  const brokSize = Math.max(11, width * 0.022);
  const logoH = Math.max(30, width * 0.05);

  return (
    <AbsoluteFill style={{
      background: "radial-gradient(circle at 50% 50%, #1a1a2e, #0a0a0f)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: fadeIn, transform: `scale(${scaleIn})`,
    }}>
      {hasPhoto && (
        <div style={{
          width: photoSize, height: photoSize, borderRadius: "50%", overflow: "hidden",
          border: "2px solid rgba(255,255,255,0.3)", marginBottom: Math.max(16, width * 0.025),
        }}>
          <Img src={agentBranding.agentPhotoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      {agentBranding.name && (
        <div style={{
          fontSize: nameSize, fontWeight: 700, fontFamily: headFont,
          color: "#fff", textShadow: "0 0 20px rgba(255,255,255,0.1)",
          marginBottom: nameSize * 0.5,
        }}>
          {agentBranding.name}
        </div>
      )}

      {agentBranding.roleText ? (
        <div style={{
          display: "flex", alignItems: "center", gap: roleSize * 0.8,
          marginBottom: roleSize * 1.5,
        }}>
          <div style={{ width: width * 0.04, height: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
          <div style={{
            fontSize: roleSize, fontWeight: 600, fontFamily: bodyFont,
            color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em",
          }}>
            {agentBranding.roleText.toUpperCase()}
          </div>
          <div style={{ width: width * 0.04, height: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
        </div>
      ) : (
        <div style={{
          width: width * 0.08, height: 1, backgroundColor: "rgba(255,255,255,0.2)",
          margin: `${Math.max(14, width * 0.03) * 0.4}px 0 ${Math.max(14, width * 0.03) * 0.8}px`,
        }} />
      )}

      {agentBranding.phone && (
        <div style={{
          fontSize: contactSize, fontWeight: 400, fontFamily: bodyFont,
          color: "rgba(255,255,255,0.75)", marginBottom: contactSize * 0.8,
        }}>
          {agentBranding.phone}
        </div>
      )}

      {agentBranding.email && (
        <div style={{
          fontSize: contactSize, fontWeight: 400, fontFamily: bodyFont,
          color: "rgba(255,255,255,0.75)", marginBottom: contactSize * 0.8,
        }}>
          {agentBranding.email}
        </div>
      )}

      {hasLogo && (
        <Img
          src={agentBranding.brokerageLogoUrl}
          style={{
            height: logoH, marginTop: Math.max(6, width * 0.01),
            opacity: 0.7, objectFit: "contain",
          }}
        />
      )}

      {agentBranding.brokerageName && (
        <div style={{
          fontSize: brokSize, fontWeight: 500, fontFamily: bodyFont,
          color: "rgba(255,255,255,0.4)", marginTop: hasLogo ? Math.max(6, width * 0.01) : Math.max(10, width * 0.015),
        }}>
          {agentBranding.brokerageName}
        </div>
      )}
    </AbsoluteFill>
  );
}
