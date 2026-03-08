import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Trash2, ShieldCheck } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

export function BiometricSetupButton({ compact = false }: { compact?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className="w-full">
          <Fingerprint className="h-4 w-4" />
          {!compact && <span className="ml-2">Biometric Login</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Biometric Login
          </DialogTitle>
          <DialogDescription>
            Set up Face ID, fingerprint, or other biometric authentication for quick sign-in.
          </DialogDescription>
        </DialogHeader>
        <BiometricSetupContent />
      </DialogContent>
    </Dialog>
  );
}

function BiometricSetupContent() {
  const { toast } = useToast();
  const [registering, setRegistering] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(setAvailable);
    }
  }, []);

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ["/api/webauthn/credentials"],
  });

  if (!available) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          Biometric login is not available on this device or browser. Try opening the app in Safari (iPhone) or Chrome (Android) on your phone.
        </p>
      </div>
    );
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/webauthn/credentials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webauthn/credentials"] });
      toast({ title: "Credential removed" });
    },
  });

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const optionsRes = await apiRequest("POST", "/api/webauthn/register-options", {});
      const options = await optionsRes.json();

      const regResponse = await startRegistration({ optionsJSON: options });

      const verifyRes = await apiRequest("POST", "/api/webauthn/register-verify", regResponse);
      const result = await verifyRes.json();

      if (result.verified) {
        queryClient.invalidateQueries({ queryKey: ["/api/webauthn/credentials"] });
        toast({ title: "Biometric login enabled!", description: "You can now sign in with your face or fingerprint." });
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
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (credentials as any[]).length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            You have {(credentials as any[]).length} registered device{(credentials as any[]).length > 1 ? "s" : ""}.
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
                onClick={() => deleteMutation.mutate(cred.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No biometric credentials registered yet. Set one up to sign in instantly with your face or fingerprint.
        </p>
      )}

      <Button onClick={handleRegister} disabled={registering} className="w-full gap-2">
        <Fingerprint className="h-4 w-4" />
        {registering ? "Setting up..." : (credentials as any[]).length > 0 ? "Add Another Device" : "Set Up Biometric Login"}
      </Button>
    </div>
  );
}
