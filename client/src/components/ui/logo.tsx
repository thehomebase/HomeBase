import { type HTMLAttributes } from "react";

export function Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center ${className}`} {...props}>
      <img
        src="/homebaselogo.png"
        alt="Homebase Logo"
        className="h-12 w-auto" 
        style={{ minWidth: '160px' }} 
      />
    </div>
  );
}