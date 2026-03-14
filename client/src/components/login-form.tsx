import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getRecaptchaToken } from "@/lib/recaptcha";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { loginMutation, registerMutation } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [defaultReferralCode, setDefaultReferralCode] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("client");
  const { toast } = useToast();
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

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
    loginMutation.mutate(
      {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      },
      {
        onSuccess: (data) => {
          if ("mfaRequired" in data && data.mfaRequired) {
            setMfaRequired(true);
            setMfaToken(data.mfaToken);
          }
        },
      }
    );
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6) return;
    setMfaLoading(true);
    try {
      const res = await apiRequest("POST", "/api/mfa/verify", {
        mfaToken,
        code: mfaCode,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Verification failed");
      }
      const user = await res.json();
      queryClient.setQueryData(["/api/user"], user);
      toast({ title: "Welcome back!" });
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setMfaLoading(false);
    }
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
    const role = formData.get("role") as string;
    const isAgentOrBroker = role === "agent" || role === "broker";
    const licenseNumber = formData.get("licenseNumber") as string;
    const licenseState = formData.get("licenseState") as string;
    const brokerageName = formData.get("brokerageName") as string;
    if (isAgentOrBroker && (!licenseNumber || !licenseState || !brokerageName)) {
      toast({ title: "License number, state, and brokerage name are required for agents and brokers", variant: "destructive" });
      return;
    }
    registerMutation.mutate({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      role,
      ...(referralCode ? { referralCode } : {}),
      ...(isAgentOrBroker ? { licenseNumber, licenseState, brokerageName } : {}),
    } as any);
    setShowRegister(false);
  };

  if (mfaRequired) {
    return (
      <div className={cn("w-full max-w-sm mx-auto rounded-lg p-6", className)} {...props}>
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Two-Factor Authentication</h1>
            <p className="text-sm text-muted-foreground text-center">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Verification Code</Label>
            <Input
              id="mfa-code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && mfaCode.length === 6) handleMfaVerify();
              }}
            />
          </div>
          <Button
            onClick={handleMfaVerify}
            className="w-full dark:bg-white dark:text-black"
            disabled={mfaCode.length !== 6 || mfaLoading}
          >
            {mfaLoading ? "Verifying..." : "Verify"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setMfaRequired(false);
              setMfaToken("");
              setMfaCode("");
            }}
          >
            Back to login
          </Button>
        </div>
      </div>
    );
  }

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
              <Select name="role" defaultValue="client" onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="lender">Lender</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(selectedRole === "agent" || selectedRole === "broker") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reg-licenseNumber">License Number *</Label>
                  <Input
                    id="reg-licenseNumber"
                    name="licenseNumber"
                    placeholder="e.g. 0654321"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-licenseState">License State *</Label>
                  <Select name="licenseState">
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-brokerageName">Brokerage Name *</Label>
                  <Input
                    id="reg-brokerageName"
                    name="brokerageName"
                    placeholder="e.g. Keller Williams Realty"
                    required
                  />
                </div>
              </>
            )}
            {selectedRole !== "lender" && selectedRole !== "broker" && (
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
            )}
            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              Create Account
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}