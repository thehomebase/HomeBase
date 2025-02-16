
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { LoginForm } from "@/components/login-form";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="container flex items-center justify-center min-h-screen mx-auto">
        <div className="w-full max-w-[400px] bg-card rounded-lg border shadow-sm p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
