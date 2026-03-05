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
  Type, Heading1, Heading2, Quote, Minus
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

type ViewMode = "inbox" | "compose" | "detail";

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
    setAttachments([]);
    editor?.commands.clearContent();
  }

  function buildEditorContent(body?: string): string {
    const sigBlock = signature
      ? `<div style="margin-top: 16px;" data-signature="true"><p>--</p>${signature}</div>`
      : "";
    if (body) {
      return `<p></p>${body}${sigBlock}`;
    }
    return `<p></p>${sigBlock}`;
  }

  function openCompose(initial?: { to?: string; cc?: string; subject?: string; body?: string }) {
    setCompose({ to: initial?.to || "", cc: initial?.cc || "", subject: initial?.subject || "" });
    setShowCc(!!(initial?.cc));
    setAttachments([]);
    setTimeout(() => {
      editor?.commands.setContent(buildEditorContent(initial?.body));
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
    const quoted = `<br><br><div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 4px; color: #666;">` +
      `<p style="margin: 0 0 4px;"><strong>On ${msg.date}, ${msg.from} wrote:</strong></p>` +
      `${msg.body}</div>`;
    openCompose({ to: fromEmail, subject: reSubject, body: quoted });
  }

  function handleForward(msg: GmailMessageDetail) {
    const fwdSubject = msg.subject?.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject}`;
    const fwdBody = `<br><br><div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 4px; color: #666;">` +
      `<p style="margin: 0 0 4px;"><strong>---------- Forwarded message ----------</strong></p>` +
      `<p style="margin: 0;">From: ${msg.from}<br>To: ${msg.to}<br>Date: ${msg.date}<br>Subject: ${msg.subject}</p>` +
      `<br>${msg.body}</div>`;
    openCompose({ subject: fwdSubject, body: fwdBody });
  }

  function handleSend() {
    const htmlBody = editor?.getHTML() || "";
    if (!compose.to || !compose.subject || !htmlBody.replace(/<[^>]*>/g, "").trim()) {
      toast({ title: "Please fill in To, Subject, and Body", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("to", compose.to.trim());
    if (compose.cc.trim()) formData.append("cc", compose.cc.trim());
    formData.append("subject", compose.subject);
    formData.append("body", htmlBody);
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
  }

  function goNextPage() {
    if (!nextPageToken) return;
    const nextIndex = currentPageIndex + 1;
    if (nextIndex >= pages.length) {
      setPages((prev) => [...prev, { token: nextPageToken }]);
    }
    setCurrentPageIndex(nextIndex);
  }

  function goPrevPage() {
    if (currentPageIndex > 0) setCurrentPageIndex(currentPageIndex - 1);
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

            <EditorToolbar editor={editor} />

            <div className="border-b">
              <EditorContent editor={editor} />
            </div>

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

              return (
                <div key={msg.id} onClick={() => openDetail(msg.id)}
                  className={`flex items-start gap-3 p-3 hover:bg-muted/50 border-b last:border-b-0 cursor-pointer transition-colors ${
                    msg.isUnread ? "bg-primary/5" : ""
                  }`}>
                  <div className="mt-1">
                    {isFromAgent ? (
                      <Send className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Inbox className="h-4 w-4 text-purple-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
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
