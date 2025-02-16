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
    <div className="grid min-h-svh place-items-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}