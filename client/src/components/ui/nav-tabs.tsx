import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function NavTabs() {
  const [location] = useLocation();

  const tabs = [
    { name: "Transactions", href: "/" },
    { name: "Clients", href: "/clients" },
    { name: "Chat", href: "/chat" },
  ];

  return (
    <div className="border-b">
      <div className="container mx-auto px-4">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
                location === tab.href
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}