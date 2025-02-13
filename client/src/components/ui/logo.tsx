
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
        className="h-8 md:h-10 w-auto object-contain transition-all dark:hidden" 
        style={{ 
          maxWidth: '140px',
          aspectRatio: 'auto'
        }} 
      />
      <img
        src="/homebaselogowhite.png"
        alt="Homebase Logo"
        className="hidden h-8 md:h-10 w-auto object-contain transition-all dark:block" 
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
