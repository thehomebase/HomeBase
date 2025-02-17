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
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="w-[90%] sm:w-[450px] -mt-16 flex flex-col items-center">
        <LoginForm />
      </div>
    </div>
  );
}