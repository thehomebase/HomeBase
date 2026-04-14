import { useState, useRef, useCallback, useEffect } from "react";
import { createMusicPlayer, createMusicForExport, createBundledMusicPlayer, createBundledMusicForExport, isBundledTrack, BUNDLED_TRACKS } from "@/lib/music-synthesizer";
import type { MusicPlayer } from "@/lib/music-synthesizer";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
  Music, Type, Image, Settings, Plus, X, Loader2, Eye, Layers,
  RotateCcw, RotateCw, Square
} from "lucide-react";

interface PhotoItem {
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
  depthZones?: any[];
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
  textTemplate: string;
}

interface PropertyDetails {
  price?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  description?: string;
}

interface AgentBranding {
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
}

const MOTION_TYPES = [
  { value: "push-in", label: "Push In", icon: ZoomIn },
  { value: "pull-out", label: "Pull Out", icon: ZoomOut },
  { value: "truck-right", label: "Truck Right", icon: ArrowRight },
  { value: "truck-left", label: "Truck Left", icon: ArrowLeft },
  { value: "drift-right", label: "Drift Right", icon: ArrowRight },
  { value: "drift-left", label: "Drift Left", icon: ArrowLeft },
  { value: "pan-right", label: "Pan Right", icon: ArrowRight },
  { value: "pan-left", label: "Pan Left", icon: ArrowLeft },
  { value: "tilt-up", label: "Tilt Up", icon: ArrowUp },
  { value: "tilt-down", label: "Tilt Down", icon: ArrowDown },
  { value: "pedestal-up", label: "Pedestal Up", icon: ArrowUp },
  { value: "orbit-right", label: "Orbit Right", icon: RotateCw },
  { value: "orbit-left", label: "Orbit Left", icon: RotateCcw },
  { value: "zoom-in", label: "Zoom In", icon: ZoomIn },
  { value: "zoom-out", label: "Zoom Out", icon: ZoomOut },
];

const MUSIC_TRACKS = [
  { value: "none", label: "No Music", group: "" },
  ...BUNDLED_TRACKS.map(t => ({ value: t.id, label: `${t.label}`, group: "Royalty-Free" })),
  { value: "elegant", label: "Elegant Piano", group: "Generated" },
  { value: "modern", label: "Modern Ambient", group: "Generated" },
  { value: "upbeat", label: "Upbeat & Bright", group: "Generated" },
  { value: "cinematic", label: "Cinematic", group: "Generated" },
  { value: "acoustic", label: "Acoustic Guitar", group: "Generated" },
];

const TEXT_TEMPLATES = [
  { value: "classic", label: "Classic", description: "Clean centered text with dark overlay" },
  { value: "bold", label: "Bold Cinematic", description: "Large bold headers with staggered fade-in, property bar at bottom" },
  { value: "minimal", label: "Modern Minimal", description: "Bottom-left text with accent bar, subtle fade" },
  { value: "elegant", label: "Elegant", description: "Serif font with gradient overlay, refined feel" },
  { value: "none", label: "No Text", description: "Video only, no text overlays" },
];

const ASPECT_RATIOS: Record<string, { width: number; height: number; label: string }> = {
  "16:9": { width: 1920, height: 1080, label: "Landscape (16:9)" },
  "9:16": { width: 1080, height: 1920, label: "Portrait / Reels (9:16)" },
  "1:1": { width: 1080, height: 1080, label: "Square (1:1)" },
};

