import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Camera, Shield, ShieldCheck, CheckCircle2, MapPin, Phone, Mail, Pencil, Building2, FileText, User as UserIcon, Star } from "lucide-react";
import type { User } from "@shared/schema";

type PublicProfile = Omit<User, "password" | "emailVerificationToken" | "emailVerificationExpires" | "registrationIp">;

function VerificationBadge({ status }: { status: string | null | undefined }) {
  if (status === "admin_verified") {
    return (
      <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700">
        <ShieldCheck className="h-3 w-3" /> Platform Verified
      </Badge>
    );
  }
  if (status === "broker_verified") {
    return (
      <Badge className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700">
        <Shield className="h-3 w-3" /> Broker Verified
      </Badge>
    );
  }
  if (status === "licensed") {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700">
        <FileText className="h-3 w-3" /> Licensed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <UserIcon className="h-3 w-3" /> Unverified
    </Badge>
  );
}

function ProfilePhotoCard({ profile, isOwn }: { profile: PublicProfile; isOwn: boolean }) {
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/profile/photo", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: ["/api/profile", profile.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile photo updated" });
    } catch {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    }
    setUploading(false);
  }

  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      <div className="relative rounded-xl overflow-hidden bg-[#ebebeb] dark:bg-neutral-800 aspect-[4/5]">
        {profile.brokerageName && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 bg-white/70 dark:bg-black/40 px-2 py-0.5 rounded">
              {profile.brokerageName}
            </span>
          </div>
        )}

        {profile.profilePhotoUrl ? (
          <img
            src={profile.profilePhotoUrl}
            alt={`${profile.firstName} ${profile.lastName}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UserIcon className="h-24 w-24 text-neutral-400 dark:text-neutral-600" />
          </div>
        )}

        {isOwn && (
          <button
            className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2.5 transition-colors"
            onClick={() => photoRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="h-4 w-4" />
          </button>
        )}
      </div>

      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
        e.target.value = "";
      }} />
    </div>
  );
}

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);

  const profileId = params?.id ? parseInt(params.id, 10) : user?.id;
  const isOwn = profileId === user?.id;

  const { data: profile, isLoading } = useQuery<PublicProfile>({
    queryKey: ["/api/profile", profileId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${profileId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!profileId,
  });

  const [editData, setEditData] = useState({
    profileBio: "",
    profilePhone: "",
    brokerageName: "",
    licenseNumber: "",
    licenseState: "",
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", profileId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setShowEdit(false);
      toast({ title: "Profile updated" });
    },
    onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
  });

  function openEdit() {
    if (!profile) return;
    setEditData({
      profileBio: profile.profileBio || "",
      profilePhone: profile.profilePhone || "",
      brokerageName: profile.brokerageName || "",
      licenseNumber: profile.licenseNumber || "",
      licenseState: profile.licenseState || "",
    });
    setShowEdit(true);
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-8 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full px-4 sm:px-8 py-6 text-center">
        <h1 className="text-xl font-bold">Profile Not Found</h1>
        <p className="text-muted-foreground mt-2">This user doesn't exist or their profile is not available.</p>
      </div>
    );
  }

  const isAgentOrBroker = profile.role === "agent" || profile.role === "broker";

  return (
    <div className="w-full px-4 sm:px-8 py-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-4">
          <ProfilePhotoCard profile={profile} isOwn={isOwn} />
        </div>

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h1>
              <p className="text-muted-foreground capitalize">{profile.role === "broker" ? "Managing Broker" : profile.role === "agent" ? "Real Estate Agent" : profile.role}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {isAgentOrBroker && <VerificationBadge status={profile.verificationStatus} />}
              </div>
            </div>
            {isOwn && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
          </div>

          {profile.profileBio && (
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.profileBio}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isAgentOrBroker && profile.brokerageName && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2"><Building2 className="h-4 w-4" /></div>
                  <div>
                    <div className="text-xs text-muted-foreground">Brokerage</div>
                    <div className="text-sm font-medium">{profile.brokerageName}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAgentOrBroker && profile.licenseNumber && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2"><FileText className="h-4 w-4" /></div>
                  <div>
                    <div className="text-xs text-muted-foreground">License</div>
                    <div className="text-sm font-medium">#{profile.licenseNumber} ({profile.licenseState})</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {profile.profilePhone && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2"><Phone className="h-4 w-4" /></div>
                  <div>
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="text-sm font-medium">{profile.profilePhone}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2"><Mail className="h-4 w-4" /></div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-sm font-medium truncate">{profile.email}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {isAgentOrBroker && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Star className="h-4 w-4" /> Verification Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <VerificationBadge status={profile.verificationStatus} />
                  </div>
                  {profile.licenseNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">License Number</span>
                      <span className="font-mono">{profile.licenseNumber}</span>
                    </div>
                  )}
                  {profile.licenseState && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">State</span>
                      <span>{profile.licenseState}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      {profile.verificationStatus === "admin_verified"
                        ? "This user has been verified by the HomeBase platform."
                        : profile.verificationStatus === "broker_verified"
                        ? "This user has been verified by their managing broker on HomeBase."
                        : profile.verificationStatus === "licensed"
                        ? "This user has provided their license information. License can be verified through the state's real estate commission."
                        : "This user has not yet provided license information."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Bio</Label>
              <Textarea
                value={editData.profileBio}
                onChange={e => setEditData(p => ({ ...p, profileBio: e.target.value }))}
                placeholder="Tell people about yourself and your experience..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                value={editData.profilePhone}
                onChange={e => setEditData(p => ({ ...p, profilePhone: e.target.value }))}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            </div>
            {isAgentOrBroker && (
              <>
                <div>
                  <Label className="text-xs">Brokerage Name</Label>
                  <Input
                    value={editData.brokerageName}
                    onChange={e => setEditData(p => ({ ...p, brokerageName: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">License Number</Label>
                    <Input
                      value={editData.licenseNumber}
                      onChange={e => setEditData(p => ({ ...p, licenseNumber: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">License State</Label>
                    <Input
                      value={editData.licenseState}
                      onChange={e => setEditData(p => ({ ...p, licenseState: e.target.value }))}
                      maxLength={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate(editData)} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
