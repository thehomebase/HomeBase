import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Facebook, Twitter, Linkedin, Check, X } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

interface SocialAccount {
  platform: string;
  connected: boolean;
  username?: string;
}

interface SocialPost {
  id: number;
  content: string;
  platforms: string[];
  status: 'draft' | 'published' | 'failed';
  createdAt: string;
}

export default function SocialMediaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // Query social media accounts
  const { data: accounts = [] } = useQuery<SocialAccount[]>({
    queryKey: ["/api/social/accounts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/social/accounts");
      if (!response.ok) throw new Error("Failed to fetch social accounts");
      return response.json();
    },
    enabled: user?.role === "agent",
  });

  // Query existing posts
  const { data: posts = [] } = useQuery<SocialPost[]>({
    queryKey: ["/api/social/posts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/social/posts");
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json();
    },
    enabled: user?.role === "agent",
  });

  // Mutation for creating a new post
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/social/posts", {
        content,
        platforms: selectedPlatforms,
      });
      if (!response.ok) throw new Error("Failed to create post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      setPostContent("");
      setSelectedPlatforms([]);
      toast({
        title: "Success",
        description: "Post created and scheduled for publishing",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create post",
        variant: "destructive",
      });
    },
  });

  // Mutation for connecting social accounts
  const connectAccountMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await apiRequest("POST", `/api/social/connect/${platform}`);
      if (!response.ok) throw new Error(`Failed to connect ${platform}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/accounts"] });
    },
  });

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for your post",
        variant: "destructive",
      });
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one platform",
        variant: "destructive",
      });
      return;
    }
    createPostMutation.mutate(postContent);
  };

  if (user?.role !== "agent") {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>This page is only accessible to agents.</p>
      </div>
    );
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <Facebook className="h-5 w-5" />;
      case 'twitter':
        return <Twitter className="h-5 w-5" />;
      case 'linkedin':
        return <Linkedin className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Social Media Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.platform} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(account.platform)}
                    <span className="font-medium capitalize">{account.platform}</span>
                  </div>
                  {account.connected ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{account.username}</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => connectAccountMutation.mutate(account.platform)}
                      disabled={connectAccountMutation.isPending}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePostSubmit} className="space-y-4">
              <Textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What would you like to share?"
                className="min-h-[120px]"
              />
              <div className="flex flex-wrap gap-2">
                {accounts.filter(a => a.connected).map((account) => (
                  <Toggle
                    key={account.platform}
                    pressed={selectedPlatforms.includes(account.platform)}
                    onPressedChange={(pressed) => {
                      setSelectedPlatforms(prev =>
                        pressed
                          ? [...prev, account.platform]
                          : prev.filter(p => p !== account.platform)
                      );
                    }}
                    className="flex items-center gap-2"
                  >
                    {getPlatformIcon(account.platform)}
                    <span className="capitalize">{account.platform}</span>
                  </Toggle>
                ))}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createPostMutation.isPending}
              >
                Create Post
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="p-4 border rounded-lg">
                <p className="mb-2">{post.content}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {post.platforms.map((platform) => (
                      <span key={platform} className="flex items-center gap-1">
                        {getPlatformIcon(platform)}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`capitalize ${
                      post.status === 'published' ? 'text-green-500' :
                      post.status === 'failed' ? 'text-red-500' :
                      'text-yellow-500'
                    }`}>
                      {post.status}
                    </span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No posts yet. Create your first post to get started!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
