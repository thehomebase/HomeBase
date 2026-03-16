import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { PhotoTouchup } from "@/components/photo-touchup";
import { PhotoPositionEditor } from "@/components/photo-position-editor";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  Shield,
  CreditCard,
  Key,
  Bell,
  Camera,
  Fingerprint,
  Trash2,
  Eraser,
  Move,
  ShieldCheck,
  Plus,
  Copy,
  Check,
  Webhook,
  Clock,
  AlertTriangle,
  Zap,
  Settings,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  Plug,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Crown,
  Building2,
  Briefcase,
  BarChart3,
  FileText,
  MessageSquare,
  Map,
  Home,
  Phone,
  Mail,
  Star,
  Users,
  Gift,
  CloudUpload,
} from "lucide-react";
import {
  SiMailchimp,
  SiSlack,
  SiGooglesheets,
  SiGmail,
} from "react-icons/si";
import { startRegistration } from "@simplewebauthn/browser";
import type { ApiKey, Webhook as WebhookType, ReferralCredit } from "@shared/schema";

type SettingsSection = "profile" | "security" | "billing" | "integrations" | "notifications" | "team-access";

const WEBHOOK_EVENTS = [
  { value: "new_lead", label: "New Lead" },
  { value: "lead_updated", label: "Lead Updated" },
  { value: "transaction_created", label: "Transaction Created" },
  { value: "transaction_updated", label: "Transaction Updated" },
  { value: "transaction_closed", label: "Transaction Closed" },
  { value: "client_created", label: "Client Created" },
  { value: "client_updated", label: "Client Updated" },
  { value: "document_uploaded", label: "Document Uploaded" },
  { value: "message_received", label: "Message Received" },
] as const;

