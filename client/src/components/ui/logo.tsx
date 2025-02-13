
import { type HTMLAttributes } from "react";
import { Link, useLocation } from "wouter";

export function Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const [location] = useLocation();
  const isHomePage = location === "/";

  const logoContent = (
    <div className={`flex items-center ${className}`} {...props}>
      <img
        src="/homebaselogowhite.png"
        alt="Homebase Logo"
        className="h-8 md:h-10 w-auto object-contain transition-all" 
        style={{ 
          maxWidth: '140px',
          aspectRatio: 'auto'
        }} 
      />
    </div>
  );

  if (isHomePage) {
    return logoContent;
  }

  return (
    <Link href="/" className="hover:opacity-80 transition-opacity">
      {logoContent}
    </Link>
  );
}
