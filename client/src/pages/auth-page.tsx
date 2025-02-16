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
    <div className="min-h-screen w-full bg-background flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4">
        <LoginForm />
      </div>
    </div>
  );
}