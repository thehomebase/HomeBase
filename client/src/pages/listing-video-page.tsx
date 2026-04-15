import { useState, useRef, useCallback, useEffect } from "react";
import { Player as RemotionPlayer } from "@remotion/player";
import { ListingVideo as ListingVideoComposition } from "@/remotion/ListingVideo";
import { BUNDLED_TRACKS } from "@/lib/music-synthesizer";
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
  RotateCcw, RotateCw
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const { toast } = useToast();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const aspectRatio = ASPECT_RATIOS[settings.aspectRatio] || ASPECT_RATIOS["16:9"];
  const displayWidth = settings.aspectRatio === "9:16" ? 270 : settings.aspectRatio === "1:1" ? 400 : 480;
  const displayHeight = Math.round(displayWidth * (aspectRatio.height / aspectRatio.width));

  const segmentDuration = settings.photoDuration + settings.transitionDuration;
  const closingSlideDuration = agentBranding.showClosingSlide ? 4 : 0;
  const totalDuration = Math.max(1, photos.length) * segmentDuration + closingSlideDuration;
  const durationInFrames = Math.ceil(totalDuration * 30);

  const [clipBlobUrls, setClipBlobUrls] = useState<Record<string, string>>({});
  const clipCacheRef = useRef<Record<string, { sourceUrl: string; blobUrl: string }>>({});

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      Object.values(clipCacheRef.current).forEach(entry => {
        try { URL.revokeObjectURL(entry.blobUrl); } catch {}
      });
    };
  }, []);

  useEffect(() => {
    const currentPhotoIds = new Set(photos.map(p => p.id));
    for (const [id, entry] of Object.entries(clipCacheRef.current)) {
      if (!currentPhotoIds.has(id)) {
        try { URL.revokeObjectURL(entry.blobUrl); } catch {}
        delete clipCacheRef.current[id];
        setClipBlobUrls(prev => { const next = { ...prev }; delete next[id]; return next; });
      }
    }

    const photosNeedingFetch = photos.filter(p => {
      if (!p.videoClipUrl) return false;
      const cached = clipCacheRef.current[p.id];
      return !cached || cached.sourceUrl !== p.videoClipUrl;
    });
    if (photosNeedingFetch.length === 0) return;

    photosNeedingFetch.forEach(async (photo) => {
      const sourceUrl = photo.videoClipUrl!;
      const resolveUrl = (url: string) => {
        if (url.startsWith("https://")) {
          return `/api/listing-videos/proxy-clip?url=${encodeURIComponent(url)}`;
        }
        return url.startsWith("/") ? url : `/${url}`;
      };
      const fetchUrl = resolveUrl(sourceUrl);
      console.log(`[VideoClip] Pre-fetching clip for ${photo.id}: ${fetchUrl.substring(0, 100)}`);
      try {
        const resp = await fetch(fetchUrl, { credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        const blob = await resp.blob();
        console.log(`[VideoClip] Fetched clip for ${photo.id}: ${blob.size} bytes, type=${blob.type}`);
        if (blob.size < 1000) throw new Error(`Clip too small (${blob.size} bytes), likely invalid`);
        const blobUrl = URL.createObjectURL(blob);
        const old = clipCacheRef.current[photo.id];
        if (old) { try { URL.revokeObjectURL(old.blobUrl); } catch {} }
        clipCacheRef.current[photo.id] = { sourceUrl, blobUrl };
        setClipBlobUrls(prev => ({ ...prev, [photo.id]: blobUrl }));
      } catch (err: any) {
        console.warn(`[VideoClip] Failed to pre-fetch clip for ${photo.id}: ${err.message}`);
        setClipBlobUrls(prev => ({ ...prev, [photo.id]: "__failed__" }));
      }
    });
  }, [photos]);

  const photosWithBlobClips = photos.map(p => ({
    ...p,
    videoClipUrl: p.videoClipUrl
      ? (clipBlobUrls[p.id] && clipBlobUrls[p.id] !== "__failed__" ? clipBlobUrls[p.id] : (!clipBlobUrls[p.id] && p.videoClipUrl.startsWith("/") ? p.videoClipUrl : undefined))
      : undefined,
  }));

  const inputProps = {
    photos: photosWithBlobClips,
    settings,
    propertyDetails,
    propertyAddress,
    agentBranding,
  };

  const exportVideo = useCallback(async () => {
    if (photos.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    onExportStart?.();

    try {
      const res = await fetch("/api/listing-videos/render-remotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          photos,
          settings,
          propertyDetails,
          propertyAddress,
          agentBranding,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const { jobId } = await res.json();

      await new Promise<void>((resolve, reject) => {
        const MAX_POLL_MS = 10 * 60 * 1000;
        let failCount = 0;
        const startTime = Date.now();

        pollRef.current = setInterval(async () => {
          if (Date.now() - startTime > MAX_POLL_MS) {
            if (pollRef.current) clearInterval(pollRef.current);
            reject(new Error("Export timed out after 10 minutes"));
            return;
          }

          try {
            const statusRes = await fetch(`/api/listing-videos/render-status/${jobId}`, {
              credentials: "include",
            });
            if (!statusRes.ok) {
              failCount++;
              if (failCount >= 5) {
                if (pollRef.current) clearInterval(pollRef.current);
                reject(new Error("Lost connection to render server"));
              }
              return;
            }
            failCount = 0;
            const status = await statusRes.json();

            if (status.status === "processing") {
              setExportProgress((status.progress || 0) / 100);
            } else if (status.status === "complete") {
              if (pollRef.current) clearInterval(pollRef.current);
              setExportProgress(1);

              const downloadRes = await fetch(`/api/listing-videos/render-download/${jobId}`, {
                credentials: "include",
              });
              if (!downloadRes.ok) throw new Error("Download failed");

              const blob = await downloadRes.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `listing-video-${Date.now()}.mp4`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);

              toast({ title: "Export complete!", description: `Video exported (${Math.round(blob.size / 1024 / 1024)}MB)` });
              resolve();
            } else if (status.status === "failed") {
              if (pollRef.current) clearInterval(pollRef.current);
              reject(new Error(status.error || "Render failed"));
            }
          } catch (err: any) {
            if (pollRef.current) clearInterval(pollRef.current);
            reject(err);
          }
        }, 2000);
      });
    } catch (err: any) {
      console.error("[Export] Failed:", err);
      setExportError(err.message);
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      onExportEnd?.();
    }
  }, [photos, settings, propertyDetails, propertyAddress, agentBranding, onExportStart, onExportEnd, toast]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative bg-black rounded-lg overflow-hidden"
        style={{ width: displayWidth, height: displayHeight }}
      >
        {photos.length > 0 ? (
          <RemotionPlayer
            component={ListingVideoComposition}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            compositionWidth={aspectRatio.width}
            compositionHeight={aspectRatio.height}
            fps={30}
            style={{ width: displayWidth, height: displayHeight }}
            controls
            loop
            autoPlay={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
            <div className="text-center">
              <Video className="h-12 w-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Upload photos to preview</p>
            </div>
          </div>
        )}
      </div>

      {isExporting && (
        <div className="w-full max-w-md">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${exportProgress * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {exportProgress >= 0.95 ? "Finalizing..." : `Rendering... ${Math.round(exportProgress * 100)}%`}
          </p>
        </div>
      )}

      {exportError && (
        <p className="text-xs text-destructive text-center">{exportError}</p>
      )}

      <div className="flex gap-2">
        <Button onClick={exportVideo} disabled={photos.length === 0 || isExporting} variant="outline" size="sm">
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
                              {photo.videoClipUrl && clipBlobUrls[photo.id] === "__failed__" && (
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                                  <Layers className="h-3 w-3 mr-0.5" />Clip Corrupt — Re-animate
                                </Badge>
                              )}
                              {photo.videoClipUrl && clipBlobUrls[photo.id] !== "__failed__" && (
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
