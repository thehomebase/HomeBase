import { Composition, registerRoot } from "remotion";
import { ListingVideo } from "./ListingVideo";
import type { ListingVideoProps } from "./types";
import { ASPECT_RATIOS } from "./types";

export function RemotionRoot() {
  const defaultProps: ListingVideoProps = {
    photos: [],
    settings: {
      aspectRatio: "16:9",
      musicTrack: "none",
      transitionDuration: 1,
      photoDuration: 4,
      showCaptions: true,
      brandingPosition: "bottom-right",
      transitionStyle: "crossfade",
      textTemplate: "bold",
    },
    propertyDetails: {},
    propertyAddress: "",
    agentBranding: {
      showName: true, showEmail: true, showPhone: true, showBrokerage: true,
      showClosingSlide: true, showAgentPhoto: false, showBrokerageLogo: false,
      name: "", email: "", phone: "", brokerageName: "", roleText: "",
      agentPhotoUrl: "", brokerageLogoUrl: "",
    },
  };

  return (
    <>
      <Composition
        id="ListingVideo"
        component={ListingVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => {
          const ar = ASPECT_RATIOS[props.settings.aspectRatio] || ASPECT_RATIOS["16:9"];
          const segDuration = props.settings.photoDuration + props.settings.transitionDuration;
          const closingDuration = props.agentBranding.showClosingSlide ? 4 : 0;
          const totalDuration = Math.max(1, props.photos.length) * segDuration + closingDuration;
          return {
            durationInFrames: Math.ceil(totalDuration * 30),
            fps: 30,
            width: ar.width,
            height: ar.height,
          };
        }}
      />
    </>
  );
}

registerRoot(RemotionRoot);
