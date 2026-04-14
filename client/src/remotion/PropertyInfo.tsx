import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { PropertyDetails, VideoSettings } from "./types";

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

export function PropertyInfoOverlay({
  propertyDetails,
  propertyAddress,
  template,
  globalProgress,
  width,
  height,
}: {
  propertyDetails: PropertyDetails;
  propertyAddress: string;
  template: string;
  globalProgress: number;
  width: number;
  height: number;
}) {
  if (template === "none") return null;
  if (!propertyAddress && !propertyDetails.price) return null;
  if (globalProgress > 0.15) return null;

  if (template === "bold") {
    return <BoldPropertyInfo propertyDetails={propertyDetails} propertyAddress={propertyAddress} globalProgress={globalProgress} width={width} height={height} />;
  }
  if (template === "minimal") {
    return <MinimalPropertyInfo propertyDetails={propertyDetails} propertyAddress={propertyAddress} globalProgress={globalProgress} width={width} height={height} />;
  }
  if (template === "elegant") {
    return <ElegantPropertyInfo propertyDetails={propertyDetails} propertyAddress={propertyAddress} globalProgress={globalProgress} width={width} height={height} />;
  }
  return <ClassicPropertyInfo propertyDetails={propertyDetails} propertyAddress={propertyAddress} globalProgress={globalProgress} width={width} height={height} />;
}

