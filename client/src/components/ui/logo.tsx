import { type HTMLAttributes } from "react";

export function Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center ${className}`} {...props}>
      <img
        src="/homebase-logo.png"
        alt="Homebase Logo"
        className="h-10 w-auto"
        style={{ minWidth: '32px' }}
      />
    </div>
  );
}