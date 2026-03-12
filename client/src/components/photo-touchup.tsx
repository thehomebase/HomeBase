import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eraser, Undo2, Save, ZoomIn, ZoomOut } from "lucide-react";

const BG_COLOR = "#ebebeb";

interface PhotoTouchupProps {
  open: boolean;
  onClose: () => void;
  photoUrl: string;
  onSave: (blob: Blob) => Promise<void>;
}

export function PhotoTouchup({ open, onClose, photoUrl, onSave }: PhotoTouchupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<ImageData[]>([]);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const naturalSize = useRef({ w: 400, h: 500 });

  useEffect(() => {
    if (!open || !photoUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      naturalSize.current = { w: img.naturalWidth, h: img.naturalHeight };
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      setZoom(1);
    };
    img.src = photoUrl;
  }, [open, photoUrl]);

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory(prev => [...prev.slice(-20), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory(prev => {
      if (prev.length <= 1) return prev;
      const newHist = prev.slice(0, -1);
      ctx.putImageData(newHist[newHist.length - 1], 0, 0);
      return newHist;
    });
  }, []);

  function getCanvasPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function drawAt(x: number, y: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scaledBrush = brushSize * (canvas.width / (canvas.getBoundingClientRect().width || 1));
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = BG_COLOR;
    ctx.beginPath();
    ctx.arc(x, y, scaledBrush / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLine(from: { x: number; y: number }, to: { x: number; y: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scaledBrush = brushSize * (canvas.width / (canvas.getBoundingClientRect().width || 1));
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = BG_COLOR;
    ctx.lineWidth = scaledBrush;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function handleStart(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    isDrawing.current = true;
    const pos = getCanvasPos(e);
    if (!pos) return;
    lastPos.current = pos;
    drawAt(pos.x, pos.y);
  }

  function handleMove(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing.current) return;
    const pos = getCanvasPos(e);
    if (!pos) return;
    if (lastPos.current) {
      drawLine(lastPos.current, pos);
    }
    lastPos.current = pos;
  }

  function handleEnd(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (isDrawing.current) {
      isDrawing.current = false;
      lastPos.current = null;
      saveSnapshot();
    }
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Failed")), "image/png");
      });
      await onSave(blob);
      onClose();
    } catch {
      setSaving(false);
    }
  }

  const displayW = Math.min(380, naturalSize.current.w);
  const displayH = (naturalSize.current.h / naturalSize.current.w) * displayW;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[440px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="text-left p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Eraser className="h-4 w-4" />
            Touch Up Photo
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Paint over any artifacts left from background removal
          </p>
        </DialogHeader>

        <div className="px-4 pb-2 flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Brush</span>
          <Slider
            value={[brushSize]}
            onValueChange={v => setBrushSize(v[0])}
            min={5}
            max={60}
            step={1}
            className="flex-1"
          />
          <span className="text-xs font-mono w-6 text-right">{brushSize}</span>
          <div className="flex gap-1 ml-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(z + 0.25, 3))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={history.length <= 1}>
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="mx-4 mb-3 rounded-lg overflow-auto border bg-[#ebebeb]"
          style={{ maxHeight: "55vh" }}
        >
          <canvas
            ref={canvasRef}
            className="block"
            style={{
              width: displayW * zoom,
              height: displayH * zoom,
              cursor: "crosshair",
              touchAction: "none",
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </div>

        <DialogFooter className="p-4 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
