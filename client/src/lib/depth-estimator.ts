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
      const maxDim = 518;
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

function gaussianBlur(data: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data.length);
  const kernel: number[] = [];
  const sigma = radius / 2;
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const val = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(val);
    sum += val;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  const temp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(Math.max(x + k, 0), w - 1);
        val += data[(y * w + sx) * 4] * kernel[k + radius];
      }
      temp[y * w + x] = val;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(Math.max(y + k, 0), h - 1);
        val += temp[sy * w + x] * kernel[k + radius];
      }
      const idx = (y * w + x) * 4;
      const clamped = Math.min(255, Math.max(0, Math.round(val)));
      result[idx] = clamped;
      result[idx + 1] = clamped;
      result[idx + 2] = clamped;
      result[idx + 3] = 255;
    }
  }

  return result;
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

  const blurRadius = Math.max(3, Math.round(Math.min(w, h) * 0.008));
  const blurred = gaussianBlur(imageData.data, w, h, blurRadius);
  const blurredImageData = new ImageData(blurred, w, h);
  ctx.putImageData(blurredImageData, 0, 0);

  return { depthCanvas, width: w, height: h };
}

export function depthCanvasToDataUrl(depthCanvas: HTMLCanvasElement): string {
  return depthCanvas.toDataURL("image/png");
}

export function isDepthModelLoaded(): boolean {
  return depthPipeline !== null;
}
