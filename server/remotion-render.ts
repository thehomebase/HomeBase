import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";
import path from "path";
import fs from "fs";

let bundleLocation: string | null = null;
let bundlePromise: Promise<string> | null = null;

export async function getBundle(): Promise<string> {
  if (bundleLocation && fs.existsSync(bundleLocation)) {
    return bundleLocation;
  }

  if (bundlePromise) return bundlePromise;

  bundlePromise = (async () => {
    console.log("[Remotion] Bundling compositions...");
    const start = Date.now();

    const entryPoint = path.resolve(process.cwd(), "client/src/remotion/index.tsx");
    const result = await bundle({
      entryPoint,
      webpackOverride: (config) => {
        return {
          ...config,
          resolve: {
            ...config.resolve,
            alias: {
              ...(config.resolve?.alias || {}),
            },
          },
        };
      },
    });

    bundleLocation = result;
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`[Remotion] Bundle ready in ${elapsed}s: ${result}`);
    return result;
  })();

  return bundlePromise;
}

export interface RenderOptions {
  photos: Array<{
    id: string;
    filename: string;
    mimeType: string;
    dataUrl: string;
    order: number;
    motionType: string;
    caption: string;
    keyword?: string;
    roomType?: string;
    focusPoint?: { x: number; y: number };
    videoClipUrl?: string;
  }>;
  settings: {
    aspectRatio: string;
    musicTrack: string;
    transitionDuration: number;
    photoDuration: number;
    showCaptions: boolean;
    brandingPosition: string;
    transitionStyle: string;
    textTemplate: string;
  };
  propertyDetails: {
    price?: string;
    beds?: string;
    baths?: string;
    sqft?: string;
    description?: string;
  };
  propertyAddress: string;
  agentBranding: {
    showName: boolean;
    showEmail: boolean;
    showPhone: boolean;
    showBrokerage: boolean;
    showClosingSlide: boolean;
    showAgentPhoto: boolean;
    showBrokerageLogo: boolean;
    name: string;
    email: string;
    phone: string;
    brokerageName: string;
    roleText: string;
    agentPhotoUrl: string;
    brokerageLogoUrl: string;
  };
}

export async function renderListingVideo(
  options: RenderOptions,
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  await ensureBrowser();
  const bundlePath = await getBundle();

  const inputProps = {
    photos: options.photos,
    settings: options.settings,
    propertyDetails: options.propertyDetails,
    propertyAddress: options.propertyAddress,
    agentBranding: options.agentBranding,
  };

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: "ListingVideo",
    inputProps,
  });

  console.log(`[Remotion] Rendering ${composition.durationInFrames} frames (${composition.width}x${composition.height}) at ${composition.fps}fps`);

  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    videoBitrate: "4M",
    onProgress: ({ progress }) => {
      onProgress?.(progress);
    },
  });

  console.log(`[Remotion] Render complete: ${outputPath}`);
}
