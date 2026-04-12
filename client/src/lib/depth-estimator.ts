import { pipeline, env, type DepthEstimationPipeline } from "@huggingface/transformers";

env.allowLocalModels = false;

let depthPipeline: DepthEstimationPipeline | null = null;
let loadingPromise: Promise<DepthEstimationPipeline> | null = null;

export async function getDepthPipeline(
  onProgress?: (progress: number) => void
): Promise<DepthEstimationPipeline> {
  if (depthPipeline) return depthPipeline;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const pipe = await pipeline("depth-estimation", "onnx-community/depth-anything-v2-small", {
      device: "webgpu" in navigator ? "webgpu" : "wasm",
      progress_callback: (data: any) => {
        if (data.status === "progress" && data.progress && onProgress) {
          onProgress(data.progress);
        }
      },
    }) as DepthEstimationPipeline;
    depthPipeline = pipe;
    return pipe;
  })();

  return loadingPromise;
}

export interface DepthMapResult {
  depthCanvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export async function estimateDepth(
  imageDataUrl: string,
  targetSize: number = 384
): Promise<DepthMapResult> {
  const pipe = await getDepthPipeline();

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });

  const result = await pipe(img);

  const depthData = result.depth;
  const depthCanvas = document.createElement("canvas");
  const w = (depthData as any).width || img.width;
  const h = (depthData as any).height || img.height;
  depthCanvas.width = w;
  depthCanvas.height = h;

  if (typeof (depthData as any).toCanvas === "function") {
    const srcCanvas = (depthData as any).toCanvas();
    const ctx = depthCanvas.getContext("2d")!;
    ctx.drawImage(srcCanvas, 0, 0, w, h);
  } else if ((depthData as any).data) {
    const ctx = depthCanvas.getContext("2d")!;
    const rawData = (depthData as any).data;
    const imageData = ctx.createImageData(w, h);

    let min = Infinity, max = -Infinity;
    for (let i = 0; i < rawData.length; i++) {
      if (rawData[i] < min) min = rawData[i];
      if (rawData[i] > max) max = rawData[i];
    }
    const range = max - min || 1;

    for (let i = 0; i < rawData.length; i++) {
      const normalized = ((rawData[i] - min) / range) * 255;
      imageData.data[i * 4] = normalized;
      imageData.data[i * 4 + 1] = normalized;
      imageData.data[i * 4 + 2] = normalized;
      imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return { depthCanvas, width: w, height: h };
}

export function depthCanvasToDataUrl(depthCanvas: HTMLCanvasElement): string {
  return depthCanvas.toDataURL("image/png");
}

export function isDepthModelLoaded(): boolean {
  return depthPipeline !== null;
}
