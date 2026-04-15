import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, Video } from "remotion";
import { useState } from "react";
import type { PhotoItem } from "./types";

function getMotionStyle(motionType: string, progress: number, focusPoint?: { x: number; y: number }) {
  const fp = focusPoint || { x: 50, y: 50 };
  const ease = progress * progress * (3 - 2 * progress);
  const fpX = fp.x / 100;
  const fpY = fp.y / 100;

  let scale: number, x: number, y: number;

  switch (motionType) {
    case "push-in":
    case "walk-forward":
      scale = 1.1 + ease * 0.55; x = (fpX - 0.5) * ease * 0.2; y = (fpY - 0.5) * ease * 0.15; break;
    case "pull-out":
    case "reveal":
      scale = 1.65 - ease * 0.4; x = 0; y = -ease * 0.03; break;
    case "truck-right":
    case "walk-right":
      scale = 1.2 + ease * 0.25; x = ease * 0.18; y = ease * 0.02; break;
    case "truck-left":
    case "walk-left":
      scale = 1.2 + ease * 0.25; x = -ease * 0.18; y = ease * 0.02; break;
    case "drift-right":
      scale = 1.3 + ease * 0.12; x = ease * 0.12; y = Math.sin(ease * Math.PI) * 0.02; break;
    case "drift-left":
      scale = 1.3 + ease * 0.12; x = -ease * 0.12; y = Math.sin(ease * Math.PI) * 0.02; break;
    case "pan-right":
      scale = 1.3; x = ease * 0.22; y = 0; break;
    case "pan-left":
      scale = 1.3; x = -ease * 0.22; y = 0; break;
    case "tilt-up":
    case "pan-up":
      scale = 1.3; x = 0; y = -ease * 0.15; break;
    case "tilt-down":
    case "pan-down":
      scale = 1.3; x = 0; y = ease * 0.15; break;
    case "pedestal-up":
    case "rise-up":
      scale = 1.25 + ease * 0.2; x = 0; y = -ease * 0.12; break;
    case "orbit-right":
      scale = 1.25 + ease * 0.15; x = ease * 0.15; y = Math.sin(ease * Math.PI) * -0.04; break;
    case "orbit-left":
      scale = 1.25 + ease * 0.15; x = -ease * 0.15; y = Math.sin(ease * Math.PI) * -0.04; break;
    case "zoom-in":
      scale = 1.0 + ease * 0.5; x = (fpX - 0.5) * ease * 0.12; y = (fpY - 0.5) * ease * 0.08; break;
    case "zoom-out":
      scale = 1.55 - ease * 0.3; x = 0; y = 0; break;
    default:
      scale = 1.15 + ease * 0.4; x = ease * 0.1; y = ease * 0.02;
  }

  return {
    transform: `scale(${scale}) translate(${x * 100}%, ${y * 100}%)`,
  };
}

function FallbackImage({ photo, motionProgress, style }: { photo: PhotoItem; motionProgress: number; style?: React.CSSProperties }) {
  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <Img
        src={photo.dataUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          ...getMotionStyle(photo.motionType, motionProgress, photo.focusPoint),
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
}


function PhotoOrClip({
  photo,
  motionProgress,
  style,
}: {
  photo: PhotoItem;
  motionProgress: number;
  style?: React.CSSProperties;
}) {
  const [videoFailed, setVideoFailed] = useState(false);

  if (photo.videoClipUrl && !videoFailed) {
    return (
      <>
        <FallbackImage photo={photo} motionProgress={motionProgress} style={style} />
        <AbsoluteFill style={style}>
          <Video
            src={photo.videoClipUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => {
              console.warn(`[Scene] Video load failed for ${photo.id}, falling back to image`);
              setVideoFailed(true);
            }}
          />
        </AbsoluteFill>
      </>
    );
  }

  return <FallbackImage photo={photo} motionProgress={motionProgress} style={style} />;
}

export function Scene({
  photo,
  nextPhoto,
  transitionDuration,
  photoDuration,
}: {
  photo: PhotoItem;
  nextPhoto?: PhotoItem;
  transitionDuration: number;
  photoDuration: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const segmentFrames = (photoDuration + transitionDuration) * fps;
  const transitionFrames = transitionDuration * fps;
  const photoFrames = segmentFrames - transitionFrames;

  const motionProgress = Math.min(frame / photoFrames, 1);

  const isTransitioning = frame >= photoFrames;
  const transProgress = isTransitioning ? (frame - photoFrames) / transitionFrames : 0;

  const currentOpacity = isTransitioning ? interpolate(transProgress, [0, 1], [1, 0]) : 1;
  const nextOpacity = isTransitioning ? interpolate(transProgress, [0, 1], [0, 1]) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <PhotoOrClip
        photo={photo}
        motionProgress={motionProgress}
        style={{ opacity: currentOpacity }}
      />

      {isTransitioning && nextPhoto && (
        <PhotoOrClip
          photo={nextPhoto}
          motionProgress={transProgress * 0.1}
          style={{ opacity: nextOpacity }}
        />
      )}
    </AbsoluteFill>
  );
}
