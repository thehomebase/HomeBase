import { pipeline, env, RawImage } from "@huggingface/transformers";

env.allowLocalModels = false;

let depthPipeline: any = null;
let loadingPromise: Promise<any> | null = null;

export async function getDepthPipeline(
  onProgress?: (progress: number) => void
): Promise<any> {
  if (depthPipeline) return depthPipeline;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const pipe = await pipeline("depth-estimation", "onnx-community/depth-anything-v2-small", {
        device: "wasm",
        progress_callback: (data: any) => {
          if (data.status === "progress" && data.progress && onProgress) {
            onProgress(data.progress);
          }
        },
      });
      depthPipeline = pipe;
      return pipe;
    } catch (err) {
      loadingPromise = null;
      throw err;
    }
  })();

  return loadingPromise;
}

export interface DepthMapResult {
  depthCanvas: HTMLCanvasElement;
  width: number;
  height: number;
}

function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 512;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Failed to load image for depth estimation"));
    img.src = dataUrl;
  });
}

export async function estimateDepth(
  imageDataUrl: string
): Promise<DepthMapResult> {
  const pipe = await getDepthPipeline();

  const canvas = await dataUrlToCanvas(imageDataUrl);

  const rawImage = RawImage.fromCanvas(canvas);

  const result = await pipe(rawImage);

  const depthImage = result.depth;
  const w = depthImage.width;
  const h = depthImage.height;
  const channels = depthImage.channels || 1;
  const rawData = depthImage.data;

  const depthCanvas = document.createElement("canvas");
  depthCanvas.width = w;
  depthCanvas.height = h;
  const ctx = depthCanvas.getContext("2d")!;
  const imageData = ctx.createImageData(w, h);

  for (let i = 0; i < w * h; i++) {
    const val = channels === 1 ? rawData[i] : rawData[i * channels];
    imageData.data[i * 4] = val;
    imageData.data[i * 4 + 1] = val;
    imageData.data[i * 4 + 2] = val;
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  return { depthCanvas, width: w, height: h };
}

export function depthCanvasToDataUrl(depthCanvas: HTMLCanvasElement): string {
  return depthCanvas.toDataURL("image/png");
}

export function isDepthModelLoaded(): boolean {
  return depthPipeline !== null;
}
