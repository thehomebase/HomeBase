import * as React from "react";
import { type HTMLAttributes } from "react";
import { Link, useLocation } from "wouter";

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  isCompact?: boolean;
}

export function Logo({ className, isCompact = false, ...props }: LogoProps) {
  const [location] = useLocation();
  const isHomePage = location === "/";

  const logoContent = (
    <div className={`flex items-center ${className}`} {...props}>
      <img
        src={isCompact ? "/homebaselogoicon.png" : "/homebaselogo.png"}
        alt="Homebase Logo"
        className={`transition-all dark:invert ${
          isCompact ? 'h-5 w-5' : 'h-8 md:h-10'
        }`}
        style={{ 
          width: isCompact ? '20px' : 'auto',
          maxWidth: isCompact ? '20px' : '140px',
          objectFit: 'contain',
          aspectRatio: isCompact ? '1' : 'auto'
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