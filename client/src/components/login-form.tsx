import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { loginMutation, registerMutation } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [defaultReferralCode, setDefaultReferralCode] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setDefaultReferralCode(ref);
      setShowRegister(true);
    }

    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then((available) => {
        setBiometricAvailable(available);
      });
    }
  }, []);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    loginMutation.mutate({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const optionsRes = await apiRequest("POST", "/api/webauthn/login-options", {});
      const options = await optionsRes.json();

      const authResponse = await startAuthentication({ optionsJSON: options });

      const verifyRes = await apiRequest("POST", "/api/webauthn/login-verify", {
        response: authResponse,
      });
      const result = await verifyRes.json();

      if (result.verified) {
        queryClient.setQueryData(["/api/user"], result.user);
        toast({ title: "Welcome back!", description: "Signed in with biometrics." });
      }
    } catch (error: any) {
      const message = error?.message || "Biometric login failed";
      if (!message.includes("cancelled") && !message.includes("AbortError")) {
        toast({ title: "Login failed", description: message, variant: "destructive" });
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const referralCode = formData.get("referralCode") as string;
    registerMutation.mutate({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      role: formData.get("role") as string,
      ...(referralCode ? { referralCode } : {}),
    } as any);
    setShowRegister(false);
  };

  return (
    <div className={cn("w-full max-w-sm mx-auto  rounded-lg p-6", className)} {...props}>
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-12 md:h-16" />
          <h1 className="text-xl font-bold">Welcome to Homebase</h1>
          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              className="w-full"
            />
          </div>
          <Button type="submit" className="w-full dark:bg-white dark:text-black" disabled={loginMutation.isPending}>
            Login
          </Button>

          {biometricAvailable && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
              >
                <Fingerprint className="h-5 w-5" />
                {biometricLoading ? "Verifying..." : "Sign in with Face ID / Biometrics"}
              </Button>
            </>
          )}
        </div>
      </form>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">Terms of Service</a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
      </div>

      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create an Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-firstName">First Name</Label>
              <Input
                id="reg-firstName"
                name="firstName"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-lastName">Last Name</Label>
              <Input
                id="reg-lastName"
                name="lastName"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                name="email"
                type="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                name="password"
                type="password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-role">Role</Label>
              <Select name="role" defaultValue="client">
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-referralCode">Referral Code (optional)</Label>
              <Input
                id="reg-referralCode"
                name="referralCode"
                placeholder="Enter referral code"
                defaultValue={defaultReferralCode}
                className="font-mono tracking-wider"
              />
            </div>
            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              Create Account
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}