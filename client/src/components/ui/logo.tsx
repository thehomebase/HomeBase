import { type HTMLAttributes } from "react";
import { Link, useLocation } from "wouter";

export function Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const [location] = useLocation();
  const isHomePage = location === "/";

  const logoContent = (
    <div className={`flex items-center ${className}`} {...props}>
      <img
        src="/homebaselogo.png"
        alt="Homebase Logo"
        className="h-12 w-auto" 
        style={{ minWidth: '160px' }} 
      />
    </div>
  );

  // Don't wrap in Link if we're already on the home page
  if (isHomePage) {
    return logoContent;
  }

  return (
    <Link href="/" className="hover:opacity-80 transition-opacity">
      {logoContent}
    </Link>
  );
}