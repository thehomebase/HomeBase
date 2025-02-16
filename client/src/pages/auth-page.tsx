
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
    <div className="grid min-h-screen place-items-center bg-background px-6 py-4">
      <div className="w-full max-w-sm mx-auto">
        <LoginForm />
      </div>
    </div>
  );
}
