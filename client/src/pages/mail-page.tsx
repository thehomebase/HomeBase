import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Loader2, Mail, Inbox, Send, AlertCircle, RefreshCw,
  Link2, ArrowLeft, Search, X, PenSquare, Reply, Forward,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon,
  Highlighter, Undo2, Redo2, Paperclip, FileIcon, XCircle,
  Type, Heading1, Heading2, Quote, Minus,
  FileText, Eye, EyeOff, Trash2, Pencil, Plus, BarChart3, Clock, CheckCircle2,
  Archive, MailOpen, MailX, Star, Tag, ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";

interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  labelIds: string[];
  isUnread?: boolean;
}

interface GmailMessageDetail extends GmailMessage {
  cc: string;
  body: string;
  isHtml: boolean;
}

interface InboxResponse {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
  error?: string;
}

interface EmailSnippet {
  id: number;
  userId: number;
  title: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface EmailTrackingRecord {
  id: number;
  trackingId: string;
  userId: number;
  gmailMessageId: string | null;
  recipientEmail: string;
  subject: string;
  sentAt: string | null;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  openCount: number;
}

type ViewMode = "inbox" | "compose" | "detail" | "snippets" | "tracking";

interface ComposeState {
  to: string;
  cc: string;
  subject: string;
}

interface AttachedFile {
  file: File;
  id: string;
}

const emptyCompose: ComposeState = { to: "", cc: "", subject: "" };

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const colors = [
    { label: "Default", value: "" },
    { label: "Red", value: "#dc2626" },
    { label: "Blue", value: "#2563eb" },
    { label: "Green", value: "#16a34a" },
    { label: "Purple", value: "#9333ea" },
    { label: "Orange", value: "#ea580c" },
    { label: "Gray", value: "#6b7280" },
  ];

