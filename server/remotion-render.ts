import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";
import path from "path";
import fs from "fs";

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

export async function renderListingVideoOnLambda(
  options: RenderOptions,
  onProgress?: (progress: number) => void
): Promise<{ outputUrl: string; bucketName: string; renderId: string }> {
  const region = (process.env.REMOTION_AWS_REGION || "us-east-1") as "us-east-1";
  const functionName = process.env.REMOTION_FUNCTION_NAME;
  const serveUrl = process.env.REMOTION_SERVE_URL;

  if (!functionName || !serveUrl) {
    throw new Error("Missing REMOTION_FUNCTION_NAME or REMOTION_SERVE_URL environment variables");
  }

  const inputProps = {
    photos: options.photos,
    settings: options.settings,
    propertyDetails: options.propertyDetails,
    propertyAddress: options.propertyAddress,
    agentBranding: options.agentBranding,
  };

  console.log(`[Remotion Lambda] Starting render with function ${functionName}`);
  const renderStart = Date.now();

  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition: "ListingVideo",
    inputProps,
    codec: "h264",
    videoBitrate: "4M",
    maxRetries: 1,
    privacy: "no-acl",
    framesPerLambda: 300,
    downloadBehavior: { type: "download", fileName: "listing-video.mp4" },
  });

  console.log(`[Remotion Lambda] Render started: renderId=${renderId}, bucket=${bucketName}`);

  const MAX_RENDER_TIME_MS = 5 * 60 * 1000;
  let lastProgressUpdate = Date.now();

  while (true) {
    if (Date.now() - renderStart > MAX_RENDER_TIME_MS) {
      throw new Error("Lambda render timed out after 5 minutes");
    }

    try {
      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName,
        region,
      });

      if (progress.done) {
        const elapsed = Math.round((Date.now() - renderStart) / 1000);
        console.log(`[Remotion Lambda] Render complete in ${elapsed}s: ${progress.outputFile}`);
        onProgress?.(1);
        return {
          outputUrl: progress.outputFile!,
          bucketName,
          renderId,
        };
      }

      if (progress.fatalErrorEncountered) {
        const errMsg = progress.errors?.map((e: any) => e.message || e).join("; ") || "Unknown error";
        console.error(`[Remotion Lambda] Fatal error: ${errMsg}`);
        throw new Error(`Lambda render failed: ${errMsg}`);
      }

      if (progress.overallProgress !== null && progress.overallProgress !== undefined) {
        onProgress?.(progress.overallProgress);
        lastProgressUpdate = Date.now();
      }

      if (Date.now() - lastProgressUpdate > 90000) {
        console.warn(`[Remotion Lambda] No progress update for 90s, render may have stalled`);
        throw new Error("Lambda render stalled — no progress for 90 seconds");
      }
    } catch (pollErr: any) {
      if (pollErr.message.includes("Lambda render")) throw pollErr;
      console.warn(`[Remotion Lambda] Progress poll error: ${pollErr.message}`);
    }

    await new Promise((r) => setTimeout(r, 3000));
  }
}
