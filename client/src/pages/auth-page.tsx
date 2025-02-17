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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-[90%] sm:w-[1200px] border rounded-lg p-8">
        <LoginForm />
      </div>
    </div>
  );
}