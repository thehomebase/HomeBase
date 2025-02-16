
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
    <div className="min-h-screen w-full flex items-center justify-center">
      <LoginForm className="w-full max-w-sm mx-auto px-4" />
    </div>
  );
}
