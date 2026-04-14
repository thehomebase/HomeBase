import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<boolean> | null = null;

export async function getFFmpeg(): Promise<FFmpeg | null> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (loadPromise) return loadPromise.then(ok => ok ? ffmpegInstance : null);

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    const tryLoad = async (coreURL: string, wasmURL: string, label: string): Promise<boolean> => {
      try {
        await ffmpeg.load({ coreURL, wasmURL });
        console.log(`[ClientFFmpeg] Loaded successfully (${label})`);
        return true;
      } catch (err: any) {
        console.warn(`[ClientFFmpeg] Failed to load from ${label}:`, err?.message);
        return false;
      }
    };

    const ok =
      await tryLoad("/ffmpeg/ffmpeg-core.js", "/ffmpeg/ffmpeg-core.wasm", "self-hosted") ||
      await tryLoad(
        "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
        "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
        "unpkg CDN"
      );

    if (ok) {
      ffmpegInstance = ffmpeg;
      return true;
    }

    loadPromise = null;
    return false;
  })();

  return loadPromise.then(ok => ok ? ffmpegInstance : null);
}

export async function convertWebmToMp4(
  webmBlob: Blob,
  onProgress?: (ratio: number) => void
): Promise<Blob | null> {
  const ffmpeg = await getFFmpeg();
  if (!ffmpeg) return null;

  const progressHandler = onProgress
    ? ({ progress }: { progress: number }) => { onProgress(Math.min(progress, 1)); }
    : null;

  try {
    const inputData = await fetchFile(webmBlob);
    await ffmpeg.writeFile("input.webm", inputData);

    if (progressHandler) {
      ffmpeg.on("progress", progressHandler);
    }

    console.log(`[ClientFFmpeg] Starting conversion (${Math.round(webmBlob.size / 1024)}KB)`);
    const startTime = Date.now();

    await ffmpeg.exec([
      "-i", "input.webm",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y",
      "output.mp4",
    ]);

    const data = await ffmpeg.readFile("output.mp4");
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[ClientFFmpeg] Conversion complete in ${elapsed}s (${Math.round((data as Uint8Array).length / 1024)}KB)`);

    return new Blob([data], { type: "video/mp4" });
  } catch (err: any) {
    console.warn("[ClientFFmpeg] Conversion failed:", err?.message);
    return null;
  } finally {
    if (progressHandler) {
      ffmpeg.off("progress", progressHandler);
    }
    try { await ffmpeg.deleteFile("input.webm"); } catch {}
    try { await ffmpeg.deleteFile("output.mp4"); } catch {}
  }
}
