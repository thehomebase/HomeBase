import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Loader2, Mail, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [displayCode, setDisplayCode] = useState<string | null>(null);

  useEffect(() => {
    const storedCode = sessionStorage.getItem("verificationCode");
    if (storedCode) {
      setDisplayCode(storedCode);
      sessionStorage.removeItem("verificationCode");
    }
  }, []);

  const verifyMutation = useMutation({
    mutationFn: async (verificationCode: string) => {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Email verified!",
        description: "Your email has been successfully verified.",
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired verification code.",
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend code");
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Code sent",
        description: "A new verification code has been sent to your email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (user.emailVerified) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) {
      verifyMutation.mutate(code.trim());
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Mail className="h-5 w-5" />
            Verify Your Email
          </CardTitle>
          <CardDescription>
            Enter the 6-digit verification code to verify your email address ({user.email}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayCode && (
            <div className="mb-4 p-3 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Your verification code:</p>
              <p className="text-2xl font-mono font-bold tracking-widest">{displayCode}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(val);
                }}
                className="text-center text-lg tracking-widest font-mono"
                maxLength={6}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={code.length !== 6 || verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
            >
              {resendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend Code
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => logoutMutation.mutate()}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}