import Image from "@/components/ui/image";

export function Logo() {
  return (
    <div className="flex items-center">
      <Image
        src="/homebase-logo.png"
        alt="Homebase Logo"
        className="h-8 w-auto"
      />
    </div>
  );
}
