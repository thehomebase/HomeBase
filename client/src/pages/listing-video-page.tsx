import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { estimateDepth, depthCanvasToDataUrl, getDepthPipeline, isDepthModelLoaded } from "@/lib/depth-estimator";
import { ParallaxRenderer } from "@/lib/three-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload, Video, Sparkles, Play, Download, Trash2, GripVertical,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ZoomIn, ZoomOut,
  Music, Type, Image, Settings, Plus, X, Loader2, Eye, Layers, Box
} from "lucide-react";

interface DepthZone {
  region: "foreground" | "midground" | "background";
  yStart: number;
  yEnd: number;
  depthFactor: number;
}

interface PhotoItem {
  id: string;
  filename: string;
  mimeType: string;
  dataUrl: string;
  order: number;
  motionType: string;
  caption: string;
  roomType?: string;
  focusPoint?: { x: number; y: number };
  depthZones?: DepthZone[];
  depthMapUrl?: string;
  videoClipUrl?: string;
}

interface VideoSettings {
  aspectRatio: string;
  musicTrack: string;
  transitionDuration: number;
  photoDuration: number;
  showCaptions: boolean;
  brandingPosition: string;
  transitionStyle: string;
}

interface PropertyDetails {
  price?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  description?: string;
}

const MOTION_TYPES = [
  { value: "walk-forward", label: "Walk Forward", icon: ZoomIn },
  { value: "walk-right", label: "Walk Right", icon: ArrowRight },
  { value: "walk-left", label: "Walk Left", icon: ArrowLeft },
  { value: "reveal", label: "Reveal Room", icon: ZoomOut },
  { value: "drift-right", label: "Drift Right", icon: ArrowRight },
  { value: "drift-left", label: "Drift Left", icon: ArrowLeft },
  { value: "push-in", label: "Push In", icon: ZoomIn },
  { value: "pull-out", label: "Pull Out", icon: ZoomOut },
  { value: "rise-up", label: "Rise Up", icon: ArrowUp },
  { value: "pan-right", label: "Pan Right", icon: ArrowRight },
  { value: "pan-left", label: "Pan Left", icon: ArrowLeft },
  { value: "zoom-in", label: "Zoom In", icon: ZoomIn },
];

const MUSIC_TRACKS = [
  { value: "none", label: "No Music" },
  { value: "elegant", label: "Elegant Piano" },
  { value: "modern", label: "Modern Ambient" },
  { value: "upbeat", label: "Upbeat & Bright" },
  { value: "cinematic", label: "Cinematic" },
  { value: "acoustic", label: "Acoustic Guitar" },
];

const ASPECT_RATIOS: Record<string, { width: number; height: number; label: string }> = {
  "16:9": { width: 1920, height: 1080, label: "Landscape (16:9)" },
  "9:16": { width: 1080, height: 1920, label: "Portrait / Reels (9:16)" },
  "1:1": { width: 1080, height: 1080, label: "Square (1:1)" },
};

