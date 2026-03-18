import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FileSignature, Type, Calendar, CheckSquare, Hash, Trash2,
  ChevronLeft, ChevronRight, Loader2, X, Save, ZoomIn, ZoomOut, GripVertical
} from "lucide-react";

export interface TemplateField {
  id: string;
  type: string;
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  role: string;
}

const SIGNER_ROLES = [
  { value: "buyer", label: "Buyer", color: "#7c3aed" },
  { value: "seller", label: "Seller", color: "#2563eb" },
  { value: "agent", label: "Agent", color: "#059669" },
  { value: "co_agent", label: "Co-Agent", color: "#d97706" },
  { value: "other", label: "Other", color: "#dc2626" },
];

const FIELD_TYPES = [
  { type: "signature", label: "Signature", icon: FileSignature, color: "#7c3aed" },
  { type: "text", label: "Text", icon: Type, color: "#2563eb" },
  { type: "date", label: "Date", icon: Calendar, color: "#059669" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, color: "#d97706" },
  { type: "initials", label: "Initials", icon: Hash, color: "#dc2626" },
];

const FIELD_DEFAULTS: Record<string, { width: number; height: number }> = {
  signature: { width: 200, height: 60 },
  text: { width: 180, height: 30 },
  date: { width: 120, height: 30 },
  checkbox: { width: 24, height: 24 },
  initials: { width: 80, height: 40 },
};

interface TemplateFieldEditorProps {
  pdfUrl: string;
  initialFields?: TemplateField[];
  onSave: (fields: TemplateField[], pageDims: { width: number; height: number }[]) => void;
  onClose: () => void;
  saving?: boolean;
}

