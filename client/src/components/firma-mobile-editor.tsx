import { useState, useRef, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileSignature, Type, Calendar, CheckSquare, Hash, Trash2,
  Plus, Send, Save, ChevronLeft, ChevronRight, Loader2, X,
  UserPlus, Users, GripVertical, ZoomIn, ZoomOut
} from "lucide-react";

interface MobileField {
  id?: string;
  type: string;
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  assignedTo?: string;
}

interface Signer {
  id?: string;
  name: string;
  email: string;
}

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

interface FirmaMobileEditorProps {
  signingRequestId: string;
  onClose: () => void;
  onSent: () => void;
}

export default function FirmaMobileEditor({ signingRequestId, onClose, onSent }: FirmaMobileEditorProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [pdfPages, setPdfPages] = useState<ImageBitmap[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [fields, setFields] = useState<MobileField[]>([]);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(null);
  const [placingType, setPlacingType] = useState<string | null>(null);
  const [showSigners, setShowSigners] = useState(false);
  const [showFieldTypes, setShowFieldTypes] = useState(false);
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [scale, setScale] = useState(1);
  const [pdfDims, setPdfDims] = useState<{ width: number; height: number }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; fieldIdx: number } | null>(null);

  useEffect(() => {
    loadDocument();
    loadFieldsAndUsers();
  }, [signingRequestId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/firma/signing-requests/${signingRequestId}/document`, { credentials: "include" });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Failed to load document (${res.status})`);
      }
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
      console.error("Failed to load PDF:", err);
      setLoadError(err.message || "Failed to load document");
      toast({ title: "Failed to load document", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadFieldsAndUsers = async () => {
    try {
      const res = await fetch(`/api/firma/signing-requests/${signingRequestId}/mobile-data`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.fields?.length) {
          setFields(data.fields.map((f: any) => ({
            id: f.id,
            type: f.type || "signature",
            label: f.label || f.type || "signature",
            page: f.page || 0,
            x: f.x || 0,
            y: f.y || 0,
            width: f.width || FIELD_DEFAULTS[f.type]?.width || 200,
            height: f.height || FIELD_DEFAULTS[f.type]?.height || 60,
            required: f.required !== false,
            assignedTo: f.assignedTo,
          })));
        }
        if (data.signers?.length) {
          setSigners(data.signers.map((s: any) => ({
            id: s.id || `local-${Date.now()}-${Math.random()}`,
            name: s.name,
            email: s.email,
          })));
        }
      }
    } catch (err) {
      console.error("Failed to load saved data:", err);
    }
  };

  useEffect(() => {
    renderPage();
  }, [currentPage, pdfPages, fields, selectedFieldIdx, scale]);

  const renderPage = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !pdfPages[currentPage] || !container) return;

    const img = pdfPages[currentPage];
    const dim = pdfDims[currentPage];
    if (!dim) return;

    const containerWidth = container.clientWidth;
    const baseScale = containerWidth / dim.width;
    const renderScale = baseScale * scale;

    canvas.width = dim.width * renderScale;
    canvas.height = dim.height * renderScale;
    canvas.style.width = `${dim.width * renderScale}px`;
    canvas.style.height = `${dim.height * renderScale}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pageFields = fields.filter(f => f.page === currentPage);
    pageFields.forEach((field, idx) => {
      const actualIdx = fields.indexOf(field);
      const isSelected = actualIdx === selectedFieldIdx;
      const fieldType = FIELD_TYPES.find(t => t.type === field.type);
      const color = fieldType?.color || "#7c3aed";

      const fx = field.x * renderScale;
      const fy = field.y * renderScale;
      const fw = field.width * renderScale;
      const fh = field.height * renderScale;

      ctx.fillStyle = isSelected ? `${color}33` : `${color}1a`;
      ctx.fillRect(fx, fy, fw, fh);

      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash(isSelected ? [] : [4, 4]);
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = `bold ${Math.max(11, 13 * renderScale)}px system-ui`;
      ctx.fillText(field.label || field.type, fx + 4 * renderScale, fy + fh - 4 * renderScale);

      if (isSelected) {
        const handleSize = 8 * renderScale;
        ctx.fillStyle = color;
        ctx.fillRect(fx + fw - handleSize, fy + fh - handleSize, handleSize, handleSize);
      }
    });
  }, [currentPage, pdfPages, fields, selectedFieldIdx, scale, pdfDims]);

  const getCanvasCoords = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const container = containerRef.current;
    if (!container) return null;
    const dim = pdfDims[currentPage];
    if (!dim) return null;
    const containerWidth = container.clientWidth;
    const baseScale = containerWidth / dim.width;
    const renderScale = baseScale * scale;

    const x = (clientX - rect.left) / renderScale;
    const y = (clientY - rect.top) / renderScale;
    return { x, y };
  };

  const handleCanvasTap = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (placingType) {
      const defaults = FIELD_DEFAULTS[placingType] || { width: 200, height: 60 };
      const dim = pdfDims[currentPage];
      const maxX = dim ? dim.width - defaults.width : Infinity;
      const maxY = dim ? dim.height - defaults.height : Infinity;
      const newField: MobileField = {
        type: placingType,
        label: FIELD_TYPES.find(t => t.type === placingType)?.label || placingType,
        page: currentPage,
        x: Math.min(Math.max(0, coords.x - defaults.width / 2), maxX),
        y: Math.min(Math.max(0, coords.y - defaults.height / 2), maxY),
        width: defaults.width,
        height: defaults.height,
        required: true,
        assignedTo: signers[0]?.id,
      };
      setFields(prev => [...prev, newField]);
      setSelectedFieldIdx(fields.length);
      setPlacingType(null);
      setShowFieldTypes(false);
      return;
    }

    const pageFields = fields.filter(f => f.page === currentPage);
    let tappedIdx = -1;
    for (let i = pageFields.length - 1; i >= 0; i--) {
      const f = pageFields[i];
      if (coords.x >= f.x && coords.x <= f.x + f.width &&
          coords.y >= f.y && coords.y <= f.y + f.height) {
        tappedIdx = fields.indexOf(pageFields[i]);
        break;
      }
    }
    setSelectedFieldIdx(tappedIdx >= 0 ? tappedIdx : null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (placingType) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    const pageFields = fields.filter(f => f.page === currentPage);
    for (let i = pageFields.length - 1; i >= 0; i--) {
      const f = pageFields[i];
      if (coords.x >= f.x && coords.x <= f.x + f.width &&
          coords.y >= f.y && coords.y <= f.y + f.height) {
        const idx = fields.indexOf(pageFields[i]);
        setSelectedFieldIdx(idx);
        dragRef.current = { startX: coords.x - f.x, startY: coords.y - f.y, fieldIdx: idx };
        e.preventDefault();
        return;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    e.preventDefault();

    const { startX, startY, fieldIdx } = dragRef.current;
    setFields(prev => prev.map((f, i) => {
      if (i !== fieldIdx) return f;
      const dim = pdfDims[f.page];
      const maxX = dim ? dim.width - f.width : Infinity;
      const maxY = dim ? dim.height - f.height : Infinity;
      return {
        ...f,
        x: Math.min(Math.max(0, coords.x - startX), maxX),
        y: Math.min(Math.max(0, coords.y - startY), maxY),
      };
    }));
  };

  const handleTouchEnd = () => {
    dragRef.current = null;
  };

  const deleteSelectedField = () => {
    if (selectedFieldIdx === null) return;
    setFields(prev => prev.filter((_, i) => i !== selectedFieldIdx));
    setSelectedFieldIdx(null);
  };

  const handleSave = async (silent = false): Promise<boolean> => {
    setSaving(true);
    try {
      await apiRequest("POST", `/api/firma/signing-requests/${signingRequestId}/mobile-save`, {
        fields: fields.map(f => ({
          type: f.type,
          label: f.label,
          page: f.page,
          x: Math.round(f.x),
          y: Math.round(f.y),
          width: Math.round(f.width),
          height: Math.round(f.height),
          required: f.required,
          assignedTo: f.assignedTo,
        })),
        signers: signers.map(s => ({ name: s.name, email: s.email })),
      });
      if (!silent) toast({ title: "Saved" });
      return true;
    } catch (err: any) {
      console.error("Save failed:", err);
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (signers.length === 0) {
      toast({ title: "Add at least one signer first", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const saved = await handleSave(true);
      if (!saved) {
        setSending(false);
        return;
      }
      await apiRequest("POST", `/api/firma/signing-requests/${signingRequestId}/mobile-send`);
      await apiRequest("POST", `/api/firma/signing-requests/${signingRequestId}/mark-sent`);
      toast({ title: "Signing request sent!" });
      onSent();
    } catch (err: any) {
      console.error("Send failed:", err);
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const addSigner = () => {
    if (!newSignerName.trim() || !newSignerEmail.trim()) return;
    const newSigner: Signer = {
      id: `local-${Date.now()}`,
      name: newSignerName.trim(),
      email: newSignerEmail.trim(),
    };
    setSigners(prev => [...prev, newSigner]);
    setNewSignerName("");
    setNewSignerEmail("");
    toast({ title: "Signer added" });
  };

  const removeSigner = (signerId: string) => {
    setSigners(prev => prev.filter(s => s.id !== signerId));
    setFields(prev => prev.map(f => f.assignedTo === signerId ? { ...f, assignedTo: undefined } : f));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center" style={{ colorScheme: "light" }}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500 mt-2">Loading document...</p>
      </div>
    );
  }

  if (loadError && pdfPages.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-3 px-6" style={{ colorScheme: "light" }}>
        <X className="h-10 w-10 text-red-400" />
        <p className="text-sm font-medium text-gray-700 text-center">Failed to load document</p>
        <p className="text-xs text-gray-500 text-center">{loadError}</p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => { setLoadError(null); loadDocument(); }}>
            Try Again
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ colorScheme: "light" }}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-white shrink-0">
        <button onClick={onClose} className="p-1">
          <X className="h-5 w-5 text-gray-700" />
        </button>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="h-8 text-xs">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            <span className="ml-1">Save</span>
          </Button>
          <Button size="sm" onClick={handleSend} disabled={sending} className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white">
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            <span className="ml-1">Send</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-1 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-xs text-gray-600 font-medium">{currentPage + 1} / {pdfPages.length}</span>
          <button onClick={() => setCurrentPage(p => Math.min(pdfPages.length - 1, p + 1))} disabled={currentPage >= pdfPages.length - 1} className="p-1 disabled:opacity-30">
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1">
            <ZoomOut className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-xs text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1">
            <ZoomIn className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSigners(!showSigners)}
            className={`p-1.5 rounded ${showSigners ? "bg-violet-100" : ""}`}
          >
            <Users className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {showSigners && (
        <div className="px-3 py-2 border-b bg-violet-50 shrink-0 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold text-violet-700 mb-2">Signers</p>
          {signers.map(s => (
            <div key={s.id || s.email} className="flex items-center justify-between py-1">
              <div className="text-xs text-gray-700">
                <span className="font-medium">{s.name}</span> — {s.email}
              </div>
              {s.id && (
                <button onClick={() => removeSigner(s.id!)} className="p-1 text-red-400">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-1 mt-2">
            <Input placeholder="Name" value={newSignerName} onChange={e => setNewSignerName(e.target.value)} className="h-7 text-xs flex-1 bg-white" />
            <Input placeholder="Email" value={newSignerEmail} onChange={e => setNewSignerEmail(e.target.value)} className="h-7 text-xs flex-1 bg-white" />
            <Button size="sm" variant="outline" onClick={addSigner} className="h-7 px-2">
              <UserPlus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {placingType && (
        <div className="px-3 py-2 bg-violet-600 text-white flex items-center justify-between shrink-0">
          <span className="text-xs font-medium">Tap on document to place {placingType} field</span>
          <button onClick={() => setPlacingType(null)} className="text-white/80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 relative" style={{ WebkitOverflowScrolling: "touch" }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasTap}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="block mx-auto"
          style={{ touchAction: placingType || dragRef.current ? "none" : "pan-x pan-y" }}
        />
      </div>

      {selectedFieldIdx !== null && fields[selectedFieldIdx] && (
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center gap-2 shrink-0">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-700">{fields[selectedFieldIdx].label}</p>
            <p className="text-[10px] text-gray-400">
              Page {fields[selectedFieldIdx].page + 1} • {Math.round(fields[selectedFieldIdx].x)}, {Math.round(fields[selectedFieldIdx].y)}
            </p>
          </div>
          {signers.length > 0 && (
            <select
              value={fields[selectedFieldIdx].assignedTo || ""}
              onChange={e => {
                const val = e.target.value;
                setFields(prev => prev.map((f, i) => i === selectedFieldIdx ? { ...f, assignedTo: val || undefined } : f));
              }}
              className="text-xs h-7 px-1 border rounded bg-white"
            >
              <option value="">Unassigned</option>
              {signers.map(s => (
                <option key={s.id || s.email} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button onClick={deleteSelectedField} className="p-1.5 text-red-500 bg-red-50 rounded">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="border-t bg-white px-2 pt-2 shrink-0" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        {showFieldTypes ? (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {FIELD_TYPES.map(ft => (
              <button
                key={ft.type}
                onClick={() => { setPlacingType(ft.type); setSelectedFieldIdx(null); }}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 shrink-0"
                style={{ borderColor: placingType === ft.type ? ft.color : "#e5e7eb" }}
              >
                <ft.icon className="h-5 w-5" style={{ color: ft.color }} />
                <span className="text-[10px] font-medium text-gray-600">{ft.label}</span>
              </button>
            ))}
            <button onClick={() => setShowFieldTypes(false)} className="px-2 py-1.5 text-gray-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFieldTypes(true)}
              className="h-9 gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Field
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
