
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  return (
    <div className="min-h-screen w-full bg-background grid place-items-center">
      <div className="w-full max-w-[400px] p-8 border border-gray-300">
        <h1>Test Centering</h1>
      </div>
    </div>
  );
}