export default function TemplateFieldEditor({ pdfUrl, initialFields, onSave, onClose, saving }: TemplateFieldEditorProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<ImageBitmap[]>([]);
  const [pdfDims, setPdfDims] = useState<{ width: number; height: number }[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [fields, setFields] = useState<TemplateField[]>(initialFields || []);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(null);
  const [placingType, setPlacingType] = useState<string | null>(null);
  const [placingRole, setPlacingRole] = useState<string>("buyer");
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; fieldIdx: number; offsetX: number; offsetY: number } | null>(null);
  const resizeRef = useRef<{ fieldIdx: number; startX: number; startY: number; startW: number; startH: number } | null>(null);

  useEffect(() => {
    loadPdf();
  }, [pdfUrl]);

  const loadPdf = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch(pdfUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load PDF");
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages: ImageBitmap[] = [];
      const dims: { width: number; height: number }[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const bmp = await createImageBitmap(canvas);
        pages.push(bmp);
        dims.push({ width: viewport.width, height: viewport.height });
      }

      setPdfPages(pages);
      setPdfDims(dims);
    } catch (err: any) {
      setLoadError(err.message || "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  const renderPage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pdfPages[currentPage]) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = pdfPages[currentPage];
    const displayW = img.width * scale;
    const displayH = img.height * scale;
    canvas.width = displayW;
    canvas.height = displayH;
    ctx.drawImage(img, 0, 0, displayW, displayH);

    const pageFields = fields.filter((f) => f.page === currentPage);
    pageFields.forEach((field, idx) => {
      const actualIdx = fields.indexOf(field);
      const role = SIGNER_ROLES.find((r) => r.value === field.role) || SIGNER_ROLES[0];
      const isSelected = actualIdx === selectedFieldIdx;

      const x = field.x * scale;
      const y = field.y * scale;
      const w = field.width * scale;
      const h = field.height * scale;

      ctx.fillStyle = isSelected ? `${role.color}40` : `${role.color}20`;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = role.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash(isSelected ? [] : [4, 2]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      ctx.fillStyle = role.color;
      ctx.font = `bold ${Math.max(10, 11 * scale)}px sans-serif`;
      const labelText = `${role.label}: ${field.type}`;
      ctx.fillText(labelText, x + 4, y + Math.max(12, 13 * scale));

      if (isSelected) {
        ctx.fillStyle = role.color;
        ctx.fillRect(x + w - 8, y + h - 8, 8, 8);
      }
    });
  }, [pdfPages, currentPage, fields, selectedFieldIdx, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left),
      y: (clientY - rect.top),
    };
  };

  const findFieldAt = (cx: number, cy: number): number | null => {
    const pageFields = fields.filter((f) => f.page === currentPage);
    for (let i = pageFields.length - 1; i >= 0; i--) {
      const f = pageFields[i];
      const x = f.x * scale;
      const y = f.y * scale;
      const w = f.width * scale;
      const h = f.height * scale;
      if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
        return fields.indexOf(f);
      }
    }
    return null;
  };

  const isOnResizeHandle = (cx: number, cy: number, fieldIdx: number): boolean => {
    const f = fields[fieldIdx];
    if (!f) return false;
    const hx = (f.x + f.width) * scale;
    const hy = (f.y + f.height) * scale;
    return Math.abs(cx - hx) < 12 && Math.abs(cy - hy) < 12;
  };

  const handlePointerDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (placingType) {
      const defaults = FIELD_DEFAULTS[placingType] || { width: 150, height: 40 };
      const newField: TemplateField = {
        id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: placingType,
        label: placingType,
        page: currentPage,
        x: coords.x / scale,
        y: coords.y / scale,
        width: defaults.width,
        height: defaults.height,
        required: true,
        role: placingRole,
      };
      setFields((prev) => [...prev, newField]);
      setSelectedFieldIdx(fields.length);
      setPlacingType(null);
      return;
    }

    const hitIdx = findFieldAt(coords.x, coords.y);
    setSelectedFieldIdx(hitIdx);

    if (hitIdx !== null) {
      if (isOnResizeHandle(coords.x, coords.y, hitIdx)) {
        resizeRef.current = {
          fieldIdx: hitIdx,
          startX: coords.x,
          startY: coords.y,
          startW: fields[hitIdx].width,
          startH: fields[hitIdx].height,
        };
      } else {
        dragRef.current = {
          fieldIdx: hitIdx,
          startX: coords.x,
          startY: coords.y,
          offsetX: coords.x - fields[hitIdx].x * scale,
          offsetY: coords.y - fields[hitIdx].y * scale,
        };
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (dragRef.current) {
      const { fieldIdx, offsetX, offsetY } = dragRef.current;
      setFields((prev) => {
        const copy = [...prev];
        copy[fieldIdx] = {
          ...copy[fieldIdx],
          x: Math.max(0, (coords.x - offsetX) / scale),
          y: Math.max(0, (coords.y - offsetY) / scale),
        };
        return copy;
      });
    } else if (resizeRef.current) {
      const { fieldIdx, startX, startY, startW, startH } = resizeRef.current;
      const dx = (coords.x - startX) / scale;
      const dy = (coords.y - startY) / scale;
      setFields((prev) => {
        const copy = [...prev];
        copy[fieldIdx] = {
          ...copy[fieldIdx],
          width: Math.max(20, startW + dx),
          height: Math.max(15, startH + dy),
        };
        return copy;
      });
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    resizeRef.current = null;
  };

  const deleteField = (idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setSelectedFieldIdx(null);
  };

  const getRoleColor = (role: string) => SIGNER_ROLES.find((r) => r.value === role)?.color || "#666";

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col" style={{ colorScheme: "light" }}>
      <div className="flex items-center justify-between p-3 border-b bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold text-sm sm:text-base">Template Field Editor</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:flex">
            {fields.length} field{fields.length !== 1 ? "s" : ""}
          </Badge>
          <Button
            size="sm"
            onClick={() => onSave(fields, pdfDims)}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Fields
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 lg:w-64 border-r flex flex-col overflow-y-auto bg-card p-3 gap-3 shrink-0">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Assign To Role</p>
            <Select value={placingRole} onValueChange={setPlacingRole}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIGNER_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                      {r.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Add Field</p>
            <div className="grid grid-cols-1 gap-1.5">
              {FIELD_TYPES.map((ft) => {
                const Icon = ft.icon;
                const isActive = placingType === ft.type;
                return (
                  <Button
                    key={ft.type}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="justify-start h-8 text-xs"
                    onClick={() => setPlacingType(isActive ? null : ft.type)}
                  >
                    <Icon className="h-3.5 w-3.5 mr-2" />
                    {ft.label}
                  </Button>
                );
              })}
            </div>
            {placingType && (
              <p className="text-xs text-primary mt-2 animate-pulse">
                Click on the PDF to place a {placingType} field for {SIGNER_ROLES.find(r => r.value === placingRole)?.label}
              </p>
            )}
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Placed Fields</p>
            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">No fields placed yet. Select a field type above and click on the PDF.</p>
            ) : (
              <div className="space-y-1">
                {fields.map((field, idx) => {
                  const roleColor = getRoleColor(field.role);
                  const isSelected = idx === selectedFieldIdx;
                  return (
                    <div
                      key={field.id}
                      className={`flex items-center gap-1.5 p-1.5 rounded text-xs cursor-pointer border ${isSelected ? "bg-accent border-primary" : "border-transparent hover:bg-muted"}`}
                      onClick={() => {
                        setSelectedFieldIdx(idx);
                        setCurrentPage(field.page);
                      }}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: roleColor }} />
                      <span className="truncate flex-1 capitalize">{field.type}</span>
                      <span className="text-muted-foreground shrink-0">p{field.page + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={(e) => { e.stopPropagation(); deleteField(idx); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedFieldIdx !== null && fields[selectedFieldIdx] && (
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Selected Field</p>
              <div>
                <label className="text-xs text-muted-foreground">Role</label>
                <Select
                  value={fields[selectedFieldIdx].role}
                  onValueChange={(v) => {
                    setFields((prev) => {
                      const copy = [...prev];
                      copy[selectedFieldIdx!] = { ...copy[selectedFieldIdx!], role: v };
                      return copy;
                    });
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNER_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                          {r.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <Select
                  value={fields[selectedFieldIdx].type}
                  onValueChange={(v) => {
                    setFields((prev) => {
                      const copy = [...prev];
                      copy[selectedFieldIdx!] = { ...copy[selectedFieldIdx!], type: v, label: v };
                      return copy;
                    });
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((ft) => (
                      <SelectItem key={ft.type} value={ft.type}>{ft.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => deleteField(selectedFieldIdx)}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Delete Field
              </Button>
            </div>
          )}

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Role Legend</p>
            <div className="space-y-1">
              {SIGNER_ROLES.map((r) => {
                const count = fields.filter((f) => f.role === r.value).length;
                return (
                  <div key={r.value} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                    <span>{r.label}</span>
                    <span className="text-muted-foreground ml-auto">{count} field{count !== 1 ? "s" : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-center gap-3 p-2 border-b bg-muted/30">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[80px] text-center">
              Page {currentPage + 1} / {pdfPages.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= pdfPages.length - 1}
              onClick={() => setCurrentPage((p) => Math.min(pdfPages.length - 1, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="border-l pl-3 flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setScale((s) => Math.max(0.25, s - 0.15))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setScale((s) => Math.min(2, s + 0.15))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div ref={containerRef} className="flex-1 overflow-auto bg-muted/50 flex items-start justify-center p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading PDF...</p>
                </div>
              </div>
            ) : loadError ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-destructive">{loadError}</p>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className={`shadow-lg ${placingType ? "cursor-crosshair" : "cursor-default"}`}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
