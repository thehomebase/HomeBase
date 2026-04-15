import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { Scene } from "./Scene";
import { KeywordOverlay, CaptionOverlay, BrandingOverlay } from "./TextOverlays";
import { PropertyInfoOverlay } from "./PropertyInfo";
import { ClosingSlide } from "./ClosingSlide";
import type { ListingVideoProps } from "./types";

export function ListingVideo({
  photos,
  settings,
  propertyDetails,
  propertyAddress,
  agentBranding,
}: ListingVideoProps) {
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const photoFrames = Math.round(settings.photoDuration * fps);
  const transitionFrames = Math.round(settings.transitionDuration * fps);
  const segmentFrames = photoFrames + transitionFrames;
  const photosFrames = photos.length > 0
    ? (photos.length - 1) * photoFrames + segmentFrames
    : 0;
  const closingSlideDuration = agentBranding.showClosingSlide ? 4 : 0;
  const closingSlideFrames = Math.round(closingSlideDuration * fps);

  const globalProgress = frame / durationInFrames;

  const elapsed = frame / fps;
  const effectiveSegment = settings.photoDuration;
  const currentPhotoIdx = Math.min(Math.floor(elapsed / effectiveSegment), photos.length - 1);
  const photoProgress = (elapsed - currentPhotoIdx * effectiveSegment) / effectiveSegment;
  const propertyInfoVisible = globalProgress <= 0.15 && (!!propertyAddress || !!propertyDetails.price);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {photos.map((photo, i) => (
        <Sequence key={photo.id} from={i * photoFrames} durationInFrames={segmentFrames}>
          <Scene
            photo={photo}
            transitionDuration={settings.transitionDuration}
            photoDuration={settings.photoDuration}
            isFirst={i === 0}
            isLast={i === photos.length - 1}
          />
        </Sequence>
      ))}

      {closingSlideDuration > 0 && (
        <Sequence from={photosFrames} durationInFrames={closingSlideFrames}>
          <ClosingSlide agentBranding={agentBranding} template={settings.textTemplate} />
        </Sequence>
      )}

      {frame < photosFrames && (
        <>
          <PropertyInfoOverlay
            propertyDetails={propertyDetails}
            propertyAddress={propertyAddress}
            template={settings.textTemplate}
            globalProgress={globalProgress}
            width={width}
            height={height}
          />

          {!propertyInfoVisible && photos[currentPhotoIdx] && (
            <>
              <KeywordOverlay
                keyword={photos[currentPhotoIdx].keyword}
                template={settings.textTemplate}
                photoProgress={photoProgress}
                width={width}
                height={height}
              />
              <CaptionOverlay
                caption={photos[currentPhotoIdx].caption}
                template={settings.textTemplate}
                showCaptions={settings.showCaptions}
                photoProgress={photoProgress}
                width={width}
                height={height}
              />
            </>
          )}

          <BrandingOverlay
            agentBranding={agentBranding}
            settings={settings}
            width={width}
            height={height}
          />
        </>
      )}

      {settings.musicTrack && settings.musicTrack !== "none" && isBundledTrack(settings.musicTrack) && (
        <Audio
          src={staticFile(`music/${getBundledTrackFilename(settings.musicTrack)}`)}
          volume={0.6}
        />
      )}
    </AbsoluteFill>
  );
}

const BUNDLED_TRACK_MAP: Record<string, string> = {
  "pixabay-fashion-luxury": "fashion-luxury.mp3",
  "pixabay-fun-travel": "fun-exciting-travel.mp3",
  "pixabay-luxury-electronic": "luxury-electronic.mp3",
  "pixabay-real-estate": "real-estate.mp3",
};

function isBundledTrack(track: string): boolean {
  return track in BUNDLED_TRACK_MAP;
}

function getBundledTrackFilename(track: string): string {
  return BUNDLED_TRACK_MAP[track] || "";
}