  const btnClass = "p-1.5 rounded hover:bg-muted transition-colors";
  const activeClass = "p-1.5 rounded bg-muted text-primary";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 bg-muted/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()} className={btnClass}
              style={{ opacity: editor.can().undo() ? 1 : 0.3 }}>
              <Undo2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()} className={btnClass}
              style={{ opacity: editor.can().redo() ? 1 : 0.3 }}>
              <Redo2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().setParagraph().run()}
              className={editor.isActive("paragraph") ? activeClass : btnClass}>
              <Type className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Normal Text</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive("heading", { level: 1 }) ? activeClass : btnClass}>
              <Heading1 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Heading 1</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive("heading", { level: 2 }) ? activeClass : btnClass}>
              <Heading2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Heading 2</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive("bold") ? activeClass : btnClass}>
              <Bold className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive("italic") ? activeClass : btnClass}>
              <Italic className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Italic</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={editor.isActive("underline") ? activeClass : btnClass}>
              <Underline className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Underline</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive("strike") ? activeClass : btnClass}>
              <Strikethrough className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Strikethrough</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <div className="relative group">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className={btnClass}>
                <div className="h-4 w-4 flex items-center justify-center text-xs font-bold"
                  style={{ color: editor.getAttributes("textStyle").color || "currentColor" }}>
                  A
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent>Text Color</TooltipContent>
          </Tooltip>
          <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-md p-1.5 hidden group-hover:flex gap-1 z-50">
            {colors.map((c) => (
              <button key={c.label} type="button"
                onClick={() => c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run()}
                className="h-5 w-5 rounded-full border hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value || "currentColor" }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={editor.isActive("highlight") ? activeClass : btnClass}>
              <Highlighter className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Highlight</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={editor.isActive({ textAlign: "left" }) ? activeClass : btnClass}>
              <AlignLeft className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Align Left</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()}
              className={editor.isActive({ textAlign: "center" }) ? activeClass : btnClass}>
              <AlignCenter className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Align Center</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={editor.isActive({ textAlign: "right" }) ? activeClass : btnClass}>
              <AlignRight className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Align Right</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive("bulletList") ? activeClass : btnClass}>
              <List className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Bullet List</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive("orderedList") ? activeClass : btnClass}>
              <ListOrdered className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Numbered List</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive("blockquote") ? activeClass : btnClass}>
              <Quote className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Quote</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className={btnClass}>
              <Minus className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Horizontal Rule</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={setLink}
              className={editor.isActive("link") ? activeClass : btnClass}>
              <LinkIcon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Insert Link</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default function MailPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("inbox");
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [compose, setCompose] = useState<ComposeState>(emptyCompose);
  const [showCc, setShowCc] = useState(false);
  const [quotedHtml, setQuotedHtml] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<{ token: string | undefined }[]>([
    { token: undefined },
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder: "Write your email..." }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[250px] px-4 py-3",
      },
    },
  });

  const { data: commStatus } = useQuery<{
    twilio: boolean;
    gmail: { connected: boolean; email?: string };
  }>({
    queryKey: ["/api/communications/status"],
  });

  const gmailEmail = commStatus?.gmail?.email || "";
  const gmailConnected = commStatus?.gmail?.connected;

  const signatureQuery = useQuery<{ signature: string }>({
    queryKey: ["/api/gmail/signature"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/signature", { credentials: "include" });
      if (!res.ok) return { signature: "" };
      return res.json();
    },
    enabled: !!gmailConnected,
    staleTime: 5 * 60 * 1000,
  });

  const signature = signatureQuery.data?.signature || "";

  const snippetsQuery = useQuery<EmailSnippet[]>({
    queryKey: ["/api/snippets"],
    enabled: !!gmailConnected,
  });

  const trackingQuery = useQuery<EmailTrackingRecord[]>({
    queryKey: ["/api/email-tracking"],
    queryFn: async () => {
      const res = await fetch("/api/email-tracking", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tracking data");
      return res.json();
    },
    enabled: !!gmailConnected,
    staleTime: 30 * 1000,
  });

  const [snippetEditing, setSnippetEditing] = useState<EmailSnippet | null>(null);
  const [snippetForm, setSnippetForm] = useState({ title: "", body: "" });
  const [showSnippetPicker, setShowSnippetPicker] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLabelMenu, setShowLabelMenu] = useState(false);

  const labelsQuery = useQuery<Array<{ id: string; name: string; type: string }>>({
    queryKey: ["/api/gmail/labels"],
    enabled: !!gmailConnected,
    staleTime: 5 * 60 * 1000,
  });

  function toggleSelect(msgId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map((m) => m.id)));
    }
  }

  const bulkTrashMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/gmail/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to trash messages");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: `${selectedIds.size} email${selectedIds.size !== 1 ? "s" : ""} moved to trash` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/inbox"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to trash emails", description: err.message, variant: "destructive" });
    },
  });

  const bulkModifyMutation = useMutation({
    mutationFn: async (params: { ids: string[]; addLabelIds?: string[]; removeLabelIds?: string[] }) => {
      const res = await fetch("/api/gmail/batch-modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: params.ids, addLabelIds: params.addLabelIds, removeLabelIds: params.removeLabelIds }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to modify messages");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      const count = variables.ids.length;
      let action = "updated";
      if (variables.removeLabelIds?.includes("INBOX")) action = "archived";
      else if (variables.removeLabelIds?.includes("UNREAD")) action = "marked as read";
      else if (variables.addLabelIds?.includes("UNREAD")) action = "marked as unread";
      else if (variables.addLabelIds?.includes("STARRED")) action = "starred";
      else if (variables.removeLabelIds?.includes("STARRED")) action = "unstarred";
      toast({ title: `${count} email${count !== 1 ? "s" : ""} ${action}` });
      setSelectedIds(new Set());
      setShowLabelMenu(false);
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/inbox"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to modify emails", description: err.message, variant: "destructive" });
    },
  });

  const snippetCreateMutation = useMutation({
    mutationFn: async (data: { title: string; body: string }) => {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create snippet");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Snippet created" });
      queryClient.invalidateQueries({ queryKey: ["/api/snippets"] });
      setSnippetForm({ title: "", body: "" });
      setSnippetEditing(null);
    },
  });

  const snippetUpdateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title: string; body: string } }) => {
      const res = await fetch(`/api/snippets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update snippet");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Snippet updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/snippets"] });
      setSnippetForm({ title: "", body: "" });
      setSnippetEditing(null);
    },
  });

  const snippetDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/snippets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete snippet");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Snippet deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/snippets"] });
    },
  });

  const labelMap: Record<string, string> = {
    all: "",
    sent: "SENT",
    received: "INBOX",
  };

  const currentPageToken = pages[currentPageIndex]?.token;
  const label = labelMap[filter];

  const inboxQuery = useQuery<InboxResponse>({
    queryKey: ["/api/gmail/inbox", filter, activeSearch, currentPageToken],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentPageToken) params.set("pageToken", currentPageToken);
      if (activeSearch) params.set("q", activeSearch);
      if (label) params.set("label", label);
      params.set("maxResults", "25");
      const res = await fetch(`/api/gmail/inbox?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch inbox");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    enabled: !!gmailConnected && viewMode === "inbox",
    staleTime: 60 * 1000,
  });

  const messageQuery = useQuery<{ message: GmailMessageDetail }>({
    queryKey: ["/api/gmail/message", selectedMessageId],
    queryFn: async () => {
      const res = await fetch(`/api/gmail/message/${selectedMessageId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch message");
      return res.json();
    },
    enabled: !!selectedMessageId && viewMode === "detail",
  });

  const sendMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to send" }));
        throw new Error(err.error || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email sent" });
      resetCompose();
      setViewMode("inbox");
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/inbox"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  const messages = inboxQuery.data?.messages || [];
  const nextPageToken = inboxQuery.data?.nextPageToken;

  function resetCompose() {
    setCompose(emptyCompose);
    setShowCc(false);
    setQuotedHtml("");
    setAttachments([]);
    editor?.commands.clearContent();
  }

  function openCompose(initial?: { to?: string; cc?: string; subject?: string; quoted?: string }) {
    setCompose({ to: initial?.to || "", cc: initial?.cc || "", subject: initial?.subject || "" });
    setShowCc(!!(initial?.cc));
    setQuotedHtml(initial?.quoted || "");
    setAttachments([]);
    setTimeout(() => {
      editor?.commands.setContent("<p></p>");
      editor?.commands.focus("start");
    }, 50);
    setViewMode("compose");
  }

  function openDetail(msgId: string) {
    setSelectedMessageId(msgId);
    setViewMode("detail");
  }

  function backToInbox() {
    setViewMode("inbox");
    setSelectedMessageId(null);
  }

  function handleReply(msg: GmailMessageDetail) {
    const fromEmail = msg.from?.match(/<([^>]+)>/)?.[1] || msg.from;
    const reSubject = msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`;
    const quoted = `<div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 4px; color: #666;">` +
      `<p style="margin: 0 0 4px;"><strong>On ${msg.date}, ${msg.from} wrote:</strong></p>` +
      `${msg.body}</div>`;
    openCompose({ to: fromEmail, subject: reSubject, quoted });
  }

  function handleForward(msg: GmailMessageDetail) {
    const fwdSubject = msg.subject?.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject}`;
    const quoted = `<div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 4px; color: #666;">` +
      `<p style="margin: 0 0 4px;"><strong>---------- Forwarded message ----------</strong></p>` +
      `<p style="margin: 0;">From: ${msg.from}<br>To: ${msg.to}<br>Date: ${msg.date}<br>Subject: ${msg.subject}</p>` +
      `<br>${msg.body}</div>`;
    openCompose({ subject: fwdSubject, quoted });
  }

  function handleSend() {
    const editorHtml = editor?.getHTML() || "";
    const hasEditorContent = !!editorHtml.replace(/<[^>]*>/g, "").trim();
    const hasQuotedContent = !!quotedHtml;
    if (!compose.to || !compose.subject || (!hasEditorContent && !hasQuotedContent)) {
      toast({ title: "Please fill in To, Subject, and Body", variant: "destructive" });
      return;
    }
    let fullBody = editorHtml;
    if (signature) {
      fullBody += `<br><br><div>--<br>${signature}</div>`;
    }
    if (quotedHtml) {
      fullBody += `<br><br>${quotedHtml}`;
    }
    const formData = new FormData();
    formData.append("to", compose.to.trim());
    if (compose.cc.trim()) formData.append("cc", compose.cc.trim());
    formData.append("subject", compose.subject);
    formData.append("body", fullBody);
    attachments.forEach((att) => {
      formData.append("attachments", att.file);
    });
    sendMutation.mutate(formData);
  }

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const totalExisting = attachments.reduce((s, a) => s + a.file.size, 0);
    const totalNew = files.reduce((s, f) => s + f.size, 0);
    if (totalExisting + totalNew > 25 * 1024 * 1024) {
      toast({ title: "Total attachments can't exceed 25MB", variant: "destructive" });
      return;
    }
    const newAtts = files.map((file) => ({
      file,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    }));
    setAttachments((prev) => [...prev, ...newAtts]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(searchQuery);
    setPages([{ token: undefined }]);
    setCurrentPageIndex(0);
  }

  function clearSearch() {
    setSearchQuery("");
    setActiveSearch("");
    setPages([{ token: undefined }]);
    setCurrentPageIndex(0);
  }

  function handleFilterChange(f: "all" | "sent" | "received") {
    setFilter(f);
    setPages([{ token: undefined }]);
    setCurrentPageIndex(0);
    setSelectedIds(new Set());
    setShowLabelMenu(false);
  }

  function goNextPage() {
    if (!nextPageToken) return;
    setSelectedIds(new Set());
    setShowLabelMenu(false);
    const nextIndex = currentPageIndex + 1;
    if (nextIndex >= pages.length) {
      setPages((prev) => [...prev, { token: nextPageToken }]);
    }
    setCurrentPageIndex(nextIndex);
  }

  function goPrevPage() {
    if (currentPageIndex > 0) {
      setSelectedIds(new Set());
      setShowLabelMenu(false);
      setCurrentPageIndex(currentPageIndex - 1);
    }
  }

  function extractName(header: string): string {
    const nameMatch = header?.match(/^([^<]+)</);
    if (nameMatch) return nameMatch[1].trim().replace(/"/g, "");
    const emailMatch = header?.match(/<([^>]+)>/);
    if (emailMatch) return emailMatch[1];
    return header || "";
  }

  if (!gmailConnected) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Mail className="h-6 w-6" /> Mail
        </h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h3 className="text-lg font-medium mb-2">Gmail Not Connected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Gmail account to view and send emails here.
              You can connect it from any client's contact dialog.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewMode === "compose") {
    const totalAttSize = attachments.reduce((s, a) => s + a.file.size, 0);

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-4" onClick={backToInbox}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to inbox
        </Button>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 pb-0">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <PenSquare className="h-5 w-5" /> New Email
              </h2>

              <div className="text-sm text-muted-foreground mb-3">
                From: {gmailEmail}
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="to" className="w-10 text-sm text-right shrink-0">To</Label>
                  <Input
                    id="to"
                    type="email"
                    placeholder="recipient@example.com"
                    value={compose.to}
                    onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))}
                    className="flex-1"
                  />
                  {!showCc && (
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground shrink-0"
                      onClick={() => setShowCc(true)}>
                      Cc
                    </Button>
                  )}
                </div>

                {showCc && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="cc" className="w-10 text-sm text-right shrink-0">Cc</Label>
                    <Input
                      id="cc"
                      type="text"
                      placeholder="cc@example.com"
                      value={compose.cc}
                      onChange={(e) => setCompose((c) => ({ ...c, cc: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Label htmlFor="subject" className="w-10 text-sm text-right shrink-0">Sub</Label>
                  <Input
                    id="subject"
                    placeholder="Subject"
                    value={compose.subject}
                    onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center border-b">
              <div className="flex-1">
                <EditorToolbar editor={editor} />
              </div>
              <div className="relative px-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button"
                        onClick={() => setShowSnippetPicker(!showSnippetPicker)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border hover:bg-muted transition-colors">
                        <FileText className="h-3.5 w-3.5" /> Snippets
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Insert a saved template</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {showSnippetPicker && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-background border rounded-lg shadow-lg w-64 max-h-[300px] overflow-auto">
                    <div className="p-2 border-b">
                      <p className="text-xs font-medium text-muted-foreground">Insert snippet</p>
                    </div>
                    {(snippetsQuery.data || []).length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No snippets yet.
                        <button className="block mx-auto mt-1 text-primary underline"
                          onClick={() => { setShowSnippetPicker(false); setViewMode("snippets"); }}>
                          Create one
                        </button>
                      </div>
                    ) : (
                      (snippetsQuery.data || []).map((s) => (
                        <button key={s.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0 transition-colors"
                          onClick={() => {
                            editor?.chain().focus().insertContent(s.body).run();
                            setShowSnippetPicker(false);
                          }}>
                          <p className="text-sm font-medium truncate">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.body.replace(/<[^>]*>/g, "").slice(0, 60)}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-b">
              <EditorContent editor={editor} />
            </div>

            {(signature || quotedHtml) && (
              <div className="px-4 py-3 border-b bg-muted/10 space-y-3">
                {signature && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Your signature will be included:</p>
                    <div className="border-t pt-2 text-sm text-muted-foreground">
                      <p className="mb-1">--</p>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(signature, {
                            USE_PROFILES: { html: true },
                            ADD_TAGS: ["img"],
                            ADD_ATTR: ["src", "alt", "width", "height", "style", "target", "href"],
                          }),
                        }}
                      />
                    </div>
                  </div>
                )}
                {quotedHtml && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Previous messages:</p>
                    <div
                      className="text-sm overflow-auto max-h-[300px]"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(quotedHtml, {
                          USE_PROFILES: { html: true },
                          ADD_TAGS: ["img"],
                          ADD_ATTR: ["src", "alt", "width", "height", "style", "target", "href"],
                        }),
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {attachments.length > 0 && (
              <div className="px-4 py-2 border-b bg-muted/20">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div key={att.id}
                      className="flex items-center gap-1.5 bg-background border rounded-md px-2 py-1 text-sm">
                      <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[150px]">{att.file.name}</span>
                      <span className="text-xs text-muted-foreground">({formatFileSize(att.file.size)})</span>
                      <button type="button" onClick={() => removeAttachment(att.id)}
                        className="ml-1 text-muted-foreground hover:text-destructive">
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {attachments.length} file{attachments.length !== 1 ? "s" : ""} ({formatFileSize(totalAttSize)} / 25 MB)
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 p-4">
              <Button onClick={handleSend} disabled={sendMutation.isPending}>
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAddFiles}
              />
              <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}
                title="Attach files">
                <Paperclip className="h-4 w-4" />
              </Button>

              <div className="flex-1" />
              <Button variant="ghost" onClick={() => { resetCompose(); backToInbox(); }}>
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewMode === "snippets") {
    const snippets = snippetsQuery.data || [];
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-4" onClick={backToInbox}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to inbox
        </Button>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" /> Email Snippets
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Create reusable templates you can insert into any email with two clicks.
            </p>

            <div className="border rounded-lg p-4 mb-4 space-y-3">
              <h3 className="text-sm font-medium">
                {snippetEditing ? "Edit Snippet" : "New Snippet"}
              </h3>
              <Input
                placeholder="Snippet title (e.g., Showing Confirmation)"
                value={snippetForm.title}
                onChange={(e) => setSnippetForm((f) => ({ ...f, title: e.target.value }))}
              />
              <textarea
                className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md bg-background resize-y"
                placeholder="Snippet body — paste or type your template text here..."
                value={snippetForm.body}
                onChange={(e) => setSnippetForm((f) => ({ ...f, body: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button size="sm"
                  disabled={!snippetForm.title.trim() || !snippetForm.body.trim()}
                  onClick={() => {
                    if (snippetEditing) {
                      snippetUpdateMutation.mutate({ id: snippetEditing.id, data: snippetForm });
                    } else {
                      snippetCreateMutation.mutate(snippetForm);
                    }
                  }}>
                  {snippetEditing ? "Update" : "Save"} Snippet
                </Button>
                {snippetEditing && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSnippetEditing(null);
                    setSnippetForm({ title: "", body: "" });
                  }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {snippetsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : snippets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No snippets yet. Create your first one above.</p>
            ) : (
              <div className="space-y-2">
                {snippets.map((s) => (
                  <div key={s.id} className="border rounded-lg p-3 flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {s.body.replace(/<[^>]*>/g, "").slice(0, 120)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => {
                          setSnippetEditing(s);
                          setSnippetForm({ title: s.title, body: s.body });
                        }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => snippetDeleteMutation.mutate(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewMode === "tracking") {
    const records = trackingQuery.data || [];
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-4" onClick={backToInbox}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to inbox
        </Button>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Read Receipts
              </h2>
              <Button variant="outline" size="sm" onClick={() => trackingQuery.refetch()}
                disabled={trackingQuery.isFetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${trackingQuery.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Track when recipients open your emails. A notification appears when they view your message.
            </p>

            {trackingQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tracked emails yet. All emails sent from here automatically include read tracking.
              </p>
            ) : (
              <div className="space-y-2">
                {records.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3 flex items-start gap-3">
                    <div className="mt-0.5">
                      {r.openCount > 0 ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{r.subject}</p>
                        {r.openCount > 0 && (
                          <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                            <CheckCircle2 className="h-3 w-3" /> Read
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        To: {r.recipientEmail}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Sent: {r.sentAt ? format(new Date(r.sentAt), "MMM d, h:mm a") : "—"}
                        </span>
                        {r.openCount > 0 && (
                          <>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              First opened: {r.firstOpenedAt ? format(new Date(r.firstOpenedAt), "MMM d, h:mm a") : "—"}
                            </span>
                            <span>
                              Opened {r.openCount} time{r.openCount !== 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewMode === "detail") {
    const msg = messageQuery.data?.message;
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-4" onClick={backToInbox}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to inbox
        </Button>

        {messageQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messageQuery.isError || !msg ? (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load email.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {msg.subject || "(no subject)"}
              </h2>
              <div className="space-y-1 mb-4 text-sm text-muted-foreground border-b pb-4">
                <p><span className="font-medium text-foreground">From:</span> {msg.from}</p>
                <p><span className="font-medium text-foreground">To:</span> {msg.to}</p>
                {msg.cc && <p><span className="font-medium text-foreground">Cc:</span> {msg.cc}</p>}
                <p>
                  <span className="font-medium text-foreground">Date:</span>{" "}
                  {msg.date ? format(new Date(msg.date), "EEEE, MMMM d, yyyy 'at' h:mm a") : ""}
                </p>
              </div>

              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => handleReply(msg)}>
                  <Reply className="h-4 w-4 mr-1" /> Reply
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleForward(msg)}>
                  <Forward className="h-4 w-4 mr-1" /> Forward
                </Button>
              </div>

              <div
                className="prose prose-sm dark:prose-invert max-w-none overflow-auto"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(msg.body, { USE_PROFILES: { html: true } }),
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" /> Mail
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Link2 className="h-3 w-3" /> {gmailEmail}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => openCompose()}>
            <PenSquare className="h-4 w-4 mr-2" /> Compose
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode("snippets")}>
            <FileText className="h-4 w-4 mr-2" /> Snippets
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode("tracking")}>
            <Eye className="h-4 w-4 mr-2" /> Tracking
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => inboxQuery.refetch()} disabled={inboxQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${inboxQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {(searchQuery || activeSearch) && (
            <button type="button" onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" size="sm" variant="secondary">Search</Button>
      </form>

      <div className="flex gap-2 mb-4">
        {(["all", "sent", "received"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
            onClick={() => handleFilterChange(f)}>
            {f === "all" && <Inbox className="h-4 w-4 mr-1" />}
            {f === "sent" && <Send className="h-4 w-4 mr-1" />}
            {f === "received" && <Mail className="h-4 w-4 mr-1" />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {activeSearch && (
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <Search className="h-3 w-3" />
          Results for "{activeSearch}"
          <button onClick={clearSearch} className="underline hover:text-foreground">Clear</button>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex items-center gap-2 mb-3 border rounded-lg px-3 py-2 bg-muted/30">
          <input
            type="checkbox"
            checked={messages.length > 0 && selectedIds.size === messages.length}
            ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < messages.length; }}
            onChange={selectAll}
            className="h-4 w-4 rounded border-muted-foreground/50 cursor-pointer"
          />
          {selectedIds.size > 0 ? (
            <>
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <div className="h-4 w-px bg-border mx-1" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      disabled={bulkModifyMutation.isPending}
                      onClick={() => bulkModifyMutation.mutate({ ids: [...selectedIds], removeLabelIds: ["INBOX"] })}>
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Archive</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      disabled={bulkTrashMutation.isPending}
                      onClick={() => bulkTrashMutation.mutate([...selectedIds])}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      disabled={bulkModifyMutation.isPending}
                      onClick={() => bulkModifyMutation.mutate({ ids: [...selectedIds], removeLabelIds: ["UNREAD"] })}>
                      <MailOpen className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as read</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      disabled={bulkModifyMutation.isPending}
                      onClick={() => bulkModifyMutation.mutate({ ids: [...selectedIds], addLabelIds: ["UNREAD"] })}>
                      <MailX className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as unread</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      disabled={bulkModifyMutation.isPending}
                      onClick={() => bulkModifyMutation.mutate({ ids: [...selectedIds], addLabelIds: ["STARRED"] })}>
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Star</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => setShowLabelMenu(!showLabelMenu)}>
                        <Tag className="h-3.5 w-3.5 mr-1" /> Label <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Apply label</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {showLabelMenu && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-background border rounded-lg shadow-lg w-48 max-h-[250px] overflow-auto">
                    <div className="p-2 border-b">
                      <p className="text-xs font-medium text-muted-foreground">Apply label</p>
                    </div>
                    {(labelsQuery.data || []).length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground text-center">No labels found</p>
                    ) : (
                      (labelsQuery.data || []).map((label) => (
                        <button key={label.id}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                          onClick={() => {
                            bulkModifyMutation.mutate({ ids: [...selectedIds], addLabelIds: [label.id] });
                          }}>
                          {label.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {(bulkTrashMutation.isPending || bulkModifyMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Select emails</span>
          )}
        </div>
      )}

      {inboxQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading inbox...</span>
        </div>
      ) : inboxQuery.isError ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load inbox. Try refreshing.</p>
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              {activeSearch ? "No emails match your search." : "No emails found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            {messages.map((msg) => {
              const isFromAgent = msg.from?.toLowerCase().includes(gmailEmail.toLowerCase());
              const displayName = isFromAgent
                ? `To: ${extractName(msg.to)}`
                : extractName(msg.from);
              const msgDate = msg.date ? new Date(msg.date) : new Date();
              const isToday = new Date().toDateString() === msgDate.toDateString();
              const isThisYear = new Date().getFullYear() === msgDate.getFullYear();

              const trackingRecord = isFromAgent
                ? (trackingQuery.data || []).find((t) => t.gmailMessageId === msg.id)
                : undefined;
              const wasOpened = trackingRecord && trackingRecord.openCount > 0;

              return (
                <div key={msg.id}
                  className={`flex items-start gap-3 p-3 hover:bg-muted/50 border-b last:border-b-0 cursor-pointer transition-colors ${
                    msg.isUnread ? "bg-primary/5" : ""
                  } ${selectedIds.has(msg.id) ? "bg-primary/10" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(msg.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(msg.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 mt-1 rounded border-muted-foreground/50 cursor-pointer shrink-0"
                  />
                  <div className="mt-1 shrink-0" onClick={() => openDetail(msg.id)}>
                    {isFromAgent ? (
                      wasOpened ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <Send className="h-4 w-4 text-blue-500" />
                      )
                    ) : (
                      <Inbox className="h-4 w-4 text-purple-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => openDetail(msg.id)}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate ${msg.isUnread ? "font-bold" : "font-medium"}`}>
                        {displayName}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        {isToday
                          ? format(msgDate, "h:mm a")
                          : isThisYear
                          ? format(msgDate, "MMM d")
                          : format(msgDate, "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${msg.isUnread ? "font-semibold" : ""}`}>
                      {msg.subject || "(no subject)"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{msg.snippet}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" onClick={goPrevPage}
              disabled={currentPageIndex === 0}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {currentPageIndex + 1}</span>
            <Button variant="outline" size="sm" onClick={goNextPage}
              disabled={!nextPageToken}>
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
