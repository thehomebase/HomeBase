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
} from "lucide-react";
import {
  SiMailchimp,
  SiSlack,
  SiGooglesheets,
} from "react-icons/si";
import { startRegistration } from "@simplewebauthn/browser";
import type { ApiKey, Webhook as WebhookType, ReferralCredit } from "@shared/schema";

type SettingsSection = "profile" | "security" | "billing" | "integrations" | "notifications";

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

const sidebarItems: { id: SettingsSection; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "integrations", label: "API Keys & Integrations", icon: Key },
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

  return (
    <div className={`${isMobile ? "p-4" : "p-6"}`}>
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      <div className={`flex ${isMobile ? "flex-col" : "flex-row"} gap-6`}>
        {isMobile ? (
          <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4">
            {sidebarItems.map(item => (
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
              {sidebarItems.map(item => (
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

function SignNowIntegrationCard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: status, isLoading } = useQuery<{ configured: boolean; connected: boolean; email?: string }>({
    queryKey: ["/api/signnow/status"],
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/signnow/auth-url");
      const data = await res.json();
      window.location.href = data.url;
    },
    onError: () => toast({ title: "Failed to connect SignNow", variant: "destructive" }),
  });

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signnow") === "connected") {
      toast({ title: "SignNow connected successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/signnow/status"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("signnow") === "error") {
      toast({ title: "Failed to connect SignNow", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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

      <SignNowIntegrationCard />

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
