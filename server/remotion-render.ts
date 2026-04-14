import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

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

function findSystemChromium(): string | null {
  const candidates = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const result = execSync("which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null", { encoding: "utf-8" }).trim();
    if (result) return result;
  } catch {}
  try {
    const nixResult = execSync("ls /nix/store/*/bin/chromium 2>/dev/null | head -1", { encoding: "utf-8" }).trim();
    if (nixResult) return nixResult;
  } catch {}
  return null;
}

const CHROME_LOW_MEM_FLAGS = [
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-software-rasterizer",
  "--no-sandbox",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-default-apps",
  "--disable-sync",
  "--disable-translate",
  "--metrics-recording-only",
  "--no-first-run",
  "--js-flags=--max-old-space-size=256",
];

export async function renderListingVideo(
  options: RenderOptions,
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const systemChromium = findSystemChromium();
  if (systemChromium) {
    console.log(`[Remotion] Using system Chromium: ${systemChromium}`);
  } else {
    console.log("[Remotion] No system Chromium found, using Remotion's bundled browser");
  }

  const browserExecutable = systemChromium || undefined;

  await ensureBrowser({ browserExecutable });
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
    browserExecutable,
    chromiumOptions: {
      args: CHROME_LOW_MEM_FLAGS,
    },
  });

  console.log(`[Remotion] Rendering ${composition.durationInFrames} frames (${composition.width}x${composition.height}) at ${composition.fps}fps`);

  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    videoBitrate: "4M",
    browserExecutable,
    concurrency: 1,
    chromiumOptions: {
      args: CHROME_LOW_MEM_FLAGS,
    },
    onProgress: ({ progress }) => {
      onProgress?.(progress);
    },
  });

  console.log(`[Remotion] Render complete: ${outputPath}`);
}