function VideoComposer({
  photos,
  settings,
  propertyDetails,
  propertyAddress,
  user,
  onExportStart,
  onExportEnd,
}: {
  photos: PhotoItem[];
  settings: VideoSettings;
  propertyDetails: PropertyDetails;
  propertyAddress: string;
  user: any;
  onExportStart?: () => void;
  onExportEnd?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeRendererRef = useRef<ParallaxRenderer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const currentThreePhotoRef = useRef<string | null>(null);

  const aspectRatio = ASPECT_RATIOS[settings.aspectRatio] || ASPECT_RATIOS["16:9"];
  const displayWidth = settings.aspectRatio === "9:16" ? 270 : settings.aspectRatio === "1:1" ? 400 : 480;
  const displayHeight = Math.round(displayWidth * (aspectRatio.height / aspectRatio.width));

  const hasDepthMaps = photos.some(p => p.depthMapUrl);
  const hasVideoClips = photos.some(p => p.videoClipUrl);
  const use3D = hasDepthMaps && !hasVideoClips;
  const useVideoClips = hasVideoClips;

  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    photos.forEach(photo => {
      if (!loadedImagesRef.current.has(photo.id) && photo.dataUrl) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = photo.dataUrl;
        img.onload = () => {
          loadedImagesRef.current.set(photo.id, img);
          if (!isPlaying) drawFrame(0, 0);
        };
      }
      if (photo.videoClipUrl) {
        const existing = videoElementsRef.current.get(photo.id);
        if (!existing || existing.src !== photo.videoClipUrl) {
          const video = document.createElement("video");
          video.crossOrigin = "anonymous";
          video.src = photo.videoClipUrl;
          video.muted = true;
          video.playsInline = true;
          video.preload = "auto";
          video.load();
          videoElementsRef.current.set(photo.id, video);
        }
      }
    });
  }, [photos]);

  const getMotionTransform = (motionType: string, progress: number, focusPoint?: { x: number; y: number }) => {
    const fp = focusPoint || { x: 50, y: 50 };
    const ease = progress * progress * (3 - 2 * progress);
    const fpX = fp.x / 100;
    const fpY = fp.y / 100;

    switch (motionType) {
      case "walk-forward":
        return { scale: 1.15 + ease * 0.45, x: (fpX - 0.5) * ease * 0.15, y: (fpY - 0.5) * ease * 0.1, originX: fpX, originY: fpY, rotY: ease * 1.5 * (fpX > 0.5 ? -1 : 1), rotX: ease * 0.8 };
      case "walk-right":
        return { scale: 1.2 + ease * 0.25, x: ease * 0.18, y: ease * 0.02, originX: 0.3, originY: fpY, rotY: -ease * 2.5, rotX: ease * 0.4 };
      case "walk-left":
        return { scale: 1.2 + ease * 0.25, x: -ease * 0.18, y: ease * 0.02, originX: 0.7, originY: fpY, rotY: ease * 2.5, rotX: ease * 0.4 };
      case "reveal":
        return { scale: 1.55 - ease * 0.35, x: (0.5 - fpX) * ease * 0.1, y: (0.5 - fpY) * ease * 0.08, originX: fpX, originY: fpY, rotY: ease * 1.2 * (fpX > 0.5 ? 1 : -1), rotX: -ease * 0.6 };
      case "drift-right":
        return { scale: 1.3 + ease * 0.12, x: ease * 0.12, y: Math.sin(ease * Math.PI) * 0.02, originX: 0.4, originY: fpY, rotY: -ease * 1.8, rotX: Math.sin(ease * Math.PI) * 0.5 };
      case "drift-left":
        return { scale: 1.3 + ease * 0.12, x: -ease * 0.12, y: Math.sin(ease * Math.PI) * 0.02, originX: 0.6, originY: fpY, rotY: ease * 1.8, rotX: Math.sin(ease * Math.PI) * 0.5 };
      case "push-in":
        return { scale: 1.1 + ease * 0.55, x: (fpX - 0.5) * ease * 0.2, y: (fpY - 0.5) * ease * 0.15, originX: fpX, originY: fpY, rotY: (fpX - 0.5) * ease * -3, rotX: (fpY - 0.5) * ease * 2 };
      case "pull-out":
        return { scale: 1.65 - ease * 0.4, x: 0, y: -ease * 0.03, originX: 0.5, originY: 0.45, rotY: 0, rotX: -ease * 1.2 };
      case "rise-up":
        return { scale: 1.25 + ease * 0.2, x: 0, y: -ease * 0.12, originX: 0.5, originY: 0.6, rotY: 0, rotX: ease * 2 };
      case "pan-right":
        return { scale: 1.3, x: ease * 0.22, y: 0, originX: 0.5, originY: fpY, rotY: -ease * 2, rotX: 0 };
      case "pan-left":
        return { scale: 1.3, x: -ease * 0.22, y: 0, originX: 0.5, originY: fpY, rotY: ease * 2, rotX: 0 };
      case "zoom-in":
        return { scale: 1.0 + ease * 0.5, x: (fpX - 0.5) * ease * 0.12, y: (fpY - 0.5) * ease * 0.08, originX: fpX, originY: fpY, rotY: (fpX - 0.5) * ease * -2, rotX: (fpY - 0.5) * ease * 1.5 };
      case "zoom-out":
        return { scale: 1.55 - ease * 0.3, x: 0, y: 0, originX: fpX, originY: fpY, rotY: 0, rotX: 0 };
      case "pan-up":
        return { scale: 1.3, x: 0, y: -ease * 0.15, originX: 0.5, originY: 0.5, rotY: 0, rotX: ease * 1.5 };
      case "pan-down":
        return { scale: 1.3, x: 0, y: ease * 0.15, originX: 0.5, originY: 0.5, rotY: 0, rotX: -ease * 1.5 };
      default:
        return { scale: 1.15 + ease * 0.4, x: ease * 0.1, y: ease * 0.02, originX: 0.5, originY: 0.5, rotY: -ease * 1.5, rotX: ease * 0.5 };
    }
  };

  const computeImageLayout = (img: HTMLImageElement, w: number, h: number, scale: number) => {
    const imgAspect = img.width / img.height;
    const canvasAspect = w / h;
    let drawW: number, drawH: number;
    if (imgAspect > canvasAspect) {
      drawH = h * scale;
      drawW = drawH * imgAspect;
    } else {
      drawW = w * scale;
      drawH = drawW / imgAspect;
    }
    return { drawW, drawH };
  };

  const clampDraw = (drawX: number, drawY: number, drawW: number, drawH: number, w: number, h: number) => {
    const maxOffsetX = drawW - w;
    const maxOffsetY = drawH - h;
    return {
      x: Math.min(0, Math.max(-maxOffsetX, drawX)),
      y: Math.min(0, Math.max(-maxOffsetY, drawY)),
    };
  };

  const getDepthZones = (photo: PhotoItem): DepthZone[] => {
    if (photo.depthZones && photo.depthZones.length > 0) return photo.depthZones;
    const isExterior = photo.roomType?.includes("exterior") || photo.roomType?.includes("backyard") || photo.roomType?.includes("pool") || photo.roomType?.includes("front");
    if (isExterior) {
      return [
        { region: "background", yStart: 0, yEnd: 45, depthFactor: 0.3 },
        { region: "midground", yStart: 30, yEnd: 75, depthFactor: 0.7 },
        { region: "foreground", yStart: 60, yEnd: 100, depthFactor: 1.6 },
      ];
    }
    return [
      { region: "background", yStart: 0, yEnd: 40, depthFactor: 0.35 },
      { region: "midground", yStart: 25, yEnd: 80, depthFactor: 0.75 },
      { region: "foreground", yStart: 65, yEnd: 100, depthFactor: 1.5 },
    ];
  };

  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<HTMLCanvasElement | null>(null);

  const getOffscreen = (w: number, h: number) => {
    if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
    if (offscreenRef.current.width !== w || offscreenRef.current.height !== h) {
      offscreenRef.current.width = w;
      offscreenRef.current.height = h;
    }
    return offscreenRef.current;
  };

  const getLayerCanvas = (w: number, h: number) => {
    if (!layerRef.current) layerRef.current = document.createElement("canvas");
    if (layerRef.current.width !== w || layerRef.current.height !== h) {
      layerRef.current.width = w;
      layerRef.current.height = h;
    }
    return layerRef.current;
  };

  const drawImageWithMotion = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
    motionType: string,
    motionProgress: number,
    alpha: number,
    focusPoint?: { x: number; y: number },
    photo?: PhotoItem
  ) => {
    const transform = getMotionTransform(motionType, motionProgress, focusPoint);
    const { drawW, drawH } = computeImageLayout(img, w, h, transform.scale);

    const pivotX = w * transform.originX;
    const pivotY = h * transform.originY;
    const imgPivotX = drawW * transform.originX;
    const imgPivotY = drawH * transform.originY;
    const baseDrawX = pivotX - imgPivotX + transform.x * w;
    const baseDrawY = pivotY - imgPivotY + transform.y * h;

    const depthZones = photo ? getDepthZones(photo) : [];
    const hasMotion = Math.abs(transform.x) > 0.002 || Math.abs(transform.y) > 0.002 || transform.scale > 1.15;
    const hasParallax = depthZones.length > 0 && hasMotion;

    const rotY = (transform as any).rotY || 0;
    const rotX = (transform as any).rotX || 0;
    const hasPerspective = Math.abs(rotY) > 0.1 || Math.abs(rotX) > 0.1;

    const applyPerspective = (targetCtx: CanvasRenderingContext2D, cw: number, ch: number) => {
      if (!hasPerspective) return;
      const radY = (rotY * Math.PI) / 180;
      const radX = (rotX * Math.PI) / 180;
      const perspective = 800;
      const skewX = Math.sin(radY) * (perspective / (perspective + cw * 0.5));
      const skewY = Math.sin(radX) * (perspective / (perspective + ch * 0.5));
      const scaleAdjX = Math.cos(radY);
      const scaleAdjY = Math.cos(radX);
      targetCtx.translate(cw / 2, ch / 2);
      targetCtx.transform(scaleAdjX, skewY * 0.3, skewX * 0.3, scaleAdjY, 0, 0);
      targetCtx.translate(-cw / 2, -ch / 2);
    };

    if (!hasParallax) {
      ctx.save();
      ctx.globalAlpha = alpha;
      applyPerspective(ctx, w, h);
      const clamped = clampDraw(baseDrawX, baseDrawY, drawW, drawH, w, h);
      ctx.drawImage(img, clamped.x, clamped.y, drawW, drawH);
      ctx.restore();
      return;
    }

    try {
    const offscreen = getOffscreen(w, h);
    const oCtx = offscreen.getContext("2d")!;
    oCtx.clearRect(0, 0, w, h);

    const baseClamped = clampDraw(baseDrawX, baseDrawY, drawW, drawH, w, h);
    oCtx.drawImage(img, baseClamped.x, baseClamped.y, drawW, drawH);

    const layerCanvas = getLayerCanvas(w, h);
    const lCtx = layerCanvas.getContext("2d")!;

    for (const zone of depthZones) {
      if (Math.abs(zone.depthFactor - 1) < 0.05) continue;

      const zoneYStart = Math.min(zone.yStart, zone.yEnd);
      const zoneYEnd = Math.max(zone.yStart, zone.yEnd);
      if (zoneYEnd - zoneYStart < 2) continue;

      const scaleExtra = (transform.scale - 1) * (zone.depthFactor - 1) * 0.15;
      const layerScale = transform.scale + scaleExtra;
      const { drawW: lDrawW, drawH: lDrawH } = computeImageLayout(img, w, h, layerScale);

      const extraX = transform.x * w * (zone.depthFactor - 1);
      const extraY = transform.y * h * (zone.depthFactor - 1);
      const lPivotX = w * transform.originX;
      const lPivotY = h * transform.originY;
      const layerX = lPivotX - lDrawW * transform.originX + transform.x * w + extraX;
      const layerY = lPivotY - lDrawH * transform.originY + transform.y * h + extraY;
      const clamped = clampDraw(layerX, layerY, lDrawW, lDrawH, w, h);

      lCtx.clearRect(0, 0, w, h);

      const yTop = h * (zoneYStart / 100);
      const yBot = h * (zoneYEnd / 100);
      const feather = h * 0.1;
      const gradTop = Math.max(0, yTop - feather);
      const gradBot = Math.min(h, yBot + feather);
      const range = gradBot - gradTop;
      if (range < 1) continue;

      const grad = lCtx.createLinearGradient(0, gradTop, 0, gradBot);
      const featherRatio = Math.min(0.45, feather / range);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(featherRatio, "rgba(0,0,0,1)");
      grad.addColorStop(1 - featherRatio, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");

      lCtx.fillStyle = grad;
      lCtx.fillRect(0, gradTop, w, range);
      lCtx.globalCompositeOperation = "source-in";
      lCtx.drawImage(img, clamped.x, clamped.y, lDrawW, lDrawH);
      lCtx.globalCompositeOperation = "source-over";

      oCtx.drawImage(layerCanvas, 0, 0);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    applyPerspective(ctx, w, h);
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
    } catch {
      ctx.save();
      ctx.globalAlpha = alpha;
      const clamped = clampDraw(baseDrawX, baseDrawY, drawW, drawH, w, h);
      ctx.drawImage(img, clamped.x, clamped.y, drawW, drawH);
      ctx.restore();
    }
  };

  const drawCaptionOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    caption: string,
    photoProgress: number
  ) => {
    if (!caption || !settings.showCaptions) return;

    const fadeIn = Math.min(1, photoProgress * 5);
    const fadeOut = Math.min(1, (1 - photoProgress) * 5);
    const alpha = Math.min(fadeIn, fadeOut);

    ctx.save();
    ctx.globalAlpha = alpha;

    const fontSize = Math.max(14, w * 0.032);
    ctx.font = `500 ${fontSize}px "Inter", system-ui, sans-serif`;
    const metrics = ctx.measureText(caption);
    const textW = metrics.width;
    const padding = fontSize * 0.8;
    const boxW = textW + padding * 2;
    const boxH = fontSize * 2.2;
    const boxX = (w - boxW) / 2;
    const boxY = h - boxH - h * 0.08;

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    const radius = boxH / 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, radius);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(caption, w / 2, boxY + boxH / 2);
    ctx.restore();
  };

  const drawBrandingOverlay = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!user) return;
    ctx.save();
    ctx.globalAlpha = 0.85;

    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const phone = user.profilePhone || "";
    if (!name) { ctx.restore(); return; }

    const fontSize = Math.max(11, w * 0.025);
    ctx.font = `600 ${fontSize}px "Inter", system-ui, sans-serif`;
    const nameW = ctx.measureText(name).width;
    ctx.font = `400 ${fontSize * 0.8}px "Inter", system-ui, sans-serif`;
    const phoneW = phone ? ctx.measureText(phone).width : 0;
    const maxTextW = Math.max(nameW, phoneW);

    const padding = fontSize * 0.6;
    const boxW = maxTextW + padding * 2;
    const boxH = phone ? fontSize * 3 : fontSize * 2;
    const margin = w * 0.03;

    let boxX: number, boxY: number;
    switch (settings.brandingPosition) {
      case "top-left": boxX = margin; boxY = margin; break;
      case "top-right": boxX = w - boxW - margin; boxY = margin; break;
      case "bottom-left": boxX = margin; boxY = h - boxH - margin; break;
      default: boxX = w - boxW - margin; boxY = h - boxH - margin;
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.font = `600 ${fontSize}px "Inter", system-ui, sans-serif`;
    ctx.fillText(name, boxX + padding, boxY + padding + fontSize * 0.4);
    if (phone) {
      ctx.font = `400 ${fontSize * 0.8}px "Inter", system-ui, sans-serif`;
      ctx.fillText(phone, boxX + padding, boxY + padding + fontSize * 1.4);
    }
    ctx.restore();
  };

  const drawPropertyInfo = (ctx: CanvasRenderingContext2D, w: number, h: number, globalProgress: number) => {
    if (!propertyAddress && !propertyDetails.price) return;
    if (globalProgress > 0.15) return;

    const alpha = globalProgress < 0.02 ? globalProgress / 0.02 : globalProgress > 0.12 ? (0.15 - globalProgress) / 0.03 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;

    const fontSize = Math.max(16, w * 0.04);
    const padding = fontSize;
    const lineHeight = fontSize * 1.5;
    let lines: string[] = [];
    if (propertyAddress) lines.push(propertyAddress);
    const details: string[] = [];
    if (propertyDetails.price) details.push(propertyDetails.price);
    if (propertyDetails.beds) details.push(`${propertyDetails.beds} Bed`);
    if (propertyDetails.baths) details.push(`${propertyDetails.baths} Bath`);
    if (propertyDetails.sqft) details.push(`${propertyDetails.sqft} Sq Ft`);
    if (details.length > 0) lines.push(details.join(" • "));

    const boxH = padding * 2 + lines.length * lineHeight;
    const boxY = (h - boxH) / 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, boxY, w, boxH);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, i) => {
      ctx.font = i === 0 ? `700 ${fontSize}px "Inter", system-ui, sans-serif` : `400 ${fontSize * 0.75}px "Inter", system-ui, sans-serif`;
      ctx.fillText(line, w / 2, boxY + padding + i * lineHeight + lineHeight / 2);
    });
    ctx.restore();
  };

  const threeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const ensureThreeCanvas = useCallback((w: number, h: number) => {
    if (!threeCanvasRef.current) {
      threeCanvasRef.current = document.createElement("canvas");
    }
    const tc = threeCanvasRef.current;
    if (tc.width !== w || tc.height !== h) {
      tc.width = w;
      tc.height = h;
    }
    return tc;
  }, []);

  const threePhotoLoadingRef = useRef<Promise<void> | null>(null);

  const loadThreePhoto = useCallback((photoId: string, dataUrl: string, depthMapUrl: string | null, w: number, h: number) => {
    const threeCanvas = ensureThreeCanvas(w, h);
    if (!threeRendererRef.current) {
      threeRendererRef.current = new ParallaxRenderer(threeCanvas, w, h);
    }
    threePhotoLoadingRef.current = threeRendererRef.current.setPhoto(dataUrl, depthMapUrl).then(() => {
      currentThreePhotoRef.current = photoId;
    }).catch((err) => {
      console.error("Three.js photo load failed:", err);
    }).finally(() => {
      threePhotoLoadingRef.current = null;
    });
    return threePhotoLoadingRef.current;
  }, [ensureThreeCanvas]);

  const drawFrame3D = useCallback((photoIdx: number, photoProgress: number, globalProgress: number = 0) => {
    const canvas = canvasRef.current;
    if (!canvas || photos.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentPhoto = photos[photoIdx];
    if (!currentPhoto?.dataUrl) return;

    const w = canvas.width;
    const h = canvas.height;

    if (currentThreePhotoRef.current !== currentPhoto.id && !threePhotoLoadingRef.current) {
      loadThreePhoto(currentPhoto.id, currentPhoto.dataUrl, currentPhoto.depthMapUrl || null, w, h);
    }

    if (threeRendererRef.current && currentThreePhotoRef.current === currentPhoto.id) {
      threeRendererRef.current.setCameraForMotion(currentPhoto.motionType, photoProgress, currentPhoto.focusPoint);
      threeRendererRef.current.render();

      const threeCanvas = threeCanvasRef.current;
      if (threeCanvas) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(threeCanvas, 0, 0, w, h);
      }
    } else {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);
      const img = loadedImagesRef.current.get(currentPhoto.id);
      if (img) {
        const imgAspect = img.width / img.height;
        const canvAspect = w / h;
        let dw = w, dh = h, dx = 0, dy = 0;
        if (imgAspect > canvAspect) {
          dh = h;
          dw = h * imgAspect;
          dx = (w - dw) / 2;
        } else {
          dw = w;
          dh = w / imgAspect;
          dy = (h - dh) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    }

    if (currentPhoto.caption && settings.showCaptions) {
      drawCaptionOverlay(ctx, w, h, currentPhoto.caption, photoProgress);
    }
    drawPropertyInfo(ctx, w, h, globalProgress);
    drawBrandingOverlay(ctx, w, h);
  }, [photos, settings, ensureThreeCanvas, loadThreePhoto]);

  const drawFrameVideoClip = useCallback((photoIdx: number, photoProgress: number, globalProgress: number = 0) => {
    const canvas = canvasRef.current;
    if (!canvas || photos.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    const currentPhoto = photos[photoIdx];
    if (!currentPhoto) return;

    const video = videoElementsRef.current.get(currentPhoto.id);
    const fallbackImg = loadedImagesRef.current.get(currentPhoto.id);

    const transRatio = settings.transitionDuration / (settings.photoDuration + settings.transitionDuration);
    const isTransitioning = photoProgress > (1 - transRatio);
    const transProgress = isTransitioning ? (photoProgress - (1 - transRatio)) / transRatio : 0;
    const transEase = transProgress * transProgress * (3 - 2 * transProgress);

    const drawVideoOrImage = (source: HTMLVideoElement | HTMLImageElement | undefined, alpha: number) => {
      if (!source) return;
      const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
      const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
      if (!sw || !sh) return;

      const srcAspect = sw / sh;
      const canvAspect = w / h;
      let dw = w, dh = h, dx = 0, dy = 0;
      if (srcAspect > canvAspect) {
        dh = h;
        dw = h * srcAspect;
        dx = (w - dw) / 2;
      } else {
        dw = w;
        dh = w / srcAspect;
        dy = (h - dh) / 2;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      try {
        ctx.drawImage(source, dx, dy, dw, dh);
      } catch (e) {
      }
      ctx.restore();
    };

    if (video && video.readyState >= 2 && video.duration > 0) {
      const motionProgress = Math.min(photoProgress / (1 - transRatio), 1);
      const targetTime = motionProgress * video.duration;
      if (Math.abs(video.currentTime - targetTime) > 0.05) {
        video.currentTime = targetTime;
      }
      const alpha = isTransitioning ? 1 - transEase : 1;
      drawVideoOrImage(video, alpha);
    } else if (fallbackImg) {
      const alpha = isTransitioning ? 1 - transEase : 1;
      drawVideoOrImage(fallbackImg, alpha);
    }

    if (isTransitioning) {
      const nextIdx = (photoIdx + 1) % photos.length;
      const nextPhoto = photos[nextIdx];
      const nextVideo = videoElementsRef.current.get(nextPhoto?.id);
      const nextImg = loadedImagesRef.current.get(nextPhoto?.id);

      if (nextVideo && nextVideo.readyState >= 2 && nextVideo.duration > 0) {
        nextVideo.currentTime = transEase * 0.08 * nextVideo.duration;
        drawVideoOrImage(nextVideo, transEase);
      } else if (nextImg) {
        drawVideoOrImage(nextImg, transEase);
      }
    }

    if (currentPhoto.caption && settings.showCaptions) {
      drawCaptionOverlay(ctx, w, h, currentPhoto.caption, photoProgress);
    }
    drawPropertyInfo(ctx, w, h, globalProgress);
    drawBrandingOverlay(ctx, w, h);
  }, [photos, settings, propertyAddress, propertyDetails, user]);

  const drawFrame = useCallback((photoIdx: number, photoProgress: number, globalProgress: number = 0) => {
    const canvas = canvasRef.current;
    if (!canvas || photos.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentPhoto = photos[photoIdx];
    const hasClip = currentPhoto?.videoClipUrl && videoElementsRef.current.has(currentPhoto.id);

    if (hasClip) {
      drawFrameVideoClip(photoIdx, photoProgress, globalProgress);
      return;
    }

    if (use3D && currentPhoto?.depthMapUrl) {
      drawFrame3D(photoIdx, photoProgress, globalProgress);
      return;
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    const currentImg = loadedImagesRef.current.get(currentPhoto?.id);

    const transRatio = settings.transitionDuration / (settings.photoDuration + settings.transitionDuration);
    const isTransitioning = photoProgress > (1 - transRatio);
    const transProgress = isTransitioning ? (photoProgress - (1 - transRatio)) / transRatio : 0;

    const transEase = transProgress * transProgress * (3 - 2 * transProgress);

    if (currentImg) {
      if (isTransitioning && settings.transitionStyle === "cinematic") {
        const outScale = 1 + transEase * 0.15;
        const outAlpha = 1 - transEase;
        ctx.save();
        ctx.globalAlpha = outAlpha;
        ctx.translate(w / 2, h / 2);
        ctx.scale(outScale, outScale);
        ctx.translate(-w / 2, -h / 2);
        drawImageWithMotion(ctx, currentImg, w, h, currentPhoto.motionType, photoProgress, 1, currentPhoto.focusPoint, currentPhoto);
        ctx.restore();
      } else {
        const alpha = isTransitioning ? 1 - transEase : 1;
        drawImageWithMotion(ctx, currentImg, w, h, currentPhoto.motionType, photoProgress, alpha, currentPhoto.focusPoint, currentPhoto);
      }
    }

    if (isTransitioning) {
      const nextIdx = (photoIdx + 1) % photos.length;
      const nextPhoto = photos[nextIdx];
      const nextImg = loadedImagesRef.current.get(nextPhoto?.id);
      if (nextImg) {
        if (settings.transitionStyle === "cinematic") {
          const inScale = 1.12 - transEase * 0.12;
          ctx.save();
          ctx.globalAlpha = transEase;
          ctx.translate(w / 2, h / 2);
          ctx.scale(inScale, inScale);
          ctx.translate(-w / 2, -h / 2);
          drawImageWithMotion(ctx, nextImg, w, h, nextPhoto.motionType, transEase * 0.08, 1, nextPhoto.focusPoint, nextPhoto);
          ctx.restore();
        } else {
          drawImageWithMotion(ctx, nextImg, w, h, nextPhoto.motionType, transEase * 0.1, transEase, nextPhoto.focusPoint, nextPhoto);
        }
      }
    }

    if (currentPhoto) {
      drawCaptionOverlay(ctx, w, h, currentPhoto.caption, photoProgress);
    }
    drawPropertyInfo(ctx, w, h, globalProgress);
    drawBrandingOverlay(ctx, w, h);
  }, [photos, settings, propertyAddress, propertyDetails, user, use3D, useVideoClips, drawFrame3D, drawFrameVideoClip]);

  const playPreview = useCallback(() => {
    if (photos.length === 0) return;
    setIsPlaying(true);

    const totalDuration = photos.length * (settings.photoDuration + settings.transitionDuration);
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      const globalProgress = elapsed / totalDuration;

      if (globalProgress >= 1) {
        setIsPlaying(false);
        setCurrentPhotoIndex(0);
        setProgress(0);
        drawFrame(0, 0, 0);
        return;
      }

      setProgress(globalProgress);
      const segmentDuration = settings.photoDuration + settings.transitionDuration;
      const photoIdx = Math.min(Math.floor(elapsed / segmentDuration), photos.length - 1);
      const photoProgress = (elapsed - photoIdx * segmentDuration) / segmentDuration;

      setCurrentPhotoIndex(photoIdx);
      drawFrame(photoIdx, Math.min(photoProgress, 1), globalProgress);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [photos, settings, drawFrame]);

  const stopPreview = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsPlaying(false);
  }, []);

  const exportVideo = useCallback(async () => {
    if (photos.length === 0) return;
    setIsExporting(true);
    onExportStart?.();

    try {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = aspectRatio.width;
      exportCanvas.height = aspectRatio.height;
      const exportCtx = exportCanvas.getContext("2d");
      if (!exportCtx) throw new Error("Cannot get canvas context");

      const stream = exportCanvas.captureStream(0);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const exportPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });

      mediaRecorder.start();

      const totalDuration = photos.length * (settings.photoDuration + settings.transitionDuration);
      const fps = 30;
      const totalFrames = Math.ceil(totalDuration * fps);
      const frameDurationMs = 1000 / fps;
      const videoTrack = stream.getVideoTracks()[0];

      const origW = canvasRef.current?.width;
      const origH = canvasRef.current?.height;

      if (canvasRef.current) {
        canvasRef.current.width = aspectRatio.width;
        canvasRef.current.height = aspectRatio.height;
      }
      if (threeRendererRef.current) {
        threeRendererRef.current.resize(aspectRatio.width, aspectRatio.height);
        currentThreePhotoRef.current = null;
      }

      const seekVideo = (video: HTMLVideoElement, time: number): Promise<void> => {
        return new Promise((resolve) => {
          if (Math.abs(video.currentTime - time) < 0.02) { resolve(); return; }
          const onSeeked = () => { video.removeEventListener("seeked", onSeeked); resolve(); };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = time;
          setTimeout(resolve, 200);
        });
      };

      let lastExportPhotoIdx = -1;
      for (let frame = 0; frame < totalFrames; frame++) {
        const elapsed = frame / fps;
        const globalProgress = elapsed / totalDuration;
        const segmentDuration = settings.photoDuration + settings.transitionDuration;
        const photoIdx = Math.min(Math.floor(elapsed / segmentDuration), photos.length - 1);
        const photoProgress = (elapsed - photoIdx * segmentDuration) / segmentDuration;

        const exportPhoto = photos[photoIdx];
        if (exportPhoto?.videoClipUrl) {
          const clipVideo = videoElementsRef.current.get(exportPhoto.id);
          if (clipVideo && clipVideo.readyState >= 2 && clipVideo.duration > 0) {
            const transRatio = settings.transitionDuration / segmentDuration;
            const motionProgress = Math.min(photoProgress / (1 - transRatio), 1);
            await seekVideo(clipVideo, motionProgress * clipVideo.duration);
          }
        }

        if (use3D && exportPhoto?.depthMapUrl && !exportPhoto.videoClipUrl && photoIdx !== lastExportPhotoIdx) {
          if (exportPhoto && currentThreePhotoRef.current !== exportPhoto.id) {
            await loadThreePhoto(exportPhoto.id, exportPhoto.dataUrl, exportPhoto.depthMapUrl || null, aspectRatio.width, aspectRatio.height);
          }
          lastExportPhotoIdx = photoIdx;
        }

        drawFrame(photoIdx, Math.min(photoProgress, 1), globalProgress);

        if (canvasRef.current) {
          exportCtx.clearRect(0, 0, aspectRatio.width, aspectRatio.height);
          exportCtx.drawImage(canvasRef.current, 0, 0, aspectRatio.width, aspectRatio.height);
        }

        if ((videoTrack as any).requestFrame) {
          (videoTrack as any).requestFrame();
        }

        setProgress(globalProgress);
        await new Promise(r => setTimeout(r, frameDurationMs));
      }

      if (canvasRef.current) {
        canvasRef.current.width = origW || displayWidth;
        canvasRef.current.height = origH || displayHeight;
      }
      if (threeRendererRef.current) {
        threeRendererRef.current.resize(origW || displayWidth, origH || displayHeight);
        currentThreePhotoRef.current = null;
      }

      mediaRecorder.stop();
      const blob = await exportPromise;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `listing-video-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      drawFrame(0, 0, 0);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
      setProgress(0);
      onExportEnd?.();
    }
  }, [photos, settings, drawFrame, aspectRatio, displayWidth, displayHeight, use3D, loadThreePhoto]);

  useEffect(() => {
    if (photos.length > 0 && !isPlaying) {
      drawFrame(0, 0, 0);
    }
  }, [photos, settings, drawFrame, isPlaying]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (threeRendererRef.current) {
        threeRendererRef.current.dispose();
        threeRendererRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl" style={{ width: displayWidth, height: displayHeight }}>
        <canvas
          ref={canvasRef}
          width={displayWidth}
          height={displayHeight}
          className="w-full h-full"
        />
        {photos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Video className="h-12 w-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Upload photos to preview</p>
            </div>
          </div>
        )}
      </div>

      {(isPlaying || isExporting) && (
        <div className="w-full max-w-md">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {isExporting ? `Exporting... ${Math.round(progress * 100)}%` : `Photo ${currentPhotoIndex + 1} of ${photos.length}`}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {!isPlaying ? (
          <Button onClick={playPreview} disabled={photos.length === 0 || isExporting} size="sm">
            <Play className="h-4 w-4 mr-1" /> Preview
          </Button>
        ) : (
          <Button onClick={stopPreview} variant="secondary" size="sm">
            Stop
          </Button>
        )}
        <Button onClick={exportVideo} disabled={photos.length === 0 || isPlaying || isExporting} variant="outline" size="sm">
          {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          {isExporting ? "Exporting..." : "Export Video"}
        </Button>
      </div>
    </div>
  );
}

export default function ListingVideoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [title, setTitle] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails>({});
  const [settings, setSettings] = useState<VideoSettings>({
    aspectRatio: "16:9",
    musicTrack: "none",
    transitionDuration: 1.5,
    photoDuration: 5,
    showCaptions: true,
    brandingPosition: "bottom-right",
    transitionStyle: "cinematic",
  });
  const [activeTab, setActiveTab] = useState("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingDepth, setIsGeneratingDepth] = useState(false);
  const [depthProgress, setDepthProgress] = useState({ current: 0, total: 0, modelLoading: false, modelPercent: 0 });
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: savedVideos = [], isLoading: videosLoading } = useQuery<any[]>({
    queryKey: ["/api/listing-videos"],
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/listing-videos", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/listing-videos"] });
      toast({ title: "Photos uploaded!", description: "Your photos are ready for editing." });
      setSelectedVideoId(data.id);
      const videoPhotos = data.photos as PhotoItem[];
      setPhotos(videoPhotos);
      setTitle(data.title);
      setPropertyAddress(data.propertyAddress || "");
      if (data.settings) setSettings(data.settings);
      setActiveTab("photos");
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVideoId) return;
      return apiRequest("PUT", `/api/listing-videos/${selectedVideoId}`, {
        title,
        propertyAddress,
        propertyDetails,
        photos,
        settings,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listing-videos"] });
      toast({ title: "Saved!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/listing-videos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listing-videos"] });
      if (selectedVideoId) {
        setSelectedVideoId(null);
        setPhotos([]);
        setTitle("");
        setPropertyAddress("");
        setPropertyDetails({});
      }
      toast({ title: "Video deleted" });
    },
  });

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (files.length > 15) {
      toast({ title: "Too many photos", description: "Maximum 15 photos allowed. Please select fewer photos.", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append("photos", file));
    formData.append("title", title || "Untitled Video");
    formData.append("propertyAddress", propertyAddress);
    if (Object.keys(propertyDetails).length > 0) {
      formData.append("propertyDetails", JSON.stringify(propertyDetails));
    }
    createMutation.mutate(formData);
  }, [title, propertyAddress, propertyDetails]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const analyzePhotos = async () => {
    if (photos.length === 0) return;
    setIsAnalyzing(true);
    try {
      const res = await apiRequest("POST", "/api/listing-videos/analyze-photos", { photos });
      const data = await res.json();

      if (data.analyses) {
        const updatedPhotos = [...photos];
        data.analyses.forEach((analysis: any) => {
          const photo = updatedPhotos.find(p => p.id === analysis.photoId);
          if (photo) {
            photo.motionType = analysis.motionType;
            photo.caption = analysis.caption;
            photo.roomType = analysis.roomType;
            if (analysis.focusPoint) photo.focusPoint = analysis.focusPoint;
            if (analysis.depthZones && Array.isArray(analysis.depthZones)) photo.depthZones = analysis.depthZones;
          }
        });

        if (data.suggestedOrder && Array.isArray(data.suggestedOrder)) {
          const reordered: PhotoItem[] = [];
          data.suggestedOrder.forEach((id: string, index: number) => {
            const photo = updatedPhotos.find(p => p.id === id);
            if (photo) {
              photo.order = index;
              reordered.push(photo);
            }
          });
          updatedPhotos.filter(p => !reordered.includes(p)).forEach((p, i) => {
            p.order = reordered.length + i;
            reordered.push(p);
          });
          setPhotos(reordered);
        } else {
          setPhotos(updatedPhotos);
        }

        toast({ title: "AI Analysis Complete!", description: "Photos analyzed, ordered, and motion paths set." });
      }
    } catch (error) {
      toast({ title: "Analysis failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateDepthMaps = async () => {
    if (photos.length === 0) return;
    setIsGeneratingDepth(true);
    setDepthProgress({ current: 0, total: photos.length, modelLoading: true, modelPercent: 0 });

    try {
      let useServerApi = true;
      try {
        const testRes = await fetch("/api/listing-videos/generate-depth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imageDataUrl: "data:image/png;base64,iVBORw0KGgo=" }),
        });
        if (testRes.status === 500) {
          const testData = await testRes.json();
          if (testData.error === "Depth generation service not configured") {
            useServerApi = false;
          }
        }
      } catch {
        useServerApi = false;
      }

      if (!useServerApi) {
        await getDepthPipeline((pct: number) => {
          setDepthProgress(prev => ({ ...prev, modelPercent: Math.round(pct) }));
        });
      }
      setDepthProgress(prev => ({ ...prev, modelLoading: false }));

      const updatedPhotos = [...photos];
      for (let i = 0; i < updatedPhotos.length; i++) {
        setDepthProgress(prev => ({ ...prev, current: i + 1 }));
        const photo = updatedPhotos[i];
        if (!photo.dataUrl) continue;

        try {
          if (useServerApi) {
            const res = await fetch("/api/listing-videos/generate-depth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ imageDataUrl: photo.dataUrl }),
            });
            if (!res.ok) throw new Error("Server depth generation failed");
            const data = await res.json();
            photo.depthMapUrl = data.depthDataUrl;
          } else {
            const result = await estimateDepth(photo.dataUrl);
            photo.depthMapUrl = depthCanvasToDataUrl(result.depthCanvas);
          }
        } catch (err) {
          console.error(`Depth estimation failed for photo ${photo.id}:`, err);
        }
      }

      setPhotos(updatedPhotos);
      toast({
        title: "3D Depth Maps Generated!",
        description: `${updatedPhotos.filter(p => p.depthMapUrl).length} of ${updatedPhotos.length} photos processed. Preview now uses real 3D parallax.`,
      });
    } catch (error: any) {
      console.error("Depth generation error:", error);
      toast({
        title: "Depth map generation failed",
        description: error?.message || "Depth generation service unavailable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDepth(false);
      setDepthProgress({ current: 0, total: 0, modelLoading: false, modelPercent: 0 });
    }
  };

  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [gen3DProgress, setGen3DProgress] = useState({ current: 0, total: 0 });
  const [videoQuality, setVideoQuality] = useState<"480p" | "720p">("480p");

  const generate3DVideoClips = async () => {
    if (photos.length === 0) return;
    setIsGenerating3D(true);
    setGen3DProgress({ current: 0, total: photos.length });

    try {
      const updatedPhotos = [...photos];
      for (let i = 0; i < updatedPhotos.length; i++) {
        setGen3DProgress({ current: i + 1, total: updatedPhotos.length });
        const photo = updatedPhotos[i];
        if (!photo.dataUrl) continue;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 480000);
          const res = await fetch("/api/listing-videos/generate-3d-clip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: controller.signal,
            body: JSON.stringify({
              imageDataUrl: photo.dataUrl,
              motionType: photo.motionType || "walk-forward",
              duration: settings.photoDuration,
              quality: videoQuality,
            }),
          });
          clearTimeout(timeout);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Generation failed");
          }
          const data = await res.json();
          photo.videoClipUrl = data.videoUrl;
        } catch (err: any) {
          console.error(`3D clip generation failed for photo ${photo.id}:`, err);
          const msg = err?.name === "AbortError" ? "Timed out (8 min limit)" : (err?.message || "Could not generate 3D clip");
          toast({
            title: `Photo ${i + 1} failed`,
            description: msg,
            variant: "destructive",
          });
        }
      }

      setPhotos(updatedPhotos);
      const successCount = updatedPhotos.filter(p => p.videoClipUrl).length;
      if (successCount > 0) {
        toast({
          title: "3D Video Clips Generated!",
          description: `${successCount} of ${updatedPhotos.length} photos converted to 3D video. Preview now uses AI-generated parallax.`,
        });
      }
    } catch (error: any) {
      console.error("3D video generation error:", error);
      toast({
        title: "3D video generation failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating3D(false);
      setGen3DProgress({ current: 0, total: 0 });
    }
  };

  const loadSavedVideo = async (id: number) => {
    try {
      const res = await fetch(`/api/listing-videos/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedVideoId(data.id);
      setPhotos(data.photos || []);
      setTitle(data.title);
      setPropertyAddress(data.propertyAddress || "");
      setPropertyDetails(data.propertyDetails || {});
      if (data.settings) setSettings(data.settings);
      setActiveTab("photos");
    } catch {
      toast({ title: "Failed to load video", variant: "destructive" });
    }
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= photos.length) return;
    const updated = [...photos];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    updated.forEach((p, i) => p.order = i);
    setPhotos(updated);
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    updated.forEach((p, i) => p.order = i);
    setPhotos(updated);
  };

  const updatePhoto = (index: number, updates: Partial<PhotoItem>) => {
    const updated = [...photos];
    updated[index] = { ...updated[index], ...updates };
    setPhotos(updated);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              Listing Video Creator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Transform property photos into cinematic walkthrough videos with AI
            </p>
          </div>
          {selectedVideoId && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                setSelectedVideoId(null);
                setPhotos([]);
                setTitle("");
                setPropertyAddress("");
                setPropertyDetails({});
                setActiveTab("upload");
              }}>
                <Plus className="h-4 w-4 mr-1" /> New
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="upload"><Upload className="h-3 w-3 mr-1" /> Upload</TabsTrigger>
                <TabsTrigger value="photos"><Image className="h-3 w-3 mr-1" /> Photos</TabsTrigger>
                <TabsTrigger value="details"><Type className="h-3 w-3 mr-1" /> Details</TabsTrigger>
                <TabsTrigger value="settings"><Settings className="h-3 w-3 mr-1" /> Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files)}
                      />
                      {createMutation.isPending ? (
                        <div className="py-4">
                          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
                          <p className="font-medium">Uploading photos...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                          <p className="font-medium mb-1">Drop property photos here</p>
                          <p className="text-sm text-muted-foreground">or click to browse (up to 15 photos)</p>
                          <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WebP supported</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {savedVideos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Saved Videos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {savedVideos.map((video: any) => (
                        <div
                          key={video.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={() => loadSavedVideo(video.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{video.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {video.photos?.length || 0} photos • {new Date(video.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">{video.status}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(video.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="photos" className="space-y-4">
                {photos.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{photos.length} photos{photos.some(p => p.videoClipUrl) ? ` • ${photos.filter(p => p.videoClipUrl).length} with AI 3D` : photos.some(p => p.depthMapUrl) ? ` • ${photos.filter(p => p.depthMapUrl).length} with 3D depth` : ""}</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={analyzePhotos}
                          disabled={isAnalyzing || isGeneratingDepth}
                          size="sm"
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          {isAnalyzing ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-1" />
                          )}
                          {isAnalyzing ? "Analyzing..." : "AI Analyze & Order"}
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={generate3DVideoClips}
                            disabled={isGenerating3D || isAnalyzing || isGeneratingDepth}
                            size="sm"
                            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
                          >
                            {isGenerating3D ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Box className="h-4 w-4 mr-1" />
                            )}
                            {isGenerating3D ? "Generating..." : "AI 3D Video"}
                          </Button>
                          <Select value={videoQuality} onValueChange={(v: "480p" | "720p") => setVideoQuality(v)}>
                            <SelectTrigger className="w-[72px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="480p">480p</SelectItem>
                              <SelectItem value="720p">720p</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    {isGenerating3D && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Generating 3D video for photo {gen3DProgress.current} of {gen3DProgress.total}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ~1-5 min per photo
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(gen3DProgress.current / Math.max(gen3DProgress.total, 1)) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {isGeneratingDepth && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {depthProgress.modelLoading
                              ? `Loading AI model... ${depthProgress.modelPercent}%`
                              : `Processing photo ${depthProgress.current} of ${depthProgress.total}`
                            }
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {depthProgress.modelLoading ? "First time may take a moment" : ""}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${depthProgress.modelLoading
                                ? depthProgress.modelPercent * 0.3
                                : 30 + (depthProgress.current / Math.max(depthProgress.total, 1)) * 70
                              }%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {photos.map((photo, index) => (
                    <Card
                      key={photo.id}
                      className={`transition-all ${dragOverIndex === index ? "border-primary border-2" : ""}`}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
                      onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverIndex(null);
                        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
                        movePhoto(fromIndex, index);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <div className="flex items-center cursor-grab">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0 bg-muted">
                            {photo.dataUrl && (
                              <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                              {photo.roomType && (
                                <Badge variant="secondary" className="text-xs">
                                  {photo.roomType.replace(/_/g, " ")}
                                </Badge>
                              )}
                              {photo.videoClipUrl && (
                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                                  <Layers className="h-3 w-3 mr-0.5" />AI 3D
                                </Badge>
                              )}
                              {photo.depthMapUrl && !photo.videoClipUrl && (
                                <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800">
                                  <Layers className="h-3 w-3 mr-0.5" />3D
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={photo.motionType}
                                onValueChange={(v) => updatePhoto(index, { motionType: v })}
                              >
                                <SelectTrigger className="h-7 text-xs w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MOTION_TYPES.map(m => (
                                    <SelectItem key={m.value} value={m.value} className="text-xs">
                                      {m.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={photo.caption}
                                onChange={(e) => updatePhoto(index, { caption: e.target.value })}
                                placeholder="Caption..."
                                className="h-7 text-xs flex-1"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => movePhoto(index, index - 1)} disabled={index === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => movePhoto(index, index + 1)} disabled={index === photos.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removePhoto(index)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {photos.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Image className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Upload photos first in the Upload tab</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Video Title</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., 123 Oak Street Virtual Tour"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Property Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Address</Label>
                      <Input
                        value={propertyAddress}
                        onChange={(e) => setPropertyAddress(e.target.value)}
                        placeholder="123 Oak Street, Dallas, TX 75201"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Price</Label>
                        <Input
                          value={propertyDetails.price || ""}
                          onChange={(e) => setPropertyDetails(p => ({ ...p, price: e.target.value }))}
                          placeholder="$450,000"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Sq Ft</Label>
                        <Input
                          value={propertyDetails.sqft || ""}
                          onChange={(e) => setPropertyDetails(p => ({ ...p, sqft: e.target.value }))}
                          placeholder="2,400"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bedrooms</Label>
                        <Input
                          value={propertyDetails.beds || ""}
                          onChange={(e) => setPropertyDetails(p => ({ ...p, beds: e.target.value }))}
                          placeholder="4"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bathrooms</Label>
                        <Input
                          value={propertyDetails.baths || ""}
                          onChange={(e) => setPropertyDetails(p => ({ ...p, baths: e.target.value }))}
                          placeholder="3"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={propertyDetails.description || ""}
                        onChange={(e) => setPropertyDetails(p => ({ ...p, description: e.target.value }))}
                        placeholder="Beautiful home in a quiet neighborhood..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Video Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs">Aspect Ratio</Label>
                      <Select
                        value={settings.aspectRatio}
                        onValueChange={(v) => setSettings(s => ({ ...s, aspectRatio: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ASPECT_RATIOS).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Photo Duration: {settings.photoDuration}s</Label>
                      <input
                        type="range"
                        min="2"
                        max="8"
                        step="0.5"
                        value={settings.photoDuration}
                        onChange={(e) => setSettings(s => ({ ...s, photoDuration: parseFloat(e.target.value) }))}
                        className="w-full mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Transition Duration: {settings.transitionDuration}s</Label>
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.25"
                        value={settings.transitionDuration}
                        onChange={(e) => setSettings(s => ({ ...s, transitionDuration: parseFloat(e.target.value) }))}
                        className="w-full mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Transition Style</Label>
                      <Select
                        value={settings.transitionStyle}
                        onValueChange={(v) => setSettings(s => ({ ...s, transitionStyle: v }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cinematic">Cinematic (Parallax Depth)</SelectItem>
                          <SelectItem value="crossfade">Classic Crossfade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Show Captions</Label>
                      <Switch
                        checked={settings.showCaptions}
                        onCheckedChange={(v) => setSettings(s => ({ ...s, showCaptions: v }))}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Branding Position</Label>
                      <Select
                        value={settings.brandingPosition}
                        onValueChange={(v) => setSettings(s => ({ ...s, brandingPosition: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="top-left">Top Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Background Music</Label>
                      <Select
                        value={settings.musicTrack}
                        onValueChange={(v) => setSettings(s => ({ ...s, musicTrack: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MUSIC_TRACKS.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Music playback during preview (audio not included in export)</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Video Preview
                  {photos.some(p => p.depthMapUrl) && (
                    <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800">
                      <Box className="h-3 w-3 mr-0.5" />3D Parallax
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <VideoComposer
                  photos={photos}
                  settings={settings}
                  propertyDetails={propertyDetails}
                  propertyAddress={propertyAddress}
                  user={user}
                />
              </CardContent>
            </Card>

            {photos.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Total duration: ~{Math.round(photos.length * (settings.photoDuration + settings.transitionDuration))}s
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {photos.length} photos • {ASPECT_RATIOS[settings.aspectRatio]?.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
