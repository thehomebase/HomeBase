import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/ui/logo";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-[1200px] mx-4">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}