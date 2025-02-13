import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function NavTabs() {
  const [location] = useLocation();

  const { user } = useAuth();
  const tabs = [
    { name: "Transactions", href: "/" },
    { name: "Clients", href: "/clients" },
    { name: "Calendar", href: "/calendar" },
    ...(user?.role === 'agent' ? [{ name: "Data", href: "/data" }] : []),
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
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
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