const sidebarItems: { id: SettingsSection; label: string; icon: typeof User; roles?: string[] }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "integrations", label: "API Keys & Integrations", icon: Key },
  { id: "team-access", label: "Team Access", icon: Users, roles: ["agent", "broker"] },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as SettingsSection | null;
    if (tab && sidebarItems.some(s => s.id === tab)) {
      setActiveSection(tab);
    }
  }, [location]);

  const filteredItems = sidebarItems.filter(item => !item.roles || item.roles.includes(user?.role || ""));

  return (
    <div className={`${isMobile ? "p-4" : "p-6"}`}>
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      <div className={`flex ${isMobile ? "flex-col" : "flex-row"} gap-6`}>
        {isMobile ? (
          <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="w-56 shrink-0">
            <nav className="space-y-1">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        <div className="flex-1 min-w-0 max-w-3xl">
          {activeSection === "profile" && <ProfileSection />}
          {activeSection === "security" && <SecuritySection />}
          {activeSection === "billing" && <BillingSection />}
          {activeSection === "integrations" && <IntegrationsSection />}
          {activeSection === "team-access" && <TeamAccessSection />}
          {activeSection === "notifications" && <NotificationsSection />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [showTouchup, setShowTouchup] = useState(false);
  const [showPositionEditor, setShowPositionEditor] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profile", user?.id],
  });

  useEffect(() => {
    if (profile) {
      setBio(profile.profileBio || "");
      setPhone(profile.profilePhone || "");
    }
  }, [profile]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }, []);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Profile updated" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Photo updated (background removed)" });
    },
    onError: () => {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    },
  });

  const removePhotoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/profile", { profilePhotoUrl: null });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Photo removed" });
    },
  });

  const handleTouchupSave = useCallback(async (blob: Blob) => {
    const fd = new FormData();
    fd.append("photo", blob, "touchup.png");
    const res = await fetch("/api/profile/photo/touchup", { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) throw new Error("Save failed");
    invalidateAll();
    toast({ title: "Photo touch-up saved" });
  }, [invalidateAll, toast]);

  const handlePositionSave = useCallback(async (blob: Blob) => {
    const fd = new FormData();
    fd.append("photo", blob, "positioned.png");
    const res = await fetch("/api/profile/photo/touchup", { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) throw new Error("Save failed");
    invalidateAll();
    toast({ title: "Photo position saved" });
  }, [invalidateAll, toast]);

  function handleFileSelect() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setPendingFile(file);
        setShowPositionEditor(true);
      }
    };
    input.click();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">My Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your personal information and profile photo</p>
      </div>
      <Separator />

      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          {user?.profilePhotoUrl ? (
            <img
              src={user.profilePhotoUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border-2 border-border aspect-square"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-border aspect-square">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleFileSelect}
            disabled={photoMutation.isPending}
          >
            <Camera className="h-4 w-4 mr-1" />
            {photoMutation.isPending ? "Uploading..." : "Change Image"}
          </Button>
          {user?.profilePhotoUrl && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTouchup(true)}
                title="Touch up / erase artifacts"
              >
                <Eraser className="h-4 w-4 mr-1" />
                Touch Up
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  fetch(user.profilePhotoUrl)
                    .then(r => r.blob())
                    .then(b => {
                      setPendingFile(new File([b], "current.png", { type: "image/png" }));
                      setShowPositionEditor(true);
                    });
                }}
                title="Reposition or resize photo"
              >
                <Move className="h-4 w-4 mr-1" />
                Reposition
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removePhotoMutation.mutate()}
                disabled={removePhotoMutation.isPending}
              >
                Remove
              </Button>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground hidden md:block">PNGs, JPEGs and GIFs under 2MB</p>
      </div>

      {user?.profilePhotoUrl && (
        <PhotoTouchup
          open={showTouchup}
          onClose={() => setShowTouchup(false)}
          photoUrl={user.profilePhotoUrl}
          onSave={handleTouchupSave}
        />
      )}

      {pendingFile && (
        <PhotoPositionEditor
          open={showPositionEditor}
          onClose={() => { setShowPositionEditor(false); setPendingFile(null); }}
          imageFile={pendingFile}
          onSave={async (blob) => {
            const file = new File([blob], "positioned.png", { type: "image/png" });
            await photoMutation.mutateAsync(file);
          }}
        />
      )}

      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <Input value={lastName} onChange={e => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={user?.email || ""} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">Contact support to change your email address</p>
      </div>

      <div className="space-y-2">
        <Label>Phone</Label>
        <Input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="(555) 555-1234"
        />
      </div>

      <div className="space-y-2">
        <Label>Bio</Label>
        <Textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Tell clients about yourself..."
          className="min-h-[100px]"
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">{bio.length}/1000</p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => updateMutation.mutate({ profileBio: bio, profilePhone: phone })}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function MfaCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [setupStep, setSetupStep] = useState<"idle" | "qr" | "verify">("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mfa/setup", {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Setup failed");
      }
      return res.json();
    },
    onSuccess: (data: { secret: string; qrCode: string }) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setSetupStep("qr");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const verifySetupMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/mfa/verify-setup", { code });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Verification failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Two-factor authentication enabled" });
      setSetupStep("idle");
      setQrCode("");
      setSecret("");
      setVerifyCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/mfa/disable", { password });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to disable");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Two-factor authentication disabled" });
      setShowDisable(false);
      setDisablePassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const isEnabled = user?.totpEnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security with an authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEnabled ? (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Enabled</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Your account is protected with an authenticator app
                </p>
              </div>
            </div>
            {showDisable ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Enter your password to disable two-factor authentication.</p>
                <Input
                  type="password"
                  placeholder="Current password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disableMutation.mutate(disablePassword)}
                    disabled={!disablePassword || disableMutation.isPending}
                  >
                    {disableMutation.isPending ? "Disabling..." : "Disable MFA"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowDisable(false); setDisablePassword(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowDisable(true)}>
                Disable Two-Factor
              </Button>
            )}
          </>
        ) : setupStep === "idle" ? (
          <div className="text-center py-2">
            <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Use an authenticator app like Google Authenticator or Authy to generate verification codes.
            </p>
            <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending} className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              {setupMutation.isPending ? "Setting up..." : "Set Up Two-Factor"}
            </Button>
          </div>
        ) : setupStep === "qr" ? (
          <div className="space-y-4">
            <p className="text-sm">Scan this QR code with your authenticator app:</p>
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-lg border" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Or enter this key manually:</p>
              <code className="block text-xs bg-muted p-2 rounded font-mono break-all select-all">{secret}</code>
            </div>
            <Button onClick={() => setSetupStep("verify")} className="w-full">
              Next
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">Enter the 6-digit code from your authenticator app to confirm setup:</p>
            <Input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && verifyCode.length === 6) verifySetupMutation.mutate(verifyCode);
              }}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => verifySetupMutation.mutate(verifyCode)}
                disabled={verifyCode.length !== 6 || verifySetupMutation.isPending}
                className="flex-1"
              >
                {verifySetupMutation.isPending ? "Verifying..." : "Verify & Enable"}
              </Button>
              <Button variant="outline" onClick={() => { setSetupStep("idle"); setVerifyCode(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(result => {
        setBiometricAvailable(result);
        setBiometricChecked(true);
      });
    } else {
      setBiometricChecked(true);
    }
  }, []);

  const { data: credentials = [], isLoading: credLoading } = useQuery({
    queryKey: ["/api/webauthn/credentials"],
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/profile/change-password", data);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to change password", variant: "destructive" });
    },
  });

  const deleteBiometricMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/webauthn/credentials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webauthn/credentials"] });
      toast({ title: "Credential removed" });
    },
  });

  const supportAccessMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("POST", "/api/profile/support-access", { enabled });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: data.enabled ? "Support access granted" : "Support access revoked" });
    },
    onError: () => {
      toast({ title: "Failed to update support access", variant: "destructive" });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/profile/logout-all-devices", {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "All other sessions have been logged out" });
    },
    onError: () => {
      toast({ title: "Failed to log out other devices", variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/profile/account");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account deleted" });
      window.location.href = "/auth";
    },
    onError: () => {
      toast({ title: "Failed to delete account", variant: "destructive" });
    },
  });

  const deactivateAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/account/deactivate", {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account deactivated" });
      window.location.href = "/auth";
    },
    onError: () => {
      toast({ title: "Failed to deactivate account", variant: "destructive" });
    },
  });

  const handleRegisterBiometric = async () => {
    setRegistering(true);
    try {
      const optionsRes = await apiRequest("POST", "/api/webauthn/register-options", {});
      const options = await optionsRes.json();
      const regResponse = await startRegistration({ optionsJSON: options });
      const verifyRes = await apiRequest("POST", "/api/webauthn/register-verify", regResponse);
      const result = await verifyRes.json();
      if (result.verified) {
        queryClient.invalidateQueries({ queryKey: ["/api/webauthn/credentials"] });
        toast({ title: "Biometric login enabled!" });
      }
    } catch (error: any) {
      const message = error?.message || "Setup failed";
      if (!message.includes("cancelled") && !message.includes("AbortError")) {
        toast({ title: "Setup failed", description: message, variant: "destructive" });
      }
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Account Security</h2>
        <p className="text-sm text-muted-foreground">Manage your password and authentication methods</p>
      </div>
      <Separator />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            {user?.emailVerified ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Verified</Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Unverified</Badge>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">Last changed: Unknown</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
              Change password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Fingerprint className="h-5 w-5" />
            Biometric Login
          </CardTitle>
          <CardDescription>
            Sign in with Face ID, fingerprint, or other biometric authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!biometricChecked ? (
            <p className="text-sm text-muted-foreground">Checking device compatibility...</p>
          ) : !biometricAvailable ? (
            <div className="text-center py-4">
              <Fingerprint className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Biometric login is not available on this device or browser.
              </p>
            </div>
          ) : (
            <>
              {credLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (credentials as any[]).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {(credentials as any[]).length} registered device{(credentials as any[]).length > 1 ? "s" : ""}
                  </p>
                  {(credentials as any[]).map((cred: any) => (
                    <div key={cred.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            {cred.deviceType === "multiDevice" ? "Cloud Synced" : "This Device"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(cred.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBiometricMutation.mutate(cred.id)}
                        disabled={deleteBiometricMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2">
                  <Fingerprint className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No biometric credentials registered yet.
                  </p>
                </div>
              )}
              <Button onClick={handleRegisterBiometric} disabled={registering} className="w-full gap-2">
                <Fingerprint className="h-4 w-4" />
                {registering ? "Setting up..." : (credentials as any[]).length > 0 ? "Add Another Device" : "Set Up Biometric Login"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <MfaCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Support Access</CardTitle>
          <CardDescription>
            Grant the HomeBase support team temporary access to your account for troubleshooting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Support access</p>
              <p className="text-sm text-muted-foreground">
                {user?.supportAccessGranted
                  ? `Access granted until ${user.supportAccessExpires ? new Date(user.supportAccessExpires).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "indefinitely"}`
                  : "Support team cannot access your account"}
              </p>
            </div>
            <button
              onClick={() => supportAccessMutation.mutate(!user?.supportAccessGranted)}
              disabled={supportAccessMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                user?.supportAccessGranted ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                user?.supportAccessGranted ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Log out of all devices</p>
              <p className="text-sm text-muted-foreground">
                Log out of all other active sessions on other devices besides this one.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutAllMutation.mutate()}
              disabled={logoutAllMutation.isPending}
            >
              {logoutAllMutation.isPending ? "Logging out..." : "Log out"}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Deactivate account</p>
              <p className="text-sm text-muted-foreground">
                Temporarily deactivate your account. Your data will be preserved and you can reactivate at any time by logging in.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeactivateConfirm(true)}
            >
              Deactivate
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete my account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete the account and remove access from all workspaces.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={(open) => { setShowDeleteConfirm(open); setDeleteConfirmText(""); }}>
        <DialogContent>
          <DialogHeader className="text-left">
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data, transactions, and settings will be removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type "DELETE" to confirm</Label>
              <Input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
                onClick={() => deleteAccountMutation.mutate()}
              >
                {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeactivateConfirm} onOpenChange={setShowDeactivateConfirm}>
        <DialogContent>
          <DialogHeader className="text-left">
            <DialogTitle>Deactivate Account</DialogTitle>
            <DialogDescription>
              Your account will be deactivated and you will be logged out. All your data, transactions, and documents will be preserved. You can reactivate your account at any time by logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDeactivateConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deactivateAccountMutation.isPending}
              onClick={() => deactivateAccountMutation.mutate()}
            >
              {deactivateAccountMutation.isPending ? "Deactivating..." : "Deactivate Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader className="text-left">
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
            </div>
            <Button
              className="w-full"
              disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8 || changePasswordMutation.isPending}
              onClick={() => changePasswordMutation.mutate({ currentPassword, newPassword })}
            >
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
            {newPassword && newPassword.length < 8 && (
              <p className="text-xs text-muted-foreground">Password must be at least 8 characters</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BillingSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const searchParams = new URLSearchParams(window.location.search);
  const isSuccess = searchParams.get('success') === 'true';
  const isSetupSuccess = searchParams.get('setup_success') === 'true';

  const { data: subscription, isLoading: subLoading } = useQuery<{ subscription: any; hasPaymentMethod: boolean }>({
    queryKey: ["/api/stripe/subscription"],
  });

  const { data: referralCredits } = useQuery<ReferralCredit[]>({
    queryKey: ["/api/referral-credits"],
  });

  const subscribeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/stripe/subscribe", { plan });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: () => {
      toast({ title: "Failed to start subscription", variant: "destructive" });
    },
  });

  const manageBillingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal", {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const setupPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/setup-payment", {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  if (subLoading) return <Skeleton className="h-64 w-full" />;

  const hasActiveSubscription = subscription?.subscription?.status === 'active';
  const availableCredits = referralCredits?.filter(c => c.status === 'available') || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Billing & Subscription</h2>
        <p className="text-sm text-muted-foreground">Manage your subscription and payment methods</p>
      </div>
      <Separator />

      {(isSuccess || isSetupSuccess) && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {isSuccess ? "Subscription activated successfully!" : "Payment method updated successfully!"}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-lg">Current Plan</p>
              {hasActiveSubscription ? (
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                  <span className="text-sm text-muted-foreground capitalize">
                    {subscription?.subscription?.plan || "Standard"} Plan
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No active subscription</p>
              )}
            </div>
            {hasActiveSubscription && (
              <Button variant="outline" onClick={() => manageBillingMutation.mutate()} disabled={manageBillingMutation.isPending}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            )}
          </div>

          {!hasActiveSubscription && (user?.role === 'agent' || user?.role === 'broker') && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Get started with HomeBase</p>
              <Button onClick={() => subscribeMutation.mutate("agent")} disabled={subscribeMutation.isPending} className="w-full">
                {subscribeMutation.isPending ? "Processing..." : "Subscribe to Agent Plan - $29/mo"}
              </Button>
            </div>
          )}

          {!hasActiveSubscription && user?.role === 'vendor' && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Get started with HomeBase</p>
              <Button onClick={() => subscribeMutation.mutate("vendor")} disabled={subscribeMutation.isPending} className="w-full">
                {subscribeMutation.isPending ? "Processing..." : "Subscribe to Vendor Plan - $19/mo"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Payment Method</p>
              <p className="text-sm text-muted-foreground">
                {subscription?.hasPaymentMethod ? "Payment method on file" : "No payment method on file"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setupPaymentMutation.mutate()} disabled={setupPaymentMutation.isPending}>
              {subscription?.hasPaymentMethod ? "Update" : "Add"} Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>

      {availableCredits.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-primary" />
              <p className="font-medium">Referral Credits</p>
            </div>
            <p className="text-sm text-muted-foreground">
              You have {availableCredits.length} free month{availableCredits.length > 1 ? "s" : ""} available from referrals!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GmailIntegrationCard() {
  const { toast } = useToast();

  const { data: commStatus, isLoading } = useQuery<{
    twilio: boolean;
    gmail: { connected: boolean; email?: string };
  }>({
    queryKey: ["/api/communications/status"],
    refetchInterval: 5000,
  });

  const gmailConnected = commStatus?.gmail?.connected;
  const gmailEmail = commStatus?.gmail?.email;

  const [wasConnecting, setWasConnecting] = useState(false);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/gmail/auth-url?returnTo=/settings");
      const data = await res.json();
      window.open(data.url, '_blank');
      setWasConnecting(true);
    },
    onError: () => toast({ title: "Failed to connect Gmail", variant: "destructive" }),
  });

  useEffect(() => {
    if (wasConnecting && gmailConnected) {
      toast({ title: "Gmail connected successfully" });
      setWasConnecting(false);
    }
  }, [gmailConnected, wasConnecting]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      toast({ title: "Gmail connected successfully" });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("gmail") === "error") {
      toast({ title: "Failed to connect Gmail", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/gmail/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications/status"] });
      toast({ title: "Gmail disconnected" });
    },
    onError: () => toast({ title: "Failed to disconnect", variant: "destructive" }),
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <SiGmail className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="font-medium">Gmail</p>
              <p className="text-sm text-muted-foreground">Send and receive emails</p>
            </div>
          </div>
          {gmailConnected && (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
            </Badge>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : gmailConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{gmailEmail || "Account connected"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your Gmail account is used for sending emails, client communication, and forwarding signed documents from the Mail page.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect Gmail"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader className="text-left">
                  <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Disconnecting will stop all email functionality including sending emails, forwarding documents, and email tracking. You can reconnect anytime.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => disconnectMutation.mutate()}>
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Gmail account to send and receive emails, forward signed documents, and track email opens directly from HomeBase.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Send & receive email
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Email tracking
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Your signature
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Forward documents
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? "Connecting..." : "Connect Gmail Account"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SignNowIntegrationCard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: status, isLoading } = useQuery<{ configured: boolean; connected: boolean; email?: string }>({
    queryKey: ["/api/signnow/status"],
    refetchInterval: 5000,
  });

  const [wasConnecting, setWasConnecting] = useState(false);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/signnow/auth-url");
      const data = await res.json();
      window.open(data.url, '_blank');
      setWasConnecting(true);
    },
    onError: () => toast({ title: "Failed to connect SignNow", variant: "destructive" }),
  });

  useEffect(() => {
    if (wasConnecting && status?.connected) {
      toast({ title: "SignNow connected successfully" });
      setWasConnecting(false);
    }
  }, [status?.connected, wasConnecting]);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/signnow/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/signnow/status"] });
      toast({ title: "SignNow disconnected" });
    },
    onError: () => toast({ title: "Failed to disconnect", variant: "destructive" }),
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">SignNow e-Signatures</p>
              <p className="text-sm text-muted-foreground">Send documents for digital signing</p>
            </div>
          </div>
          {status?.connected && (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
            </Badge>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : !status?.configured ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              e-Signatures are not yet enabled on this platform. Contact your administrator to set up the SignNow integration.
            </p>
            <Button variant="outline" className="w-full" onClick={() => window.open("https://www.signnow.com/pricing", "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Learn About SignNow
            </Button>
          </div>
        ) : status.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{status.email || "Account connected"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Documents are sent through your own SignNow account. You can send for e-signature from any transaction's document checklist.
            </p>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect SignNow"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your SignNow account to send documents for e-signature directly from transactions. Documents stay in your own SignNow account — signing costs and billing are managed through your SignNow subscription.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Legally binding
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Full audit trail
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> TREC forms
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Bank-level security
              </div>
            </div>
            <div className="p-2 rounded bg-muted/50 text-[10px] leading-tight text-muted-foreground space-y-1">
              <p>By connecting, you agree that:</p>
              <ul className="list-disc pl-3 space-y-0.5">
                <li>HomeBase provides e-signature as a tool; you warrant document suitability and compliance with applicable laws.</li>
                <li>You indemnify HomeBase against claims arising from your content, documents, or misuse of the e-signature feature.</li>
                <li>All signing activity is logged for audit and compliance purposes.</li>
              </ul>
            </div>
            <Button
              className="w-full"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? "Connecting..." : "Connect SignNow Account"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocuSignIntegrationCard() {
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery<{ configured: boolean; connected: boolean; email?: string }>({
    queryKey: ["/api/docusign/status"],
    refetchInterval: 5000,
  });

  const [wasConnecting, setWasConnecting] = useState(false);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/docusign/auth-url");
      const data = await res.json();
      window.open(data.url, '_blank');
      setWasConnecting(true);
    },
    onError: () => toast({ title: "Failed to connect DocuSign", variant: "destructive" }),
  });

  useEffect(() => {
    if (wasConnecting && status?.connected) {
      toast({ title: "DocuSign connected successfully" });
      setWasConnecting(false);
    }
  }, [status?.connected, wasConnecting]);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/docusign/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/docusign/status"] });
      toast({ title: "DocuSign disconnected" });
    },
    onError: () => toast({ title: "Failed to disconnect", variant: "destructive" }),
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium">DocuSign e-Signatures</p>
              <p className="text-sm text-muted-foreground">Industry-standard document signing</p>
            </div>
          </div>
          {status?.connected && (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
            </Badge>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : !status?.configured ? (
          <p className="text-sm text-muted-foreground">
            DocuSign integration is not configured for this platform. Please contact your administrator to set up DocuSign API credentials.
          </p>
        ) : status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{status.email || "Account connected"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Documents are sent through your own DocuSign account. You can send for e-signature from any transaction's document checklist.
            </p>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect DocuSign"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your DocuSign account to send documents for e-signature directly from transactions. Documents stay in your own DocuSign account.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Industry standard
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Full audit trail
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> TREC compliant
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> 200+ countries
              </div>
            </div>
            <div className="p-2 rounded bg-muted/50 text-[10px] leading-tight text-muted-foreground space-y-1">
              <p>By connecting, you agree that:</p>
              <ul className="list-disc pl-3 space-y-0.5">
                <li>HomeBase provides e-signature as a tool; you warrant document suitability and compliance with applicable laws.</li>
                <li>You indemnify HomeBase against claims arising from your content, documents, or misuse of the e-signature feature.</li>
                <li>All signing activity is logged for audit and compliance purposes.</li>
              </ul>
            </div>
            <Button
              className="w-full"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? "Connecting..." : "Connect DocuSign Account"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DropboxIntegrationCard() {
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery<{ configured: boolean; connected: boolean; email?: string; displayName?: string }>({
    queryKey: ["/api/dropbox/status"],
    refetchInterval: 5000,
  });

  const [wasConnecting, setWasConnecting] = useState(false);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/dropbox/auth-url");
      const data = await res.json();
      window.open(data.url, '_blank');
      setWasConnecting(true);
    },
    onError: () => toast({ title: "Failed to connect Dropbox", variant: "destructive" }),
  });

  useEffect(() => {
    if (wasConnecting && status?.connected) {
      toast({ title: "Dropbox connected successfully" });
      setWasConnecting(false);
    }
  }, [status?.connected, wasConnecting]);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/dropbox/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dropbox/status"] });
      toast({ title: "Dropbox disconnected" });
    },
    onError: () => toast({ title: "Failed to disconnect", variant: "destructive" }),
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CloudUpload className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Dropbox</p>
              <p className="text-sm text-muted-foreground">Cloud file storage</p>
            </div>
          </div>
          {status?.connected && (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
            </Badge>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : !status?.configured ? (
          <p className="text-sm text-muted-foreground">
            Dropbox integration is not configured for this platform. Contact your administrator to set up Dropbox API credentials.
          </p>
        ) : status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{status.email || status.displayName || "Account connected"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Browse and import files from your Dropbox directly into transaction document checklists.
            </p>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect Dropbox"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Dropbox to browse and import files directly into your transaction document checklists. Pick files from Dropbox, then send them for e-signature through DocuSign.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> File browser
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Import to checklist
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Search files
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded border">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> DocuSign ready
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? "Connecting..." : "Connect Dropbox Account"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IntegrationsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvent, setWebhookEvent] = useState("");

  const { data: apiKeys, isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const { data: webhooks, isLoading: webhooksLoading } = useQuery<WebhookType[]>({
    queryKey: ["/api/webhooks"],
  });

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/api-keys", { name });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setCreatedKey(data.key);
      setShowKeyDialog(true);
      setNewKeyName("");
      toast({ title: "API key created" });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API key revoked" });
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (data: { url: string; event: string }) => {
      await apiRequest("POST", "/api/webhooks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setWebhookUrl("");
      setWebhookEvent("");
      toast({ title: "Webhook registered" });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook deleted" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">API Keys & Integrations</h2>
        <p className="text-sm text-muted-foreground">Manage API keys, webhooks, and third-party integrations</p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>Create API keys to access the HomeBase API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g., Production)"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
            />
            <Button
              onClick={() => createKeyMutation.mutate(newKeyName)}
              disabled={!newKeyName.trim() || createKeyMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>

          {keysLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : apiKeys && apiKeys.length > 0 ? (
            <div className="space-y-2">
              {apiKeys.map(key => (
                <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-muted-foreground">
                        {key.keyPrefix}...
                      </code>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(key.createdAt!).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader className="text-left">
                        <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently revoke "{key.name}". Any integrations using this key will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revokeKeyMutation.mutate(key.id)}>
                          Revoke Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No API keys created yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>Get notified when events happen in your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex ${isMobile ? "flex-col" : "flex-row"} gap-2`}>
            <Input
              placeholder="https://your-server.com/webhook"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              className="flex-1"
            />
            <Select value={webhookEvent} onValueChange={setWebhookEvent}>
              <SelectTrigger className={isMobile ? "w-full" : "w-[200px]"}>
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {WEBHOOK_EVENTS.map(evt => (
                  <SelectItem key={evt.value} value={evt.value}>{evt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => createWebhookMutation.mutate({ url: webhookUrl, event: webhookEvent })}
              disabled={!webhookUrl.trim() || !webhookEvent || createWebhookMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {webhooksLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : webhooks && webhooks.length > 0 ? (
            <div className="space-y-2">
              {webhooks.map((wh: any) => (
                <div key={wh.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="min-w-0 flex-1 mr-3">
                    <code className="text-xs break-all">{wh.url}</code>
                    <Badge variant="secondary" className="ml-2 text-xs">{wh.event}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteWebhookMutation.mutate(wh.id)}
                    disabled={deleteWebhookMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No webhooks registered</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-[#FF4A00]/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-[#FF4A00]" />
            </div>
            <div>
              <p className="font-medium">Zapier Integration</p>
              <p className="text-sm text-muted-foreground">Connect HomeBase to 5,000+ apps</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="flex items-center gap-2 p-2 rounded-lg border text-xs">
              <SiMailchimp className="h-4 w-4 text-[#FFE01B]" />
              Mailchimp
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border text-xs">
              <SiSlack className="h-4 w-4 text-[#4A154B]" />
              Slack
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border text-xs">
              <SiGooglesheets className="h-4 w-4 text-[#0F9D58]" />
              Sheets
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.open("https://zapier.com", "_blank")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Learn More About Zapier
          </Button>
        </CardContent>
      </Card>

      <GmailIntegrationCard />
      <SignNowIntegrationCard />
      <DocuSignIntegrationCard />
      <DropboxIntegrationCard />

      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader className="text-left">
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy this key now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Store this key securely. It will not be shown again.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Input value={createdKey || ""} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (createdKey) {
                    navigator.clipboard.writeText(createdKey);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamAccessSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<"view" | "full">("view");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: authorizedUsers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/authorized-users"],
  });

  const { data: pendingInvitations = [] } = useQuery<any[]>({
    queryKey: ["/api/authorized-users/pending"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { email: string; permissionLevel: string }) => {
      const res = await apiRequest("POST", "/api/authorized-users", data);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authorized-users"] });
      toast({ title: "Invitation sent" });
      setEmail("");
      setPermissionLevel("view");
      setShowAddDialog(false);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/authorized-users/${id}`);
      if (!res.ok) throw new Error("Failed to remove user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authorized-users"] });
      toast({ title: "User removed" });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ id, permissionLevel }: { id: number; permissionLevel: string }) => {
      const res = await apiRequest("PATCH", `/api/authorized-users/${id}`, { permissionLevel });
      if (!res.ok) throw new Error("Failed to update permission");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authorized-users"] });
      toast({ title: "Permission updated" });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "accept" | "decline" }) => {
      const res = await apiRequest("POST", `/api/authorized-users/${id}/respond`, { action });
      if (!res.ok) throw new Error("Failed to respond");
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/authorized-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/authorized-users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/authorized-users/accounts"] });
      toast({ title: vars.action === "accept" ? "Invitation accepted" : "Invitation declined" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Team Access</h2>
        <p className="text-sm text-muted-foreground">Add other agents or brokers as authorized users on your account for transaction coordination</p>
      </div>
      <Separator />

      {pendingInvitations.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.owner.firstName} {inv.owner.lastName}</p>
                    <p className="text-xs text-muted-foreground">{inv.owner.email} — {inv.permissionLevel === "full" ? "Full Access" : "View Only"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => respondMutation.mutate({ id: inv.id, action: "decline" })} disabled={respondMutation.isPending}>
                    Decline
                  </Button>
                  <Button size="sm" onClick={() => respondMutation.mutate({ id: inv.id, action: "accept" })} disabled={respondMutation.isPending}>
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Authorized Users</CardTitle>
              <CardDescription>People who can access your account and transactions</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : authorizedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No authorized users yet</p>
              <p className="text-xs mt-1">Add agents or brokers to give them access to your transactions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {authorizedUsers.map((au: any) => (
                <div key={au.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {au.user.profilePhotoUrl ? (
                        <img src={au.user.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{au.user.firstName} {au.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{au.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={au.status === "active" ? "default" : au.status === "pending" ? "secondary" : "outline"} className="text-[10px]">
                      {au.status === "active" ? "Active" : au.status === "pending" ? "Pending" : au.status}
                    </Badge>
                    <Select
                      value={au.permissionLevel}
                      onValueChange={(val) => updatePermissionMutation.mutate({ id: au.id, permissionLevel: val })}
                    >
                      <SelectTrigger className="h-8 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View Only</SelectItem>
                        <SelectItem value="full">Full Access</SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Authorized User</AlertDialogTitle>
                          <AlertDialogDescription>
                            {au.user.firstName} {au.user.lastName} will no longer have access to your account and transactions.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeMutation.mutate(au.id)}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold mb-3">Permission Levels</h3>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">View Only</p>
                <p className="text-xs text-muted-foreground">Can view transactions, documents, contacts, and checklists but cannot make changes</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Full Access</p>
                <p className="text-xs text-muted-foreground">Can manage transactions, documents, contacts, and checklists as if they were the account owner</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Authorized User</DialogTitle>
            <DialogDescription>Enter the email of an agent or broker with an existing account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="agent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Permission Level</Label>
              <Select value={permissionLevel} onValueChange={(v) => setPermissionLevel(v as "view" | "full")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only — Can view but not modify</SelectItem>
                  <SelectItem value="full">Full Access — Can manage everything</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button
                onClick={() => addMutation.mutate({ email, permissionLevel })}
                disabled={!email || addMutation.isPending}
              >
                {addMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotificationsSection() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Notifications</h2>
        <p className="text-sm text-muted-foreground">Control how and when you receive notifications</p>
      </div>
      <Separator />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">Receive browser push notifications for new leads, messages, and updates</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const permission = await Notification.requestPermission();
                  if (permission === "granted") {
                    toast({ title: "Push notifications enabled" });
                  } else {
                    toast({ title: "Push notifications blocked", description: "Please enable in your browser settings", variant: "destructive" });
                  }
                } catch {
                  toast({ title: "Not supported", variant: "destructive" });
                }
              }}
            >
              {typeof Notification !== "undefined" && Notification.permission === "granted" ? "Enabled" : "Enable"}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-sm text-muted-foreground">Get text messages for urgent lead alerts and transaction updates</p>
            </div>
            <Badge variant="outline">Automatic</Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive email summaries and important updates</p>
            </div>
            <Badge variant="outline">Automatic</Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">In-App Notifications</p>
              <p className="text-sm text-muted-foreground">Bell icon alerts and real-time toasts within the app</p>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Always On</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
