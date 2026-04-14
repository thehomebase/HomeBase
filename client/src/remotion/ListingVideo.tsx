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

  const segmentDuration = settings.photoDuration + settings.transitionDuration;
  const segmentFrames = Math.round(segmentDuration * fps);
  const photosDuration = photos.length * segmentDuration;
  const closingSlideDuration = agentBranding.showClosingSlide ? 4 : 0;
  const totalDuration = photosDuration + closingSlideDuration;
  const closingSlideFrames = Math.round(closingSlideDuration * fps);
  const photosFrames = photos.length * segmentFrames;

  const globalProgress = frame / durationInFrames;

  const elapsed = frame / fps;
  const currentPhotoIdx = Math.min(Math.floor(elapsed / segmentDuration), photos.length - 1);
  const photoProgress = (elapsed - currentPhotoIdx * segmentDuration) / segmentDuration;
  const propertyInfoVisible = globalProgress <= 0.15 && (!!propertyAddress || !!propertyDetails.price);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {photos.map((photo, i) => (
        <Sequence key={photo.id} from={i * segmentFrames} durationInFrames={segmentFrames}>
          <Scene
            photo={photo}
            nextPhoto={i < photos.length - 1 ? photos[i + 1] : undefined}
            transitionDuration={settings.transitionDuration}
            photoDuration={settings.photoDuration}
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
  "fashion-luxury": "fashion-luxury.mp3",
  "fun-exciting-travel": "fun-exciting-travel.mp3",
  "luxury-electronic": "luxury-electronic.mp3",
  "real-estate": "real-estate.mp3",
};

function isBundledTrack(track: string): boolean {
  return track in BUNDLED_TRACK_MAP;
}

function getBundledTrackFilename(track: string): string {
  return BUNDLED_TRACK_MAP[track] || "";
}