function BoldPropertyInfo({ propertyDetails, propertyAddress, globalProgress, width, height }: {
  propertyDetails: PropertyDetails; propertyAddress: string; globalProgress: number; width: number; height: number;
}) {
  const segDuration = 0.15;
  const staggerAlpha = (delay: number) => {
    const t = Math.max(0, globalProgress - delay);
    const fadeIn = easeOut(Math.min(1, t * 15));
    const fadeOutStart = segDuration - 0.03;
    const fadeOut = globalProgress > fadeOutStart ? easeInOut(Math.max(0, 1 - (globalProgress - fadeOutStart) / 0.03)) : 1;
    return Math.min(fadeIn, fadeOut);
  };
  const staggerSlide = (delay: number) => {
    const t = Math.max(0, globalProgress - delay);
    return easeOut(Math.min(1, t * 12)) * 30;
  };

  const headerSize = Math.max(32, width * 0.09);
  const priceSize = Math.max(24, width * 0.06);
  const addrSize = Math.max(13, width * 0.028);

  const detailItems: string[] = [];
  if (propertyDetails.beds) detailItems.push(`${propertyDetails.beds} BEDS`);
  if (propertyDetails.baths) detailItems.push(`${propertyDetails.baths} BATHS`);
  if (propertyDetails.sqft) detailItems.push(`${propertyDetails.sqft} SQ FT`);

  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(circle at 50% 35%, rgba(0,0,0,0.45) 10%, rgba(0,0,0,0.2) 60%, transparent 100%)",
        opacity: staggerAlpha(0.005),
      }} />

      <div style={{
        position: "absolute", top: `${height * 0.22}px`, left: 0, right: 0,
        textAlign: "center", opacity: staggerAlpha(0.005),
        transform: `translateY(${30 - staggerSlide(0.005)}px)`,
      }}>
        <div style={{
          fontSize: headerSize, fontWeight: 900,
          fontFamily: '"Bebas Neue", "Oswald", system-ui, sans-serif',
          color: "#fff", textShadow: "0 4px 16px rgba(0,0,0,0.9)",
        }}>
          JUST LISTED
        </div>
        <div style={{
          margin: "0 auto", width: width * 0.15, height: 2,
          backgroundColor: "#fff", opacity: 0.6, marginTop: -headerSize * 0.1,
        }} />
      </div>

      {propertyDetails.price && (
        <div style={{
          position: "absolute", top: `${height * 0.22 + headerSize * 1.3}px`,
          left: 0, right: 0, textAlign: "center",
          opacity: staggerAlpha(0.025),
          transform: `translateY(${30 - staggerSlide(0.025)}px)`,
        }}>
          <div style={{
            fontSize: priceSize, fontWeight: 700,
            fontFamily: '"Montserrat", system-ui, sans-serif',
            color: "#fff", textShadow: "0 3px 12px rgba(0,0,0,0.8)",
          }}>
            {propertyDetails.price}
          </div>
        </div>
      )}

      {propertyAddress && (
        <div style={{
          position: "absolute",
          top: `${height * 0.22 + headerSize * 1.3 + (propertyDetails.price ? priceSize * 1.5 : headerSize * 1.5)}px`,
          left: 0, right: 0, textAlign: "center",
          opacity: staggerAlpha(0.045),
          transform: `translateY(${30 - staggerSlide(0.045)}px)`,
        }}>
          <div style={{
            fontSize: addrSize, fontWeight: 500,
            fontFamily: '"Montserrat", system-ui, sans-serif',
            color: "rgba(255,255,255,0.9)", textShadow: "0 0 6px rgba(0,0,0,0.8)",
          }}>
            {propertyAddress.toUpperCase()}
          </div>
        </div>
      )}

      {detailItems.length > 0 && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: Math.max(42, height * 0.07),
          background: "linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(240,240,240,0.95))",
          borderTop: "1px solid rgba(0,0,0,0.08)",
          display: "flex", opacity: staggerAlpha(0.065),
          transform: `translateY(${30 - staggerSlide(0.065)}px)`,
        }}>
          {detailItems.map((item, i) => (
            <div key={i} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              borderRight: i < detailItems.length - 1 ? "1px solid rgba(0,0,0,0.12)" : "none",
            }}>
              <span style={{
                fontSize: Math.max(12, width * 0.022), fontWeight: 700,
                fontFamily: '"Montserrat", system-ui, sans-serif',
                color: "#1a1a1a",
              }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
}

function MinimalPropertyInfo({ propertyDetails, propertyAddress, globalProgress, width, height }: {
  propertyDetails: PropertyDetails; propertyAddress: string; globalProgress: number; width: number; height: number;
}) {
  const alpha = globalProgress < 0.02 ? globalProgress / 0.02 : globalProgress > 0.12 ? (0.15 - globalProgress) / 0.03 : 1;
  const slideIn = easeOut(Math.min(1, globalProgress * 10));
  const offsetX = (1 - slideIn) * -40;

  const details: string[] = [];
  if (propertyDetails.beds) details.push(`${propertyDetails.beds} Bed`);
  if (propertyDetails.baths) details.push(`${propertyDetails.baths} Bath`);
  if (propertyDetails.sqft) details.push(`${propertyDetails.sqft} Sq Ft`);

  return (
    <AbsoluteFill style={{ opacity: alpha }}>
      <div style={{
        position: "absolute", left: 0, top: `${height * 0.3}px`,
        width: `${width * 0.45}px`, height: `${height * 0.35}px`,
        background: "linear-gradient(to right, rgba(0,0,0,0.5), transparent)",
      }} />
      <div style={{
        position: "absolute", left: `${width * 0.06 - 6 + offsetX}px`,
        top: `${height * 0.3 + height * 0.035}px`, width: 3, height: `${height * 0.28}px`,
        background: "linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.3))",
      }} />
      <div style={{
        position: "absolute", left: `${width * 0.06 + 6 + offsetX}px`,
        top: `${height * 0.36}px`,
      }}>
        {propertyDetails.price && (
          <div style={{
            fontSize: Math.max(22, width * 0.058), fontWeight: 800,
            fontFamily: '"Montserrat", system-ui, sans-serif',
            color: "#fff", textShadow: "0 0 10px rgba(0,0,0,0.6)",
            marginBottom: `${Math.max(22, width * 0.058) * 0.4}px`,
          }}>
            {propertyDetails.price}
          </div>
        )}
        {propertyAddress && (
          <div style={{
            fontSize: Math.max(12, width * 0.026), fontWeight: 500,
            fontFamily: '"Montserrat", system-ui, sans-serif',
            color: "rgba(255,255,255,0.85)", textShadow: "0 0 4px rgba(0,0,0,0.6)",
            marginBottom: `${Math.max(12, width * 0.026) * 1}px`,
          }}>
            {propertyAddress.toUpperCase()}
          </div>
        )}
        {details.length > 0 && (
          <div style={{
            fontSize: Math.max(11, width * 0.022), fontWeight: 400,
            fontFamily: '"Montserrat", system-ui, sans-serif',
            color: "rgba(255,255,255,0.6)",
          }}>
            {details.join("  ·  ")}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

function ElegantPropertyInfo({ propertyDetails, propertyAddress, globalProgress, width, height }: {
  propertyDetails: PropertyDetails; propertyAddress: string; globalProgress: number; width: number; height: number;
}) {
  const alpha = globalProgress < 0.02 ? globalProgress / 0.02 : globalProgress > 0.12 ? (0.15 - globalProgress) / 0.03 : 1;
  const serifFont = '"Playfair Display", Georgia, serif';

  const details: string[] = [];
  if (propertyDetails.beds) details.push(`${propertyDetails.beds} Beds`);
  if (propertyDetails.baths) details.push(`${propertyDetails.baths} Baths`);
  if (propertyDetails.sqft) details.push(`${propertyDetails.sqft} Sq Ft`);

  return (
    <AbsoluteFill style={{ opacity: alpha }}>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)",
      }} />
      <div style={{
        position: "absolute", top: `${height * 0.66}px`, left: 0, right: 0,
        textAlign: "center",
      }}>
        {propertyDetails.price && (
          <div style={{
            fontSize: Math.max(24, width * 0.065), fontWeight: 400, fontStyle: "italic",
            fontFamily: serifFont, color: "#fff", textShadow: "0 0 10px rgba(0,0,0,0.5)",
            marginBottom: `${Math.max(24, width * 0.065) * 0.5}px`,
          }}>
            {propertyDetails.price}
          </div>
        )}
        <div style={{
          margin: "0 auto", width: `${width * 0.12}px`, height: 1,
          backgroundColor: "rgba(255,255,255,0.35)", marginBottom: Math.max(16, width * 0.035),
        }} />
        {propertyAddress && (
          <div style={{
            fontSize: Math.max(12, width * 0.026), fontWeight: 400,
            fontFamily: serifFont, color: "rgba(255,255,255,0.85)",
            textShadow: "0 0 4px rgba(0,0,0,0.6)", letterSpacing: "0.15em",
            marginBottom: `${Math.max(12, width * 0.026) * 1}px`,
          }}>
            {propertyAddress.toUpperCase()}
          </div>
        )}
        {details.length > 0 && (
          <div style={{
            fontSize: Math.max(11, width * 0.023), fontWeight: 400,
            fontFamily: serifFont, color: "rgba(255,255,255,0.6)",
          }}>
            {details.join("     ·     ")}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

function ClassicPropertyInfo({ propertyDetails, propertyAddress, globalProgress, width, height }: {
  propertyDetails: PropertyDetails; propertyAddress: string; globalProgress: number; width: number; height: number;
}) {
  const alpha = globalProgress < 0.02 ? globalProgress / 0.02 : globalProgress > 0.12 ? (0.15 - globalProgress) / 0.03 : 1;

  const contentLines: { text: string; isTitle: boolean }[] = [];
  if (propertyAddress) contentLines.push({ text: propertyAddress, isTitle: true });
  const details: string[] = [];
  if (propertyDetails.price) details.push(propertyDetails.price);
  if (propertyDetails.beds) details.push(`${propertyDetails.beds} Bed`);
  if (propertyDetails.baths) details.push(`${propertyDetails.baths} Bath`);
  if (propertyDetails.sqft) details.push(`${propertyDetails.sqft} Sq Ft`);
  if (details.length > 0) contentLines.push({ text: details.join("  •  "), isTitle: false });

  const titleSize = Math.max(16, width * 0.038);
  const detailSize = titleSize * 0.72;
  const lineH = titleSize * 1.7;

  return (
    <AbsoluteFill style={{
      display: "flex", alignItems: "center", justifyContent: "center", opacity: alpha,
    }}>
      <div style={{
        padding: `${titleSize}px ${titleSize * 1.5}px`,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.55))",
        borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
        textAlign: "center",
      }}>
        {contentLines.map(({ text, isTitle }, i) => (
          <div key={i} style={{
            fontSize: isTitle ? titleSize : detailSize,
            fontWeight: isTitle ? 700 : 400,
            fontFamily: '"Montserrat", system-ui, sans-serif',
            color: isTitle ? "#fff" : "rgba(255,255,255,0.8)",
            lineHeight: `${lineH}px`,
          }}>
            {text}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
