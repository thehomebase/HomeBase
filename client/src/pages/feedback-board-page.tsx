import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronUp,
  Plus,
  Lightbulb,
  Bug,
  Image as ImageIcon,
  Clipboard,
  X,
  Trash2,
  MessageSquare,
} from "lucide-react";

type FeedbackPostWithMeta = {
  id: number;
  userId: number;
  type: string;
  title: string;
  description: string;
  status: string;
  adminNote: string | null;
  screenshotUrls: string[] | null;
  voteCount: number;
  createdAt: string;
  authorName: string;
  voted: boolean;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  under_review: { label: "Under Review", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "bg-yellow-500" },
  planned: { label: "Planned", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", dot: "bg-blue-500" },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", dot: "bg-purple-500" },
  complete: { label: "Complete", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", dot: "bg-green-500" },
  declined: { label: "Declined", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", dot: "bg-gray-400" },
};

function PostCard({ post, isAdmin, currentUserId, onVote }: { post: FeedbackPostWithMeta; isAdmin: boolean; currentUserId: number; onVote: () => void }) {
  const { toast } = useToast();
  const [showDetail, setShowDetail] = useState(false);
  const [adminStatus, setAdminStatus] = useState(post.status);
  const [adminNote, setAdminNote] = useState(post.adminNote || "");

  const voteMutation = useMutation({
    mutationFn: async () => {
      if (post.voted) {
        await apiRequest("DELETE", `/api/feedback-board/${post.id}/vote`);
      } else {
        await apiRequest("POST", `/api/feedback-board/${post.id}/vote`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback-board"] });
    },
    onError: (err: Error) => {
      toast({ title: "Vote failed", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/feedback-board/${post.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback-board"] });
      toast({ title: "Updated" });
      setShowDetail(false);
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/feedback-board/${post.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback-board"] });
      toast({ title: "Deleted" });
      setShowDetail(false);
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const statusInfo = STATUS_CONFIG[post.status] || STATUS_CONFIG.under_review;
  const screenshots = Array.isArray(post.screenshotUrls) ? post.screenshotUrls : [];

  return (
    <>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowDetail(true)}>
        <CardContent className="p-4 flex gap-3">
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); voteMutation.mutate(); }}
              className={`p-1 rounded transition-colors ${post.voted ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <span className={`text-sm font-semibold ${post.voted ? "text-primary" : "text-muted-foreground"}`}>
              {post.voteCount}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-medium text-sm leading-tight line-clamp-2 flex-1">{post.title}</h3>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusInfo.color}`}>
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{post.description}</p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{post.authorName}</span>
              <span>·</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              {screenshots.length > 0 && (
                <>
                  <span>·</span>
                  <ImageIcon className="h-3 w-3" />
                  <span>{screenshots.length}</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {post.type === "feature_request" ? (
                <Lightbulb className="h-5 w-5 text-yellow-500" />
              ) : (
                <Bug className="h-5 w-5 text-red-500" />
              )}
              <DialogTitle className="text-lg">{post.title}</DialogTitle>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
              <span className="text-xs text-muted-foreground">by {post.authorName}</span>
              <span className="text-xs text-muted-foreground">· {new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm whitespace-pre-wrap">{post.description}</p>
            {screenshots.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Screenshots</Label>
                <div className="grid grid-cols-2 gap-2">
                  {screenshots.map((url: string, i: number) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="rounded border object-cover w-full h-32 cursor-pointer hover:opacity-90"
                      onClick={() => window.open(url, "_blank")}
                    />
                  ))}
                </div>
              </div>
            )}
            {post.adminNote && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-medium mb-1">Admin Response</p>
                <p className="text-sm">{post.adminNote}</p>
              </div>
            )}
            {isAdmin && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase">Admin Controls</p>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={adminStatus} onValueChange={setAdminStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Admin Note</Label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add a response to this feedback..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate({ status: adminStatus, adminNote: adminNote || null })}
                  disabled={updateMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                variant={post.voted ? "default" : "outline"}
                size="sm"
                onClick={() => voteMutation.mutate()}
                disabled={voteMutation.isPending}
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                {post.voteCount}
              </Button>
            </div>
            {(isAdmin || post.userId === currentUserId) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RoadmapBoard({ posts, isAdmin, currentUserId }: { posts: FeedbackPostWithMeta[]; isAdmin: boolean; currentUserId: number }) {
  const columns = [
    { key: "planned", label: "Planned", dot: "bg-blue-500" },
    { key: "in_progress", label: "In Progress", dot: "bg-purple-500" },
    { key: "complete", label: "Complete", dot: "bg-green-500" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(col => {
        const items = posts.filter(p => p.status === col.key);
        return (
          <div key={col.key} className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
              <span className="font-medium text-sm">{col.label}</span>
              <Badge variant="secondary" className="text-xs ml-auto">{items.length}</Badge>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No items yet</p>
            ) : (
              items.map(p => <PostCard key={p.id} post={p} isAdmin={isAdmin} currentUserId={currentUserId} onVote={() => {}} />)
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FeedbackBoardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const currentUserId = user?.id || 0;
  const [activeTab, setActiveTab] = useState("feature_request");
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitType, setSubmitType] = useState<"feature_request" | "bug_report">("feature_request");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLTextAreaElement>(null);

  const { data: posts = [], isLoading, error: queryError } = useQuery<FeedbackPostWithMeta[]>({
    queryKey: ["/api/feedback-board"],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/feedback-board", {
        type: submitType,
        title,
        description,
        screenshotUrls: screenshots.length > 0 ? screenshots : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback-board"] });
      toast({ title: "Submitted!", description: "Thanks for your feedback." });
      setShowSubmit(false);
      setTitle("");
      setDescription("");
      setScreenshots([]);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file || screenshots.length >= 5) return;
        const formData = new FormData();
        formData.append("screenshot", file);
        try {
          const res = await fetch("/api/feedback-board/upload-screenshot", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          const data = await res.json();
          if (data.url) {
            setScreenshots(prev => [...prev, data.url]);
            toast({ title: "Screenshot added" });
          }
        } catch {
          toast({ title: "Failed to upload screenshot", variant: "destructive" });
        }
        break;
      }
    }
  }, [screenshots, toast]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || screenshots.length >= 5) return;
    const formData = new FormData();
    formData.append("screenshot", file);
    try {
      const res = await fetch("/api/feedback-board/upload-screenshot", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        setScreenshots(prev => [...prev, data.url]);
      }
    } catch {
      toast({ title: "Failed to upload", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [screenshots, toast]);

  const featureRequests = posts.filter(p => p.type === "feature_request");
  const bugReports = posts.filter(p => p.type === "bug_report");

  const openSubmitDialog = (type: "feature_request" | "bug_report") => {
    setSubmitType(type);
    setTitle("");
    setDescription("");
    setScreenshots([]);
    setShowSubmit(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <Bug className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="font-medium mb-1">Failed to load feedback</p>
            <p className="text-sm text-muted-foreground">Please try refreshing the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Feedback Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Request features, report issues, and vote on what matters most
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="feature_request" className="gap-1.5">
              <Lightbulb className="h-4 w-4" />
              Feature Requests
              <Badge variant="secondary" className="ml-1 text-xs">{featureRequests.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="bug_report" className="gap-1.5">
              <Bug className="h-4 w-4" />
              Bug Reports
              <Badge variant="secondary" className="ml-1 text-xs">{bugReports.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Roadmap
            </TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => openSubmitDialog(activeTab === "bug_report" ? "bug_report" : "feature_request")}>
            <Plus className="h-4 w-4 mr-1" />
            {activeTab === "bug_report" ? "Report Bug" : "Request Feature"}
          </Button>
        </div>

        <TabsContent value="feature_request" className="space-y-3">
          {featureRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">No feature requests yet</p>
                <p className="text-sm text-muted-foreground mb-4">Be the first to suggest a new feature!</p>
                <Button size="sm" onClick={() => openSubmitDialog("feature_request")}>
                  <Plus className="h-4 w-4 mr-1" />
                  Request Feature
                </Button>
              </CardContent>
            </Card>
          ) : (
            featureRequests.map(p => <PostCard key={p.id} post={p} isAdmin={isAdmin} currentUserId={currentUserId} onVote={() => {}} />)
          )}
        </TabsContent>

        <TabsContent value="bug_report" className="space-y-3">
          {bugReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">No bug reports yet</p>
                <p className="text-sm text-muted-foreground mb-4">Report any issues you encounter.</p>
                <Button size="sm" onClick={() => openSubmitDialog("bug_report")}>
                  <Plus className="h-4 w-4 mr-1" />
                  Report Bug
                </Button>
              </CardContent>
            </Card>
          ) : (
            bugReports.map(p => <PostCard key={p.id} post={p} isAdmin={isAdmin} currentUserId={currentUserId} onVote={() => {}} />)
          )}
        </TabsContent>

        <TabsContent value="roadmap">
          <RoadmapBoard posts={featureRequests} isAdmin={isAdmin} currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>

      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {submitType === "feature_request" ? (
                <><Lightbulb className="h-5 w-5 text-yellow-500" /> Request a Feature</>
              ) : (
                <><Bug className="h-5 w-5 text-red-500" /> Report a Bug</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={submitType === "feature_request" ? "Brief summary of your idea" : "What went wrong?"}
                maxLength={200}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea
                ref={pasteAreaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onPaste={handlePaste}
                placeholder={
                  submitType === "feature_request"
                    ? "Describe the feature you'd like to see..."
                    : "Steps to reproduce the issue... (You can paste screenshots directly here)"
                }
                rows={5}
                maxLength={5000}
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Clipboard className="h-3 w-3" />
                Paste screenshots directly into this field (Ctrl/Cmd+V)
              </p>
            </div>

            {screenshots.length > 0 && (
              <div>
                <Label className="text-sm mb-2 block">Screenshots ({screenshots.length}/5)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {screenshots.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Screenshot ${i + 1}`} className="rounded border object-cover w-full h-20" />
                      <button
                        type="button"
                        onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={screenshots.length >= 5}
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmit(false)}>Cancel</Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!title.trim() || !description.trim() || submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