function ClipPreviewModal({
  photo,
  onClose,
}: {
  photo: PhotoItem;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Clip Preview</span>
            {photo.roomType && (
              <Badge variant="secondary" className="text-xs">{photo.roomType.replace(/_/g, " ")}</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          {photo.videoClipUrl ? (
            <video
              ref={videoRef}
              src={photo.videoClipUrl.startsWith("https://") ? `/api/listing-videos/proxy-clip?url=${encodeURIComponent(photo.videoClipUrl)}` : photo.videoClipUrl}
              controls
              autoPlay
              loop
              className="w-full rounded-lg"
              {...(photo.videoClipUrl.startsWith("https://") ? { crossOrigin: "anonymous" as const } : {})}
            />
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No animation generated yet</p>
            </div>
          )}
          {photo.keyword && (
            <div className="mt-2 text-center">
              <Badge variant="outline" className="text-xs">Keyword: {photo.keyword}</Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoComposer({
  photos,
  settings,
  propertyDetails,
  propertyAddress,
  user,
  agentBranding,
  onExportStart,
  onExportEnd,
  onClipError,
}: {
  photos: PhotoItem[];
  settings: VideoSettings;
  propertyDetails: PropertyDetails;
  propertyAddress: string;
  user: any;
  agentBranding: AgentBranding;
  onExportStart?: () => void;
  onExportEnd?: () => void;
  onClipError?: (photoId: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const musicPlayerRef = useRef<MusicPlayer | null>(null);
  const [videosReady, setVideosReady] = useState(0);
  const isPlayingRef = useRef(false);

  const aspectRatio = ASPECT_RATIOS[settings.aspectRatio] || ASPECT_RATIOS["16:9"];
  const displayWidth = settings.aspectRatio === "9:16" ? 270 : settings.aspectRatio === "1:1" ? 400 : 480;
  const displayHeight = Math.round(displayWidth * (aspectRatio.height / aspectRatio.width));

  const videoBlobUrlsRef = useRef<Map<string, string>>(new Map());

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
      if (photo.videoClipUrl && !videoElementsRef.current.has(photo.id)) {
        const resolveClipUrl = (url: string) => {
          if (url.startsWith("https://")) {
            return `/api/listing-videos/proxy-clip?url=${encodeURIComponent(url)}`;
          }
          return url.startsWith("/") ? url : `/${url}`;
        };
        const fetchUrl = resolveClipUrl(photo.videoClipUrl);
        console.log(`[VideoClip] Fetching blob for ${photo.id}: ${fetchUrl.slice(0, 80)}`);
        fetch(fetchUrl, { credentials: "include" })
          .then(resp => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.blob();
          })
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            videoBlobUrlsRef.current.set(photo.id, blobUrl);
            console.log(`[VideoClip] Blob ready for ${photo.id}: ${Math.round(blob.size / 1024)}KB`);
            const video = document.createElement("video");
            video.src = blobUrl;
            video.muted = true;
            video.playsInline = true;
            video.preload = "auto";
            video.addEventListener("loadeddata", () => {
              console.log(`[VideoClip] Loaded: ${photo.id}, readyState=${video.readyState}, duration=${video.duration}, w=${video.videoWidth}x${video.videoHeight}`);
              videoElementsRef.current.set(photo.id, video);
              setVideosReady(prev => prev + 1);
              if (!isPlaying) drawFrame(0, 0);
            });
            video.addEventListener("error", () => {
              console.warn(`[VideoClip] Video decode error for ${photo.id}: code=${video.error?.code}, msg=${video.error?.message}`);
            });
            video.load();
          })
          .catch(err => {
            console.warn(`[VideoClip] Fetch failed for ${photo.id}: ${err.message}`);
          });
      }
    });
  }, [photos]);

  const getMotionTransform = (motionType: string, progress: number, focusPoint?: { x: number; y: number }) => {
    const fp = focusPoint || { x: 50, y: 50 };
    const ease = progress * progress * (3 - 2 * progress);
    const fpX = fp.x / 100;
    const fpY = fp.y / 100;

    switch (motionType) {
      case "push-in":
      case "walk-forward":
        return { scale: 1.1 + ease * 0.55, x: (fpX - 0.5) * ease * 0.2, y: (fpY - 0.5) * ease * 0.15 };
      case "pull-out":
      case "reveal":
        return { scale: 1.65 - ease * 0.4, x: 0, y: -ease * 0.03 };
      case "truck-right":
      case "walk-right":
        return { scale: 1.2 + ease * 0.25, x: ease * 0.18, y: ease * 0.02 };
      case "truck-left":
      case "walk-left":
        return { scale: 1.2 + ease * 0.25, x: -ease * 0.18, y: ease * 0.02 };
      case "drift-right":
        return { scale: 1.3 + ease * 0.12, x: ease * 0.12, y: Math.sin(ease * Math.PI) * 0.02 };
      case "drift-left":
        return { scale: 1.3 + ease * 0.12, x: -ease * 0.12, y: Math.sin(ease * Math.PI) * 0.02 };
      case "pan-right":
        return { scale: 1.3, x: ease * 0.22, y: 0 };
      case "pan-left":
        return { scale: 1.3, x: -ease * 0.22, y: 0 };
      case "tilt-up":
      case "pan-up":
        return { scale: 1.3, x: 0, y: -ease * 0.15 };
      case "tilt-down":
      case "pan-down":
        return { scale: 1.3, x: 0, y: ease * 0.15 };
      case "pedestal-up":
      case "rise-up":
        return { scale: 1.25 + ease * 0.2, x: 0, y: -ease * 0.12 };
      case "orbit-right":
        return { scale: 1.25 + ease * 0.15, x: ease * 0.15, y: Math.sin(ease * Math.PI) * -0.04 };
      case "orbit-left":
        return { scale: 1.25 + ease * 0.15, x: -ease * 0.15, y: Math.sin(ease * Math.PI) * -0.04 };
      case "zoom-in":
        return { scale: 1.0 + ease * 0.5, x: (fpX - 0.5) * ease * 0.12, y: (fpY - 0.5) * ease * 0.08 };
      case "zoom-out":
        return { scale: 1.55 - ease * 0.3, x: 0, y: 0 };
      default:
        return { scale: 1.15 + ease * 0.4, x: ease * 0.1, y: ease * 0.02 };
    }
  };

  const drawImageWithMotion = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
    motionType: string,
    motionProgress: number,
    alpha: number,
  ) => {
    const transform = getMotionTransform(motionType, motionProgress);
    const imgAspect = img.width / img.height;
    const canvasAspect = w / h;
    let drawW: number, drawH: number;
    if (imgAspect > canvasAspect) {
      drawH = h * transform.scale;
      drawW = drawH * imgAspect;
    } else {
      drawW = w * transform.scale;
      drawH = drawW / imgAspect;
    }
    const drawX = (w - drawW) / 2 + transform.x * w;
    const drawY = (h - drawH) / 2 + transform.y * h;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  };

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const drawKeywordOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    keyword: string,
    photoProgress: number,
  ) => {
    if (!keyword || settings.textTemplate === "none") return;
    const tmpl = settings.textTemplate || "classic";
    const fadeIn = Math.min(1, photoProgress * 4);
    const fadeOut = Math.min(1, (1 - photoProgress) * 4);
    const alpha = Math.min(fadeIn, fadeOut);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (tmpl === "bold") {
      const slideIn = easeOut(Math.min(1, photoProgress * 3));
      ctx.globalAlpha = alpha;
      const fontSize = Math.max(22, w * 0.05);
      ctx.font = `800 ${fontSize}px "Oswald", "Montserrat", system-ui, sans-serif`;
      const barW = 4;
      const margin = w * 0.05;
      const textX = margin + barW + fontSize * 0.5;
      const textY = h - h * 0.1;
      const offsetX = (1 - slideIn) * -40;

      const bgGrad = ctx.createLinearGradient(0, textY - fontSize, w * 0.5, textY - fontSize);
      bgGrad.addColorStop(0, "rgba(0,0,0,0.5)");
      bgGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, textY - fontSize * 1.2, w * 0.5, fontSize * 2.4);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(margin + offsetX, textY - fontSize * 0.8, barW, fontSize * 1.2);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(keyword.toUpperCase(), textX + offsetX, textY);
    } else if (tmpl === "minimal") {
      const slideUp = easeOut(Math.min(1, photoProgress * 3));
      const fontSize = Math.max(16, w * 0.038);
      ctx.font = `600 ${fontSize}px "Montserrat", system-ui, sans-serif`;
      const margin = w * 0.06;
      const baseY = h - h * 0.08;
      const offsetY = (1 - slideUp) * 20;
      const accentGrad = ctx.createLinearGradient(margin, baseY - fontSize * 0.6, margin, baseY + fontSize * 0.3);
      accentGrad.addColorStop(0, "rgba(255,255,255,0.9)");
      accentGrad.addColorStop(1, "rgba(255,255,255,0.3)");
      ctx.fillStyle = accentGrad;
      ctx.fillRect(margin, baseY - fontSize * 0.6 + offsetY, 3, fontSize * 0.9);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 8;
      ctx.fillText(keyword.toUpperCase(), margin + 14, baseY + offsetY);
    } else if (tmpl === "elegant") {
      const fontSize = Math.max(18, w * 0.042);
      ctx.font = `italic 400 ${fontSize}px "Playfair Display", Georgia, serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 12;
      const spaced = keyword.toUpperCase().split("").join("\u200A");
      ctx.fillText(spaced, w / 2, h * 0.88);
      const lineW = Math.min(ctx.measureText(spaced).width * 0.5, w * 0.25);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(w / 2 - lineW / 2, h * 0.88 + fontSize * 0.8);
      ctx.lineTo(w / 2 + lineW / 2, h * 0.88 + fontSize * 0.8);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.88 + fontSize * 0.8, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const fontSize = Math.max(18, w * 0.042);
      ctx.font = `700 ${fontSize}px "Montserrat", system-ui, sans-serif`;
      const metrics = ctx.measureText(keyword.toUpperCase());
      const textW = metrics.width;
      const padX = fontSize * 1;
      const padY = fontSize * 0.6;
      const boxW = textW + padX * 2;
      const boxH = fontSize + padY * 2;
      const boxX = (w - boxW) / 2;
      const boxY = h * 0.12;
      const bgGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY);
      bgGrad.addColorStop(0, "rgba(0,0,0,0.7)");
      bgGrad.addColorStop(0.5, "rgba(0,0,0,0.55)");
      bgGrad.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(keyword.toUpperCase(), w / 2, boxY + boxH / 2);
    }
    ctx.restore();
  };

  const drawCaptionOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    caption: string,
    photoProgress: number
  ) => {
    if (!caption || !settings.showCaptions || settings.textTemplate === "none") return;
    const tmpl = settings.textTemplate || "classic";
    const fadeIn = Math.min(1, photoProgress * 5);
    const fadeOut = Math.min(1, (1 - photoProgress) * 5);
    const alpha = Math.min(fadeIn, fadeOut);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (tmpl === "bold" || tmpl === "minimal") {
      ctx.restore();
      return;
    } else if (tmpl === "elegant") {
      const fontSize = Math.max(13, w * 0.028);
      ctx.font = `italic 400 ${fontSize}px "Playfair Display", Georgia, serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.fillText(caption, w / 2, h * 0.92);
    } else {
      const fontSize = Math.max(14, w * 0.03);
      ctx.font = `500 ${fontSize}px "Montserrat", system-ui, sans-serif`;
      const metrics = ctx.measureText(caption);
      const textW = metrics.width;
      const padX = fontSize * 1.2;
      const padY = fontSize * 0.7;
      const boxW = textW + padX * 2;
      const boxH = fontSize + padY * 2;
      const boxX = (w - boxW) / 2;
      const boxY = h - boxH - h * 0.06;
      const grad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY);
      grad.addColorStop(0, "rgba(0,0,0,0.7)");
      grad.addColorStop(0.5, "rgba(0,0,0,0.55)");
      grad.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, boxH / 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, boxH / 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(caption, w / 2, boxY + boxH / 2);
    }
    ctx.restore();
  };

  const drawBrandingOverlay = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (settings.textTemplate === "none") return;
    const lines: string[] = [];
    if (agentBranding.showName && agentBranding.name) lines.push(agentBranding.name);
    if (agentBranding.showPhone && agentBranding.phone) lines.push(agentBranding.phone);
    if (agentBranding.showEmail && agentBranding.email) lines.push(agentBranding.email);
    if (agentBranding.showBrokerage && agentBranding.brokerageName) lines.push(agentBranding.brokerageName);
    if (lines.length === 0) return;

    ctx.save();
    ctx.globalAlpha = 0.92;
    const tmpl = settings.textTemplate || "classic";
    const headFont = tmpl === "elegant"
      ? '"Playfair Display", Georgia, serif'
      : '"Montserrat", system-ui, sans-serif';
    const bodyFont = tmpl === "elegant"
      ? '"Playfair Display", Georgia, serif'
      : '"Montserrat", system-ui, sans-serif';
    const nameSize = Math.max(12, w * 0.026);
    const detailSize = nameSize * 0.78;
    const padding = nameSize * 0.8;
    const lineH = nameSize * 1.2;

    let maxW = 0;
    lines.forEach((line, i) => {
      ctx.font = i === 0 ? `700 ${nameSize}px ${headFont}` : `400 ${detailSize}px ${bodyFont}`;
      maxW = Math.max(maxW, ctx.measureText(line).width);
    });

    const accentW = 3;
    const boxW = maxW + padding * 2 + accentW + padding * 0.4;
    const boxH = padding * 1.6 + lineH * lines.length;
    const margin = w * 0.03;
    let boxX: number, boxY: number;
    switch (settings.brandingPosition) {
      case "top-left": boxX = margin; boxY = margin; break;
      case "top-right": boxX = w - boxW - margin; boxY = margin; break;
      case "bottom-left": boxX = margin; boxY = h - boxH - margin; break;
      default: boxX = w - boxW - margin; boxY = h - boxH - margin;
    }

    const bgGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
    bgGrad.addColorStop(0, "rgba(0,0,0,0.65)");
    bgGrad.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(boxX + padding * 0.5, boxY + padding * 0.6, accentW, boxH - padding * 1.2);

    const textX = boxX + padding * 0.5 + accentW + padding * 0.5;
    ctx.textAlign = "left";
    lines.forEach((line, i) => {
      if (i === 0) {
        ctx.font = `700 ${nameSize}px ${headFont}`;
        ctx.fillStyle = "#ffffff";
      } else {
        ctx.font = `400 ${detailSize}px ${bodyFont}`;
        ctx.fillStyle = "rgba(255,255,255,0.8)";
      }
      ctx.fillText(line, textX, boxY + padding * 0.8 + i * lineH + nameSize * 0.35);
    });
    ctx.restore();
  };

  const agentPhotoRef = useRef<HTMLImageElement | null>(null);
  const brokerageLogoRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (agentBranding.agentPhotoUrl) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { agentPhotoRef.current = img; };
      img.src = agentBranding.agentPhotoUrl;
    } else {
      agentPhotoRef.current = null;
    }
  }, [agentBranding.agentPhotoUrl]);

  useEffect(() => {
    if (agentBranding.brokerageLogoUrl) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { brokerageLogoRef.current = img; };
      img.src = agentBranding.brokerageLogoUrl;
    } else {
      brokerageLogoRef.current = null;
    }
  }, [agentBranding.brokerageLogoUrl]);

  const drawClosingSlide = (ctx: CanvasRenderingContext2D, w: number, h: number, slideProgress: number) => {
    if (!agentBranding.showClosingSlide) return;
    if (settings.textTemplate === "none") return;
    const tmpl = settings.textTemplate || "classic";
    const headFont = tmpl === "elegant"
      ? '"Playfair Display", Georgia, serif'
      : '"Montserrat", system-ui, sans-serif';
    const bodyFont = tmpl === "elegant"
      ? '"Playfair Display", Georgia, serif'
      : '"Montserrat", system-ui, sans-serif';

    ctx.save();

    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    bgGrad.addColorStop(0, "#1a1a2e");
    bgGrad.addColorStop(1, "#0a0a0f");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const fadeIn = easeOut(Math.min(1, slideProgress * 3));
    const scaleIn = 0.95 + 0.05 * fadeIn;
    ctx.globalAlpha = fadeIn;

    ctx.translate(w / 2, h / 2);
    ctx.scale(scaleIn, scaleIn);
    ctx.translate(-w / 2, -h / 2);

    const centerX = w / 2;
    const hasPhoto = agentBranding.showAgentPhoto && agentPhotoRef.current;
    const hasLogo = agentBranding.showBrokerageLogo && brokerageLogoRef.current;

    let yPos = hasPhoto ? h * 0.22 : h * 0.28;

    if (hasPhoto && agentPhotoRef.current) {
      const photoSize = Math.max(60, w * 0.12);
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, yPos, photoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(agentPhotoRef.current, centerX - photoSize / 2, yPos - photoSize / 2, photoSize, photoSize);
      ctx.restore();

      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, yPos, photoSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      yPos += photoSize / 2 + Math.max(16, w * 0.025);
    }

    if (agentBranding.name) {
      const nameSize = Math.max(24, w * 0.06);
      ctx.font = `700 ${nameSize}px ${headFont}`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255,255,255,0.1)";
      ctx.shadowBlur = 20;
      ctx.fillText(agentBranding.name, centerX, yPos);
      ctx.shadowBlur = 0;
      yPos += nameSize * 1.5;
    }

    if (agentBranding.roleText) {
      const roleSize = Math.max(12, w * 0.024);
      ctx.font = `600 ${roleSize}px ${bodyFont}`;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      const roleText = agentBranding.roleText.toUpperCase();
      ctx.fillText(roleText, centerX, yPos);

      const roleW = ctx.measureText(roleText).width;
      const dashLen = w * 0.04;
      const gap = roleSize * 0.8;
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - roleW / 2 - gap - dashLen, yPos);
      ctx.lineTo(centerX - roleW / 2 - gap, yPos);
      ctx.moveTo(centerX + roleW / 2 + gap, yPos);
      ctx.lineTo(centerX + roleW / 2 + gap + dashLen, yPos);
      ctx.stroke();
      yPos += roleSize * 2.5;
    } else {
      const lineW = w * 0.08;
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - lineW / 2, yPos);
      ctx.lineTo(centerX + lineW / 2, yPos);
      ctx.stroke();
      yPos += Math.max(14, w * 0.03) * 1.8;
    }

    const contactLines: string[] = [];
    if (agentBranding.phone) contactLines.push(agentBranding.phone);
    if (agentBranding.email) contactLines.push(agentBranding.email);

    contactLines.forEach((line) => {
      const contactSize = Math.max(13, w * 0.028);
      ctx.font = `400 ${contactSize}px ${bodyFont}`;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(line, centerX, yPos);
      yPos += contactSize * 1.8;
    });

    if (agentBranding.brokerageName) {
      yPos += Math.max(6, w * 0.01);

      if (hasLogo && brokerageLogoRef.current) {
        const logoH = Math.max(30, w * 0.05);
        const logoAspect = brokerageLogoRef.current.width / brokerageLogoRef.current.height;
        const logoW = logoH * logoAspect;
        ctx.globalAlpha = fadeIn * 0.7;
        ctx.drawImage(brokerageLogoRef.current, centerX - logoW / 2, yPos - logoH / 2, logoW, logoH);
        ctx.globalAlpha = fadeIn;
        yPos += logoH + Math.max(6, w * 0.01);
      }

      const brokSize = Math.max(11, w * 0.022);
      ctx.font = `500 ${brokSize}px ${bodyFont}`;
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(agentBranding.brokerageName, centerX, yPos);
    } else if (hasLogo && brokerageLogoRef.current) {
      yPos += Math.max(10, w * 0.015);
      const logoH = Math.max(30, w * 0.05);
      const logoAspect = brokerageLogoRef.current.width / brokerageLogoRef.current.height;
      const logoW = logoH * logoAspect;
      ctx.globalAlpha = fadeIn * 0.7;
      ctx.drawImage(brokerageLogoRef.current, centerX - logoW / 2, yPos - logoH / 2, logoW, logoH);
    }

    ctx.restore();
  };

  const drawPropertyInfo = (ctx: CanvasRenderingContext2D, w: number, h: number, globalProgress: number) => {
    if (settings.textTemplate === "none") return;
    if (!propertyAddress && !propertyDetails.price) return;
    if (globalProgress > 0.15) return;
    const tmpl = settings.textTemplate || "classic";

    if (tmpl === "bold") {
      const segDuration = 0.15;
      const headerDelay = 0.005;
      const priceDelay = 0.025;
      const addrDelay = 0.045;
      const detailDelay = 0.065;

      const staggerAlpha = (delay: number) => {
        const t = Math.max(0, globalProgress - delay);
        const fadeIn = easeOut(Math.min(1, t * 15));
        const fadeOutStart = segDuration - 0.03;
        const fadeOut = globalProgress > fadeOutStart ? easeInOut(Math.max(0, 1 - (globalProgress - fadeOutStart) / 0.03)) : 1;
        return Math.min(fadeIn, fadeOut);
      };
      const staggerSlide = (delay: number) => {
        const t = Math.max(0, globalProgress - delay);
        return easeOut(Math.min(1, t * 12)) * 30;
      };

      ctx.save();

      const vignette = ctx.createRadialGradient(w / 2, h * 0.35, w * 0.1, w / 2, h * 0.35, w * 0.8);
      vignette.addColorStop(0, "rgba(0,0,0,0.45)");
      vignette.addColorStop(0.6, "rgba(0,0,0,0.2)");
      vignette.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vignette;
      ctx.globalAlpha = staggerAlpha(headerDelay);
      ctx.fillRect(0, 0, w, h);

      const headerSize = Math.max(32, w * 0.09);
      let yPos = h * 0.22;
      ctx.globalAlpha = staggerAlpha(headerDelay);
      ctx.font = `900 ${headerSize}px "Bebas Neue", "Oswald", system-ui, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      const slideY1 = staggerSlide(headerDelay);
      ctx.fillText("JUST LISTED", w / 2, yPos + (30 - slideY1));

      const underlineAlpha = staggerAlpha(headerDelay);
      if (underlineAlpha > 0) {
        ctx.globalAlpha = underlineAlpha * 0.6;
        const lineW = w * 0.15;
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(w / 2 - lineW / 2, yPos + headerSize * 0.55 + (30 - slideY1), lineW, 2);
      }

      if (propertyDetails.price) {
        yPos += headerSize * 1.3;
        ctx.globalAlpha = staggerAlpha(priceDelay);
        const priceSize = Math.max(24, w * 0.06);
        ctx.font = `700 ${priceSize}px "Montserrat", system-ui, sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = "#ffffff";
        const slideY2 = staggerSlide(priceDelay);
        ctx.fillText(propertyDetails.price, w / 2, yPos + (30 - slideY2));
      }

      if (propertyAddress) {
        yPos += (propertyDetails.price ? Math.max(24, w * 0.06) : headerSize) * 1.5;
        ctx.globalAlpha = staggerAlpha(addrDelay);
        const addrSize = Math.max(13, w * 0.028);
        ctx.font = `500 ${addrSize}px "Montserrat", system-ui, sans-serif`;
        ctx.shadowBlur = 6;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        const slideY3 = staggerSlide(addrDelay);
        ctx.fillText(propertyAddress.toUpperCase(), w / 2, yPos + (30 - slideY3));
      }

      const detailItems: string[] = [];
      if (propertyDetails.beds) detailItems.push(`${propertyDetails.beds} BEDS`);
      if (propertyDetails.baths) detailItems.push(`${propertyDetails.baths} BATHS`);
      if (propertyDetails.sqft) detailItems.push(`${propertyDetails.sqft} SQ FT`);

      if (detailItems.length > 0) {
        ctx.globalAlpha = staggerAlpha(detailDelay);
        const barH = Math.max(42, h * 0.07);
        const barY = h - barH;
        const slideY4 = staggerSlide(detailDelay);
        const yOff = 30 - slideY4;

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        const barGrad = ctx.createLinearGradient(0, barY + yOff, 0, barY + barH + yOff);
        barGrad.addColorStop(0, "rgba(255,255,255,0.95)");
        barGrad.addColorStop(1, "rgba(240,240,240,0.95)");
        ctx.fillStyle = barGrad;
        ctx.fillRect(0, barY + yOff, w, barH);

        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, barY + yOff);
        ctx.lineTo(w, barY + yOff);
        ctx.stroke();

        const segW = w / detailItems.length;
        const detailSize = Math.max(12, w * 0.022);
        const iconSize = detailSize * 1.1;

        detailItems.forEach((item, i) => {
          const cx = segW * i + segW / 2;
          const cy = barY + barH / 2 + yOff;

          let iconChar = "■";
          if (item.includes("BED")) iconChar = "⌂";
          else if (item.includes("BATH")) iconChar = "◈";
          else if (item.includes("SQ")) iconChar = "▣";

          ctx.font = `400 ${iconSize}px system-ui`;
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const iconW = ctx.measureText(iconChar).width;
          const textFont = `700 ${detailSize}px "Montserrat", system-ui, sans-serif`;
          ctx.font = textFont;
          const textW = ctx.measureText(item).width;
          const totalW = iconW + 6 + textW;
          const startX = cx - totalW / 2;

          ctx.font = `400 ${iconSize}px system-ui`;
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillText(iconChar, startX + iconW / 2, cy);

          ctx.font = textFont;
          ctx.fillStyle = "#1a1a1a";
          ctx.fillText(item, startX + iconW + 6 + textW / 2, cy);

          if (i < detailItems.length - 1) {
            ctx.fillStyle = "rgba(0,0,0,0.12)";
            ctx.fillRect(segW * (i + 1) - 0.5, barY + barH * 0.2 + yOff, 1, barH * 0.6);
          }
        });
      }
      ctx.restore();
    } else if (tmpl === "minimal") {
      const alpha = globalProgress < 0.02 ? globalProgress / 0.02 : globalProgress > 0.12 ? (0.15 - globalProgress) / 0.03 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      const margin = w * 0.06;
      const slideIn = easeOut(Math.min(1, globalProgress * 10));
      const offsetX = (1 - slideIn) * -40;

      const panelW = w * 0.45;
      const panelH = h * 0.35;
      const panelY = h * 0.3;
      const panelGrad = ctx.createLinearGradient(0, panelY, panelW * 0.6, panelY);
      panelGrad.addColorStop(0, "rgba(0,0,0,0.5)");
      panelGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = panelGrad;
      ctx.fillRect(0, panelY, panelW, panelH);

      const accentX = margin + offsetX - 6;
      const accentGrad = ctx.createLinearGradient(accentX, panelY + panelH * 0.1, accentX, panelY + panelH * 0.9);
      accentGrad.addColorStop(0, "rgba(255,255,255,0.9)");
      accentGrad.addColorStop(1, "rgba(255,255,255,0.3)");
      ctx.fillStyle = accentGrad;
      ctx.fillRect(accentX, panelY + panelH * 0.1, 3, panelH * 0.8);

      let yPos = h * 0.36;
      if (propertyDetails.price) {
        const priceSize = Math.max(22, w * 0.058);
        ctx.font = `800 ${priceSize}px "Montserrat", system-ui, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 10;
        ctx.fillText(propertyDetails.price, margin + offsetX + 6, yPos);
        yPos += priceSize * 1.4;
      }
      if (propertyAddress) {
        const addrSize = Math.max(12, w * 0.026);
        ctx.font = `500 ${addrSize}px "Montserrat", system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.shadowBlur = 4;
        ctx.fillText(propertyAddress.toUpperCase(), margin + offsetX + 6, yPos);
        yPos += addrSize * 2;
      }
      const details: string[] = [];
      if (propertyDetails.beds) details.push(`${propertyDetails.beds} Bed`);
      if (propertyDetails.baths) details.push(`${propertyDetails.baths} Bath`);
      if (propertyDetails.sqft) details.push(`${propertyDetails.sqft} Sq Ft`);
      if (details.length > 0) {
        const detSize = Math.max(11, w * 0.022);
        ctx.font = `400 ${detSize}px "Montserrat", system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.shadowBlur = 0;
        ctx.fillText(details.join("  ·  "), margin + offsetX + 6, yPos);
      }
      ctx.restore();
    } else if (tmpl === "elegant") {
      const alpha = globalProgress < 0.02 ? globalProgress / 0.02 : globalProgress > 0.12 ? (0.15 - globalProgress) / 0.03 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      const serifFont = '"Playfair Display", Georgia, serif';

      const grad = ctx.createLinearGradient(0, h * 0.5, 0, h);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.4, "rgba(0,0,0,0.3)");
      grad.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      let yPos = h * 0.66;
      ctx.textAlign = "center";

      if (propertyDetails.price) {
        const priceSize = Math.max(24, w * 0.065);
        ctx.font = `italic 400 ${priceSize}px ${serifFont}`;
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        ctx.fillText(propertyDetails.price, w / 2, yPos);
        yPos += priceSize * 1.5;
      }

      const ornW = w * 0.06;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(w / 2 - ornW, yPos);
      ctx.lineTo(w / 2 + ornW, yPos);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(w / 2, yPos, 2.5, 0, Math.PI * 2);
      ctx.fill();
      yPos += Math.max(16, w * 0.035);

      if (propertyAddress) {
        const addrSize = Math.max(12, w * 0.026);
        ctx.font = `400 ${addrSize}px ${serifFont}`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.shadowBlur = 4;
        const spaced = propertyAddress.toUpperCase().split("").join("\u200A");
        ctx.fillText(spaced, w / 2, yPos);
        yPos += addrSize * 2;
      }
      const details: string[] = [];
      if (propertyDetails.beds) details.push(`${propertyDetails.beds} Beds`);
      if (propertyDetails.baths) details.push(`${propertyDetails.baths} Baths`);
      if (propertyDetails.sqft) details.push(`${propertyDetails.sqft} Sq Ft`);
      if (details.length > 0) {
        const detSize = Math.max(11, w * 0.023);
        ctx.font = `400 ${detSize}px ${serifFont}`;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.shadowBlur = 0;
        ctx.fillText(details.join("     ·     "), w / 2, yPos);
      }
      ctx.restore();
    } else {
      const alpha = globalProgress < 0.02 ? globalProgress / 0.02 : globalProgress > 0.12 ? (0.15 - globalProgress) / 0.03 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;

      const contentLines: { text: string; isTitle: boolean }[] = [];
      if (propertyAddress) contentLines.push({ text: propertyAddress, isTitle: true });
      const details: string[] = [];
      if (propertyDetails.price) details.push(propertyDetails.price);
      if (propertyDetails.beds) details.push(`${propertyDetails.beds} Bed`);
      if (propertyDetails.baths) details.push(`${propertyDetails.baths} Bath`);
      if (propertyDetails.sqft) details.push(`${propertyDetails.sqft} Sq Ft`);
      if (details.length > 0) contentLines.push({ text: details.join("  •  "), isTitle: false });

      const titleSize = Math.max(16, w * 0.038);
      const detailFontSize = titleSize * 0.72;
      const lineH = titleSize * 1.7;
      const padX = titleSize * 1.5;
      const padY = titleSize * 1;

      let maxW = 0;
      contentLines.forEach(({ text, isTitle }) => {
        ctx.font = isTitle
          ? `700 ${titleSize}px "Montserrat", system-ui, sans-serif`
          : `400 ${detailFontSize}px "Montserrat", system-ui, sans-serif`;
        maxW = Math.max(maxW, ctx.measureText(text).width);
      });

      const boxW = maxW + padX * 2;
      const boxH = padY * 2 + contentLines.length * lineH;
      const boxX = (w - boxW) / 2;
      const boxY = (h - boxH) / 2;

      const bgGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
      bgGrad.addColorStop(0, "rgba(0,0,0,0.7)");
      bgGrad.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 12);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 12);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      contentLines.forEach(({ text, isTitle }, i) => {
        ctx.font = isTitle
          ? `700 ${titleSize}px "Montserrat", system-ui, sans-serif`
          : `400 ${detailFontSize}px "Montserrat", system-ui, sans-serif`;
        ctx.fillStyle = isTitle ? "#ffffff" : "rgba(255,255,255,0.8)";
        ctx.fillText(text, w / 2, boxY + padY + i * lineH + lineH / 2);
      });
      ctx.restore();
    }
  };

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
        dh = h; dw = h * srcAspect; dx = (w - dw) / 2;
      } else {
        dw = w; dh = w / srcAspect; dy = (h - dh) / 2;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      try { ctx.drawImage(source, dx, dy, dw, dh); } catch (e) { console.warn("[DrawFrame] drawImage failed:", e); }
      ctx.restore();
    };

    if (video && video.readyState >= 2 && video.duration > 0) {
      if (!isPlayingRef.current) {
        const motionProgress = Math.min(photoProgress / (1 - transRatio), 1);
        const targetTime = motionProgress * video.duration;
        if (Math.abs(video.currentTime - targetTime) > 0.05) {
          video.currentTime = targetTime;
        }
      }
      drawVideoOrImage(video, isTransitioning ? 1 - transEase : 1);
    } else if (fallbackImg) {
      drawVideoOrImage(fallbackImg, isTransitioning ? 1 - transEase : 1);
    }

    if (isTransitioning && photoIdx < photos.length - 1) {
      const nextIdx = photoIdx + 1;
      const nextPhoto = photos[nextIdx];
      const nextVideo = videoElementsRef.current.get(nextPhoto?.id);
      const nextImg = loadedImagesRef.current.get(nextPhoto?.id);
      if (nextVideo && nextVideo.readyState >= 2 && nextVideo.duration > 0) {
        if (!isPlayingRef.current) {
          nextVideo.currentTime = transEase * 0.08 * nextVideo.duration;
        }
        drawVideoOrImage(nextVideo, transEase);
      } else if (nextImg) {
        drawVideoOrImage(nextImg, transEase);
      }
    }

    const propertyInfoVisible = globalProgress <= 0.15 && (!!propertyAddress || !!propertyDetails.price);
    if (currentPhoto.keyword && !propertyInfoVisible) {
      drawKeywordOverlay(ctx, w, h, currentPhoto.keyword, photoProgress);
    }
    if (currentPhoto.caption && settings.showCaptions && !propertyInfoVisible) {
      drawCaptionOverlay(ctx, w, h, currentPhoto.caption, photoProgress);
    }
    drawPropertyInfo(ctx, w, h, globalProgress);
  }, [photos, settings, propertyAddress, propertyDetails, agentBranding, videosReady]);

  const closingSlideDuration = agentBranding.showClosingSlide ? 4 : 0;

  const drawFrame = useCallback((photoIdx: number, photoProgress: number, globalProgress: number = 0) => {
    const canvas = canvasRef.current;
    if (!canvas || photos.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const photosDuration = photos.length * (settings.photoDuration + settings.transitionDuration);
    const totalDuration = photosDuration + closingSlideDuration;
    const elapsed = globalProgress * totalDuration;

    if (elapsed >= photosDuration && closingSlideDuration > 0) {
      const slideProgress = (elapsed - photosDuration) / closingSlideDuration;
      drawClosingSlide(ctx, canvas.width, canvas.height, slideProgress);
      return;
    }

    const currentPhoto = photos[photoIdx];
    const hasClip = currentPhoto?.videoClipUrl && videoElementsRef.current.has(currentPhoto.id);

    if (hasClip) {
      drawFrameVideoClip(photoIdx, photoProgress, globalProgress);
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

    if (currentPhoto?.videoClipUrl) {
      if (currentImg) {
        const alpha = isTransitioning ? 1 - transEase : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        const srcAspect = currentImg.width / currentImg.height;
        const canvAspect = w / h;
        let dw = w, dh = h, dx = 0, dy = 0;
        if (srcAspect > canvAspect) { dh = h; dw = h * srcAspect; dx = (w - dw) / 2; }
        else { dw = w; dh = w / srcAspect; dy = (h - dh) / 2; }
        ctx.drawImage(currentImg, dx, dy, dw, dh);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Loading AI clip...", w / 2, h / 2);
        ctx.restore();
      }
    } else if (currentImg) {
      const alpha = isTransitioning ? 1 - transEase : 1;
      drawImageWithMotion(ctx, currentImg, w, h, currentPhoto.motionType, photoProgress, alpha);
    }

    if (isTransitioning && !currentPhoto?.videoClipUrl && photoIdx < photos.length - 1) {
      const nextIdx = photoIdx + 1;
      const nextPhoto = photos[nextIdx];
      const nextImg = loadedImagesRef.current.get(nextPhoto?.id);
      if (nextImg) {
        drawImageWithMotion(ctx, nextImg, w, h, nextPhoto.motionType, transEase * 0.1, transEase);
      }
    }

    const propertyInfoVisible = globalProgress <= 0.15 && (!!propertyAddress || !!propertyDetails.price);
    if (currentPhoto?.keyword && !propertyInfoVisible) {
      drawKeywordOverlay(ctx, w, h, currentPhoto.keyword, photoProgress);
    }
    if (currentPhoto && !propertyInfoVisible) {
      drawCaptionOverlay(ctx, w, h, currentPhoto.caption, photoProgress);
    }
    drawPropertyInfo(ctx, w, h, globalProgress);
  }, [photos, settings, propertyAddress, propertyDetails, agentBranding, drawFrameVideoClip, closingSlideDuration]);

  const ensureFontsLoaded = async () => {
    try {
      await Promise.all([
        document.fonts.load('900 48px "Bebas Neue"'),
        document.fonts.load('italic 400 48px "Playfair Display"'),
        document.fonts.load('700 48px "Montserrat"'),
        document.fonts.load('700 48px "Oswald"'),
      ]);
    } catch {}
  };

  const playPreview = useCallback(() => {
    if (photos.length === 0) return;
    ensureFontsLoaded();
    setIsPlaying(true);
    isPlayingRef.current = true;
    const photosDuration = photos.length * (settings.photoDuration + settings.transitionDuration);
    const totalDuration = photosDuration + closingSlideDuration;
    const startTime = performance.now();
    const segmentDuration = settings.photoDuration + settings.transitionDuration;

    if (musicPlayerRef.current) {
      musicPlayerRef.current.stop();
      musicPlayerRef.current = null;
    }
    if (settings.musicTrack && settings.musicTrack !== "none") {
      const player = isBundledTrack(settings.musicTrack)
        ? createBundledMusicPlayer(settings.musicTrack, totalDuration)
        : createMusicPlayer(settings.musicTrack, totalDuration);
      player.start();
      musicPlayerRef.current = player;
    }

    let lastActiveIdx = -1;

    const startVideoForPhoto = (idx: number) => {
      const photo = photos[idx];
      if (!photo) return;
      const video = videoElementsRef.current.get(photo.id);
      if (video && video.readyState >= 2 && video.duration > 0) {
        video.currentTime = 0;
        video.playbackRate = Math.min(Math.max(video.duration / segmentDuration, 0.25), 4);
        video.muted = true;
        video.play().catch(() => {});
      }
    };

    const pauseVideoForPhoto = (idx: number) => {
      const photo = photos[idx];
      if (!photo) return;
      const video = videoElementsRef.current.get(photo.id);
      if (video) video.pause();
    };

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      const globalProgress = elapsed / totalDuration;
      if (globalProgress >= 1) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentPhotoIndex(0);
        setProgress(0);
        videoElementsRef.current.forEach(v => v.pause());
        drawFrame(0, 0, 0);
        if (musicPlayerRef.current) {
          musicPlayerRef.current.stop();
          musicPlayerRef.current = null;
        }
        return;
      }
      setProgress(globalProgress);
      const photoIdx = Math.min(Math.floor(elapsed / segmentDuration), photos.length - 1);
      const photoProgress = (elapsed - photoIdx * segmentDuration) / segmentDuration;

      if (photoIdx !== lastActiveIdx) {
        if (lastActiveIdx >= 0) pauseVideoForPhoto(lastActiveIdx);
        startVideoForPhoto(photoIdx);
        lastActiveIdx = photoIdx;
      }

      const transRatio = settings.transitionDuration / segmentDuration;
      if (photoProgress > (1 - transRatio) && photoIdx < photos.length - 1) {
        const nextIdx = photoIdx + 1;
        const nextVideo = videoElementsRef.current.get(photos[nextIdx]?.id);
        if (nextVideo && nextVideo.paused && nextVideo.readyState >= 2) {
          nextVideo.currentTime = 0;
          nextVideo.playbackRate = Math.min(Math.max(nextVideo.duration / segmentDuration, 0.25), 4);
          nextVideo.muted = true;
          nextVideo.play().catch(() => {});
        }
      }

      setCurrentPhotoIndex(photoIdx);
      drawFrame(photoIdx, Math.min(photoProgress, 1), globalProgress);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [photos, settings, drawFrame, closingSlideDuration]);

  const stopPreview = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (musicPlayerRef.current) {
      musicPlayerRef.current.stop();
      musicPlayerRef.current = null;
    }
    isPlayingRef.current = false;
    videoElementsRef.current.forEach(v => v.pause());
    setIsPlaying(false);
  }, []);

  const exportVideo = useCallback(async () => {
    if (photos.length === 0) return;
    await ensureFontsLoaded();
    isPlayingRef.current = false;
    videoElementsRef.current.forEach(v => v.pause());
    setIsExporting(true);
    onExportStart?.();

    try {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = aspectRatio.width;
      exportCanvas.height = aspectRatio.height;
      const exportCtx = exportCanvas.getContext("2d");
      if (!exportCtx) throw new Error("Cannot get canvas context");

      const videoStream = exportCanvas.captureStream(0);
      let musicExport: { stream: MediaStream; stop: () => void } | null = null;
      let combinedStream: MediaStream;

      if (settings.musicTrack && settings.musicTrack !== "none") {
        const photosDur = photos.length * (settings.photoDuration + settings.transitionDuration);
        const totalDur = photosDur + closingSlideDuration;
        if (isBundledTrack(settings.musicTrack)) {
          try {
            musicExport = await createBundledMusicForExport(settings.musicTrack, totalDur);
          } catch {
            musicExport = createMusicForExport("elegant", totalDur);
          }
        } else {
          musicExport = createMusicForExport(settings.musicTrack, totalDur);
        }
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...musicExport.stream.getAudioTracks(),
        ]);
      } else {
        combinedStream = videoStream;
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 8000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const exportPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });
      mediaRecorder.start();

      const photosDuration = photos.length * (settings.photoDuration + settings.transitionDuration);
      const totalDuration = photosDuration + closingSlideDuration;
      const fps = 30;
      const totalFrames = Math.ceil(totalDuration * fps);
      const frameDurationMs = 1000 / fps;
      const videoTrack = videoStream.getVideoTracks()[0];

      const origW = canvasRef.current?.width;
      const origH = canvasRef.current?.height;
      if (canvasRef.current) {
        canvasRef.current.width = aspectRatio.width;
        canvasRef.current.height = aspectRatio.height;
      }

      const seekVideo = (video: HTMLVideoElement, time: number): Promise<void> => {
        return new Promise((resolve) => {
          if (Math.abs(video.currentTime - time) < 0.02) { resolve(); return; }
          let resolved = false;
          const done = () => { if (!resolved) { resolved = true; resolve(); } };
          const onSeeked = () => { video.removeEventListener("seeked", onSeeked); done(); };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = time;
          setTimeout(done, 500);
        });
      };

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

        drawFrame(photoIdx, Math.min(photoProgress, 1), globalProgress);

        if (canvasRef.current) {
          exportCtx.clearRect(0, 0, aspectRatio.width, aspectRatio.height);
          exportCtx.drawImage(canvasRef.current, 0, 0, aspectRatio.width, aspectRatio.height);
        }

        if ((videoTrack as any).requestFrame) {
          (videoTrack as any).requestFrame();
        }

        setProgress(globalProgress);
        const hasVideoSeek = exportPhoto?.videoClipUrl && videoElementsRef.current.has(exportPhoto.id);
        await new Promise(r => setTimeout(r, hasVideoSeek ? frameDurationMs : 8));
      }

      if (canvasRef.current) {
        canvasRef.current.width = origW || displayWidth;
        canvasRef.current.height = origH || displayHeight;
      }

      mediaRecorder.stop();
      if (musicExport) musicExport.stop();
      const blob = await exportPromise;

      setProgress(0.95);

      const downloadBlob = (b: Blob, ext: string) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url;
        a.download = `listing-video-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      try {
        console.log(`[Export] Uploading ${Math.round(blob.size / 1024)}KB WebM for MP4 conversion...`);
        const formData = new FormData();
        formData.append("video", blob, "listing-video.webm");
        const startResp = await fetch("/api/listing-videos/convert-to-mp4", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!startResp.ok) {
          console.warn(`[Export] MP4 upload failed (${startResp.status}), falling back to WebM`);
          downloadBlob(blob, "webm");
        } else {
          const { jobId } = await startResp.json();
          console.log(`[Export] MP4 conversion started, job: ${jobId}`);

          const pollForCompletion = async (): Promise<boolean> => {
            const maxWait = 300000;
            const pollInterval = 3000;
            const start = Date.now();
            while (Date.now() - start < maxWait) {
              await new Promise(r => setTimeout(r, pollInterval));
              try {
                const statusResp = await fetch(`/api/listing-videos/convert-status/${jobId}`, { credentials: "include" });
                if (!statusResp.ok) return false;
                const { status, error } = await statusResp.json();
                if (status === "complete") return true;
                if (status === "failed") { console.warn(`[Export] MP4 conversion failed: ${error}`); return false; }
                console.log(`[Export] MP4 converting... (${Math.round((Date.now() - start) / 1000)}s)`);
              } catch { return false; }
            }
            console.warn("[Export] MP4 conversion timed out (5min)");
            return false;
          };

          const success = await pollForCompletion();
          if (success) {
            console.log("[Export] Downloading MP4...");
            const dlResp = await fetch(`/api/listing-videos/download-mp4/${jobId}`, { credentials: "include" });
            if (dlResp.ok) {
              const mp4Blob = await dlResp.blob();
              console.log(`[Export] MP4 downloaded: ${Math.round(mp4Blob.size / 1024)}KB`);
              downloadBlob(mp4Blob, "mp4");
            } else {
              console.warn("[Export] MP4 download failed, falling back to WebM");
              downloadBlob(blob, "webm");
            }
          } else {
            downloadBlob(blob, "webm");
          }
        }
      } catch (convErr: any) {
        console.warn("[Export] MP4 conversion error:", convErr?.message || convErr);
        downloadBlob(blob, "webm");
      }
      drawFrame(0, 0, 0);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
      setProgress(0);
      onExportEnd?.();
    }
  }, [photos, settings, drawFrame, aspectRatio, displayWidth, displayHeight, closingSlideDuration]);

  useEffect(() => {
    if (photos.length > 0 && !isPlaying) {
      drawFrame(0, 0, 0);
    }
  }, [photos, settings, drawFrame, isPlaying]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (musicPlayerRef.current) {
        musicPlayerRef.current.stop();
        musicPlayerRef.current = null;
      }
      videoElementsRef.current.forEach((video) => {
        video.pause();
        video.src = "";
      });
      videoElementsRef.current.clear();
      videoBlobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      videoBlobUrlsRef.current.clear();
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
            {isExporting ? (progress >= 0.95 ? "Converting to MP4..." : `Rendering... ${Math.round(progress * 100)}%`) : `Photo ${currentPhotoIndex + 1} of ${photos.length}`}
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
            <Square className="h-4 w-4 mr-1" /> Stop
          </Button>
        )}
        <Button onClick={exportVideo} disabled={photos.length === 0 || isPlaying || isExporting} variant="outline" size="sm">
          {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          {isExporting ? "Exporting..." : "Export MP4"}
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
    textTemplate: "bold",
  });
  const [agentBranding, setAgentBranding] = useState<AgentBranding>({
    showName: true,
    showEmail: true,
    showPhone: true,
    showBrokerage: false,
    showClosingSlide: true,
    showAgentPhoto: false,
    showBrokerageLogo: false,
    name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
    email: user?.email || "",
    phone: user?.profilePhone || "",
    brokerageName: "",
    roleText: "Licensed Real Estate Agent",
    agentPhotoUrl: "",
    brokerageLogoUrl: "",
  });
  const brandingInitializedRef = useRef(false);
  useEffect(() => {
    if (user && !brandingInitializedRef.current) {
      brandingInitializedRef.current = true;
      const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      setAgentBranding(prev => ({
        ...prev,
        name: prev.name || name,
        email: prev.email || user.email || "",
        phone: prev.phone || user.profilePhone || "",
      }));
    }
  }, [user]);
  const [activeTab, setActiveTab] = useState("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [previewingClip, setPreviewingClip] = useState<PhotoItem | null>(null);
  const [reanimatingPhotoId, setReanimatingPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [gen3DProgress, setGen3DProgress] = useState({ current: 0, total: 0 });

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
      if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
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
      toast({ title: "Too many photos", description: "Maximum 15 photos allowed.", variant: "destructive" });
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
          }
        });
        if (data.suggestedOrder && Array.isArray(data.suggestedOrder)) {
          const reordered: PhotoItem[] = [];
          data.suggestedOrder.forEach((id: string, index: number) => {
            const photo = updatedPhotos.find(p => p.id === id);
            if (photo) { photo.order = index; reordered.push(photo); }
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
    } catch {
      toast({ title: "Analysis failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generate3DVideoClips = async () => {
    if (photos.length === 0) return;
    setIsGenerating3D(true);
    const total = photos.filter(p => p.dataUrl).length;
    setGen3DProgress({ current: 0, total });

    try {
      const updatedPhotos = [...photos];
      let completed = 0;

      const generateOne = async (photo: typeof updatedPhotos[0], index: number) => {
        if (!photo.dataUrl) return;
        try {
          const res = await fetch("/api/listing-videos/generate-3d-clip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              imageDataUrl: photo.dataUrl,
              motionType: photo.motionType || "push-in",
              duration: settings.photoDuration,
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Generation failed");
          }
          const data = await res.json();
          if (data.jobId) {
            const result = await pollForClipResult(data.jobId);
            if (result) {
              let clipUrl = result.videoUrl;
              if (result.needsPersist && clipUrl?.startsWith("https://")) {
                try {
                  const pRes = await fetch("/api/listing-videos/persist-clip", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ cdnUrl: clipUrl }),
                  });
                  if (pRes.ok) {
                    const pData = await pRes.json();
                    clipUrl = pData.videoUrl;
                    console.log(`[Persist] Clip ${photo.id} saved permanently: ${clipUrl}`);
                  }
                } catch (e) {
                  console.warn(`[Persist] Save failed for ${photo.id}, using CDN URL`, e);
                }
              }
              photo.videoClipUrl = clipUrl;
            }
          } else if (data.videoUrl) {
            photo.videoClipUrl = data.videoUrl;
          }
        } catch (err: any) {
          console.error(`Video failed for photo ${photo.id}:`, err);
          const msg = err?.message || "Could not generate clip";
          toast({ title: `Photo ${index + 1} failed`, description: msg, variant: "destructive" });
        } finally {
          completed++;
          setGen3DProgress({ current: completed, total });
        }
      };

      const CONCURRENCY = 4;
      const photosToProcess = updatedPhotos.filter(p => p.dataUrl);
      for (let i = 0; i < photosToProcess.length; i += CONCURRENCY) {
        const batch = photosToProcess.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((photo) => generateOne(photo, updatedPhotos.indexOf(photo))));
      }

      setPhotos(updatedPhotos);
      const successCount = updatedPhotos.filter(p => p.videoClipUrl).length;
      if (successCount > 0) {
        toast({
          title: "Video Clips Generated!",
          description: `${successCount} of ${total} clips ready. Preview now uses AI-generated video.`,
        });
        if (selectedVideoId) {
          try {
            await apiRequest("PUT", `/api/listing-videos/${selectedVideoId}`, {
              photos: updatedPhotos,
              settings,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/listing-videos"] });
          } catch (e) {
            console.error("Auto-save after clip generation failed:", e);
          }
        }
      }
    } catch (error: any) {
      console.error("Video generation error:", error);
      toast({ title: "Video generation failed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating3D(false);
      setGen3DProgress({ current: 0, total: 0 });
    }
  };

  const pollForClipResult = async (jobId: string, maxWaitMs = 600000): Promise<{ videoUrl: string; needsPersist: boolean } | null> => {
    const start = Date.now();
    const POLL_INTERVAL = 4000;
    while (Date.now() - start < maxWaitMs) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
      try {
        const statusRes = await fetch(`/api/listing-videos/clip-status/${jobId}`, { credentials: "include" });
        if (!statusRes.ok) continue;
        const statusData = await statusRes.json();
        if (statusData.status === "complete") return { videoUrl: statusData.videoUrl, needsPersist: statusData.needsPersist };
        if (statusData.status === "failed") throw new Error(statusData.error || "Generation failed");
      } catch (e: any) {
        if (e?.message && e.message !== "Failed to fetch") throw e;
      }
    }
    throw new Error("Timed out waiting for clip (10 min limit)");
  };

  const reanimatePhoto = async (photoIndex: number) => {
    const photo = photos[photoIndex];
    if (!photo?.dataUrl) return;
    setReanimatingPhotoId(photo.id);
    try {
      const res = await fetch("/api/listing-videos/generate-3d-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageDataUrl: photo.dataUrl,
          motionType: photo.motionType || "push-in",
          duration: settings.photoDuration,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Re-animation failed");
      }
      const data = await res.json();
      let clipUrl = data.videoUrl;
      if (data.jobId) {
        const result = await pollForClipResult(data.jobId);
        if (result) {
          clipUrl = result.videoUrl;
          if (result.needsPersist && clipUrl?.startsWith("https://")) {
            try {
              const pRes = await fetch("/api/listing-videos/persist-clip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ cdnUrl: clipUrl }),
              });
              if (pRes.ok) {
                const pData = await pRes.json();
                clipUrl = pData.videoUrl;
                console.log(`[Persist] Reanimate clip saved permanently: ${clipUrl}`);
              }
            } catch (e) {
              console.warn(`[Persist] Reanimate persist failed, using CDN URL`, e);
            }
          }
        }
      }
      const updatedPhotos = [...photos];
      updatedPhotos[photoIndex] = { ...updatedPhotos[photoIndex], videoClipUrl: clipUrl };
      setPhotos(updatedPhotos);
      toast({ title: "Clip re-animated!", description: `Photo ${photoIndex + 1} has a new animation.` });
      if (selectedVideoId) {
        try {
          await apiRequest("PUT", `/api/listing-videos/${selectedVideoId}`, { photos: updatedPhotos });
          queryClient.invalidateQueries({ queryKey: ["/api/listing-videos"] });
        } catch (e) {
          console.error("Auto-save after re-animate failed:", e);
        }
      }
    } catch (err: any) {
      const msg = err?.name === "AbortError" ? "Timed out" : (err?.message || "Failed");
      toast({ title: "Re-animate failed", description: msg, variant: "destructive" });
    } finally {
      setReanimatingPhotoId(null);
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
      if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
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
                                {video.photos?.length || 0} photos
                                {video.photos?.filter((p: any) => p.videoClipUrl)?.length > 0 && ` • ${video.photos.filter((p: any) => p.videoClipUrl).length} clips`}
                                {" • "}{new Date(video.createdAt).toLocaleDateString()}
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
                      <p className="text-sm text-muted-foreground">
                        {photos.length} photos
                        {photos.some(p => p.videoClipUrl) ? ` • ${photos.filter(p => p.videoClipUrl).length} animated` : ""}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={analyzePhotos}
                          disabled={isAnalyzing || isGenerating3D}
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
                        <Button
                          onClick={generate3DVideoClips}
                          disabled={isGenerating3D || isAnalyzing}
                          size="sm"
                          variant="outline"
                        >
                          {isGenerating3D ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Video className="h-4 w-4 mr-1" />
                          )}
                          {isGenerating3D ? "Generating..." : "Generate Video"}
                        </Button>
                      </div>
                    </div>
                    {isGenerating3D && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Generating clips: {gen3DProgress.current} of {gen3DProgress.total} complete
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Processing in parallel
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
                          <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0 bg-muted relative group">
                            {photo.dataUrl && (
                              <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                            )}
                            {photo.videoClipUrl && (
                              <button
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                                draggable={false}
                                onMouseDown={(e) => e.stopPropagation()}
                                onDragStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setPreviewingClip(photo); }}
                              >
                                <Play className="h-5 w-5 text-white" />
                              </button>
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
                                  <Layers className="h-3 w-3 mr-0.5" />Animated
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
                            <div className="flex items-center gap-2">
                              <Input
                                value={photo.keyword || ""}
                                onChange={(e) => updatePhoto(index, { keyword: e.target.value })}
                                placeholder="Keyword overlay..."
                                className="h-7 text-xs flex-1"
                              />
                              <div className="flex gap-1">
                                {photo.videoClipUrl && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Preview clip"
                                    onClick={() => setPreviewingClip(photo)}
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Re-animate"
                                  disabled={reanimatingPhotoId === photo.id || isGenerating3D}
                                  onClick={() => reanimatePhoto(index)}
                                >
                                  {reanimatingPhotoId === photo.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Agent Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm shrink-0">Name</Label>
                      <Input
                        value={agentBranding.name}
                        onChange={(e) => setAgentBranding(b => ({ ...b, name: e.target.value }))}
                        placeholder="Your name"
                        className="max-w-[220px]"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm shrink-0">Email</Label>
                      <Input
                        value={agentBranding.email}
                        onChange={(e) => setAgentBranding(b => ({ ...b, email: e.target.value }))}
                        placeholder="agent@email.com"
                        className="max-w-[220px]"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm shrink-0">Phone</Label>
                      <Input
                        value={agentBranding.phone}
                        onChange={(e) => setAgentBranding(b => ({ ...b, phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                        className="max-w-[220px]"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm shrink-0">Brokerage</Label>
                      <Input
                        value={agentBranding.brokerageName}
                        onChange={(e) => setAgentBranding(b => ({ ...b, brokerageName: e.target.value }))}
                        placeholder="XYZ Realty Group"
                        className="max-w-[220px]"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Label className="text-sm shrink-0">Agent Photo</Label>
                        {agentBranding.agentPhotoUrl && (
                          <img src={agentBranding.agentPhotoUrl} alt="Agent" className="w-10 h-10 rounded-full object-cover border" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setAgentBranding(b => ({ ...b, agentPhotoUrl: reader.result as string, showAgentPhoto: true }));
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                        >
                          {agentBranding.agentPhotoUrl ? "Change" : "Upload"}
                        </Button>
                        <Switch
                          checked={agentBranding.showAgentPhoto}
                          onCheckedChange={(v) => setAgentBranding(b => ({ ...b, showAgentPhoto: v }))}
                          disabled={!agentBranding.agentPhotoUrl}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Label className="text-sm shrink-0">Brokerage Logo</Label>
                        {agentBranding.brokerageLogoUrl && (
                          <img src={agentBranding.brokerageLogoUrl} alt="Logo" className="h-8 max-w-[80px] object-contain" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setAgentBranding(b => ({ ...b, brokerageLogoUrl: reader.result as string, showBrokerageLogo: true }));
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                        >
                          {agentBranding.brokerageLogoUrl ? "Change" : "Upload"}
                        </Button>
                        <Switch
                          checked={agentBranding.showBrokerageLogo}
                          onCheckedChange={(v) => setAgentBranding(b => ({ ...b, showBrokerageLogo: v }))}
                          disabled={!agentBranding.brokerageLogoUrl}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Closing Slide</Label>
                        <p className="text-xs text-muted-foreground">Agent card at end of video</p>
                      </div>
                      <Switch
                        checked={agentBranding.showClosingSlide}
                        onCheckedChange={(v) => setAgentBranding(b => ({ ...b, showClosingSlide: v }))}
                      />
                    </div>
                    {agentBranding.showClosingSlide && (
                      <Input
                        value={agentBranding.roleText}
                        onChange={(e) => setAgentBranding(b => ({ ...b, roleText: e.target.value }))}
                        placeholder="Licensed Real Estate Agent"
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Text Overlay Template</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2">
                      {TEXT_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.value}
                          onClick={() => setSettings(s => ({ ...s, textTemplate: tmpl.value }))}
                          className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                            settings.textTemplate === tmpl.value
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
                          }`}
                        >
                          <div className={`w-16 h-10 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-bold overflow-hidden ${
                            tmpl.value === "bold" ? "bg-gradient-to-br from-gray-900 to-gray-700 text-white" :
                            tmpl.value === "minimal" ? "bg-gradient-to-br from-slate-800 to-slate-600 text-white" :
                            tmpl.value === "elegant" ? "bg-gradient-to-br from-amber-900 to-amber-700 text-amber-100" :
                            tmpl.value === "none" ? "bg-muted text-muted-foreground" :
                            "bg-gradient-to-br from-blue-900 to-blue-700 text-white"
                          }`}>
                            {tmpl.value === "bold" && (
                              <div className="leading-tight text-center">
                                <div className="text-[7px] opacity-60">JUST LISTED</div>
                                <div>$450K</div>
                              </div>
                            )}
                            {tmpl.value === "minimal" && (
                              <div className="flex items-center gap-0.5">
                                <div className="w-[2px] h-3 bg-white rounded-full" />
                                <span className="text-[8px]">$450K</span>
                              </div>
                            )}
                            {tmpl.value === "elegant" && (
                              <div className="italic text-[8px] tracking-wider">$450K</div>
                            )}
                            {tmpl.value === "classic" && (
                              <div className="bg-black/50 px-1.5 py-0.5 rounded text-[8px]">$450K</div>
                            )}
                            {tmpl.value === "none" && (
                              <span className="text-[8px]">OFF</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{tmpl.label}</p>
                            <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

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
                        min="3"
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
                          <SelectItem value="cinematic">Cinematic</SelectItem>
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
                          <SelectItem value="none">No Music</SelectItem>
                          {BUNDLED_TRACKS.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Royalty-Free Tracks</div>
                              {BUNDLED_TRACKS.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.label}
                                  <span className="text-xs text-muted-foreground ml-1">— {t.artist}</span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Generated Tracks</div>
                          {MUSIC_TRACKS.filter(t => t.group === "Generated").map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Music plays during preview and is included in exported video</p>
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
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <VideoComposer
                  photos={photos}
                  settings={settings}
                  propertyDetails={propertyDetails}
                  propertyAddress={propertyAddress}
                  user={user}
                  agentBranding={agentBranding}
                  onClipError={() => {}}
                />
              </CardContent>
            </Card>

            {photos.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Total duration: ~{Math.round(photos.length * (settings.photoDuration + settings.transitionDuration) + (agentBranding.showClosingSlide ? 4 : 0))}s
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

      {previewingClip && (
        <ClipPreviewModal
          photo={previewingClip}
          onClose={() => setPreviewingClip(null)}
        />
      )}
    </div>
  );
}
