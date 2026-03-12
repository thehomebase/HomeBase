import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Move, Save } from "lucide-react";

interface PhotoPositionEditorProps {
  open: boolean;
  onClose: () => void;
  imageFile: File;
  onSave: (blob: Blob) => Promise<void>;
  cropWidth?: number;
  cropHeight?: number;
}

function getMinZoom(imgW: number, imgH: number, cW: number, cH: number) {
  return Math.max(cW / imgW, cH / imgH);
}

function clampOffset(ox: number, oy: number, imgW: number, imgH: number, z: number, cW: number, cH: number) {
  const scaledW = imgW * z;
  const scaledH = imgH * z;
  const maxX = 0;
  const minX = cW - scaledW;
  const maxY = 0;
  const minY = cH - scaledH;
  return {
    x: scaledW <= cW ? (cW - scaledW) / 2 : Math.min(maxX, Math.max(minX, ox)),
    y: scaledH <= cH ? (cH - scaledH) / 2 : Math.min(maxY, Math.max(minY, oy)),
  };
}

export function PhotoPositionEditor({
  open,
  onClose,
  imageFile,
  onSave,
  cropWidth = 400,
  cropHeight = 500,
}: PhotoPositionEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const lastTouchDist = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !imageFile) return;
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      const initialZoom = getMinZoom(img.naturalWidth, img.naturalHeight, cropWidth, cropHeight);
      setZoom(initialZoom);
      setOffset({
        x: (cropWidth - img.naturalWidth * initialZoom) / 2,
        y: (cropHeight - img.naturalHeight * initialZoom) / 2,
      });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [open, imageFile, cropWidth, cropHeight]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    ctx.fillStyle = "#ebebeb";
    ctx.fillRect(0, 0, cropWidth, cropHeight);
    ctx.drawImage(imgEl, offset.x, offset.y, imgEl.naturalWidth * zoom, imgEl.naturalHeight * zoom);
  }, [imgEl, zoom, offset, cropWidth, cropHeight]);

  useEffect(() => { draw(); }, [draw]);

  const displayScale = Math.min(320 / cropWidth, 400 / cropHeight, 1);
  const displayW = cropWidth * displayScale;
  const displayH = cropHeight * displayScale;

  function getClientPos(e: React.MouseEvent | React.TouchEvent) {
    if ("touches" in e && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if ("clientX" in e) return { x: e.clientX, y: e.clientY };
    return { x: 0, y: 0 };
  }

  function getTouchDist(e: React.TouchEvent) {
    if (e.touches.length < 2) return null;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function applyZoomCentered(newZ: number, centerX: number, centerY: number) {
    if (!imgEl) return;
    const minZ = getMinZoom(imgEl.naturalWidth, imgEl.naturalHeight, cropWidth, cropHeight);
    const clampedZ = Math.max(minZ, Math.min(newZ, 5));
    setZoom(prev => {
      const cx = (centerX - offset.x) / prev;
      const cy = (centerY - offset.y) / prev;
      const newOx = centerX - cx * clampedZ;
      const newOy = centerY - cy * clampedZ;
      const clamped = clampOffset(newOx, newOy, imgEl.naturalWidth, imgEl.naturalHeight, clampedZ, cropWidth, cropHeight);
      setOffset(clamped);
      return clampedZ;
    });
  }

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if ("touches" in e && e.touches.length >= 2) {
      lastTouchDist.current = getTouchDist(e);
      return;
    }
    isDragging.current = true;
    const pos = getClientPos(e);
    dragStart.current = { x: pos.x, y: pos.y, ox: offset.x, oy: offset.y };
  }

  function handlePointerMove(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if ("touches" in e && e.touches.length >= 2) {
      const dist = getTouchDist(e);
      if (dist && lastTouchDist.current && imgEl) {
        const scale = dist / lastTouchDist.current;
        const newZ = zoom * scale;
        applyZoomCentered(newZ, cropWidth / 2, cropHeight / 2);
      }
      lastTouchDist.current = dist;
      return;
    }
    if (!isDragging.current || !imgEl) return;
    const pos = getClientPos(e);
    const dx = (pos.x - dragStart.current.x) / displayScale;
    const dy = (pos.y - dragStart.current.y) / displayScale;
    const raw = { x: dragStart.current.ox + dx, y: dragStart.current.oy + dy };
    setOffset(clampOffset(raw.x, raw.y, imgEl.naturalWidth, imgEl.naturalHeight, zoom, cropWidth, cropHeight));
  }

  function handlePointerUp(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    isDragging.current = false;
    lastTouchDist.current = null;
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    applyZoomCentered(zoom + delta, cropWidth / 2, cropHeight / 2);
  }

  function handleSliderZoom(v: number) {
    applyZoomCentered(v, cropWidth / 2, cropHeight / 2);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      draw();
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Failed"))), "image/png");
      });
      await onSave(blob);
      onClose();
    } catch {
      // keep dialog open on error
    } finally {
      setSaving(false);
    }
  }

  const minZoom = imgEl ? getMinZoom(imgEl.naturalWidth, imgEl.naturalHeight, cropWidth, cropHeight) : 0.1;
  const maxZoom = Math.max(minZoom * 4, 3);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[400px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="text-left p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-4 w-4" />
            Position & Resize Photo
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Drag to reposition. Pinch or use the slider to resize.
          </p>
        </DialogHeader>

        <div className="px-4 pb-2 flex items-center gap-3">
          <ZoomOut className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[zoom]}
            onValueChange={v => handleSliderZoom(v[0])}
            min={minZoom}
            max={maxZoom}
            step={0.01}
            className="flex-1"
          />
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        </div>

        <div
          className="mx-4 mb-3 rounded-lg overflow-hidden border bg-[#ebebeb] relative flex items-center justify-center"
          style={{ height: displayH }}
        >
          <canvas
            ref={canvasRef}
            className="block"
            style={{
              width: displayW,
              height: displayH,
              cursor: isDragging.current ? "grabbing" : "grab",
              touchAction: "none",
            }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onWheel={handleWheel}
          />
          <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-lg pointer-events-none" />
        </div>

        <DialogFooter className="p-4 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
