import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  FileText,
  Users,
  MessageSquare,
  Search,
  MoreHorizontal,
  Fingerprint,
  Home,
  Wrench,
  BarChart3,
  Store,
  HardHat,
  Calendar,
  Map,
  Mail,
  Gift,
  Bell,
  MapPin,
  CreditCard,
  Calculator,
  Book,
  Star,
  LogOut,
  X,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useLeadAlerts } from "@/hooks/use-lead-alerts";

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

function getNavItems(role: string | undefined): { primary: NavItem[]; overflow: NavItem[] } {
  if (role === "vendor") {
    return {
      primary: [
        { icon: Wrench, label: "Portal", href: "/vendor" },
        { icon: BarChart3, label: "Ratings", href: "/vendor-ratings" },
        { icon: Store, label: "Pros", href: "/marketplace" },
        { icon: MessageSquare, label: "Messages", href: "/messages" },
      ],
      overflow: [
        { icon: HardHat, label: "My Team", href: "/my-team" },
        { icon: Home, label: "MyHome", href: "/my-home" },
        { icon: Star, label: "Find Agents", href: "/top-agents" },
        { icon: Search, label: "Search", href: "/property-search" },
        { icon: Calendar, label: "Calendar", href: "/calendar" },
        { icon: CreditCard, label: "Billing", href: "/billing" },
        { icon: Calculator, label: "Calculators", href: "/calculators" },
      ],
    };
  }

  if (role === "client") {
    return {
      primary: [
        { icon: FileText, label: "Transaction", href: "/my-transaction" },
        { icon: Search, label: "Search", href: "/property-search" },
        { icon: MessageSquare, label: "Messages", href: "/messages" },
        { icon: HardHat, label: "My Team", href: "/my-team" },
      ],
      overflow: [
        { icon: Store, label: "HomeBase Pros", href: "/marketplace" },
        { icon: Home, label: "MyHome", href: "/my-home" },
        { icon: Star, label: "Find Agents", href: "/top-agents" },
        { icon: Calendar, label: "Calendar", href: "/calendar" },
        { icon: Calculator, label: "Calculators", href: "/calculators" },
        { icon: Book, label: "Glossary", href: "/glossary" },
      ],
    };
  }

  return {
    primary: [
      { icon: FileText, label: "Deals", href: "/transactions" },
      { icon: Users, label: "Clients", href: "/clients" },
      { icon: MessageSquare, label: "Messages", href: "/messages" },
      { icon: Search, label: "Search", href: "/property-search" },
    ],
    overflow: [
      { icon: BarChart3, label: "Data", href: "/data" },
      { icon: Wrench, label: "Contractors", href: "/contractors" },
      { icon: Map, label: "Map", href: "/map" },
      { icon: Store, label: "HomeBase Pros", href: "/marketplace" },
      { icon: HardHat, label: "My Team", href: "/my-team" },
      { icon: Home, label: "MyHome", href: "/my-home" },
      { icon: Star, label: "Find Agents", href: "/top-agents" },
      { icon: Calendar, label: "Calendar", href: "/calendar" },
      { icon: Mail, label: "Mail", href: "/mail" },
      { icon: Gift, label: "Referrals", href: "/referrals" },
      { icon: Bell, label: "Drip Campaigns", href: "/drip" },
      { icon: MapPin, label: "Lead Gen", href: "/lead-gen" },
      { icon: CreditCard, label: "Billing", href: "/billing" },
      { icon: Calculator, label: "Calculators", href: "/calculators" },
    ],
  };
}

export function MobileBottomNav() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [showMore, setShowMore] = useState(false);
  const { newLeadCount } = useLeadAlerts();

  if (!user) return null;

  const { primary, overflow } = getNavItems(user.role);

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl max-h-[70vh] overflow-y-auto pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
              <span className="font-semibold text-sm">More</span>
              <button
                onClick={() => setShowMore(false)}
                className="p-1 rounded-full hover:bg-muted active:scale-90 transition-transform"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 p-3">
              {overflow.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all active:scale-90 ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className="relative">
                    <item.icon className="h-5 w-5" />
                    {item.href === "/lead-gen" && newLeadCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-0.5 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full leading-none">
                        {newLeadCount > 99 ? "99+" : newLeadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] leading-tight text-center">{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="p-3 border-t space-y-2">
              <button
                onClick={() => {
                  setShowMore(false);
                  setLocation("/settings/biometric");
                }}
                className="flex items-center gap-3 w-full p-3 rounded-xl text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
              >
                <Fingerprint className="h-5 w-5" />
                <span className="text-sm">Biometric Login</span>
              </button>
              <button
                onClick={() => logoutMutation.mutate()}
                className="flex items-center gap-3 w-full p-3 rounded-xl text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t md:hidden">
        <div className="flex items-center justify-around px-1 pt-1 pb-safe">
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-[60px] rounded-lg transition-all active:scale-90 ${
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive(item.href) ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] leading-tight font-medium">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-[60px] rounded-lg transition-all active:scale-90 ${
              showMore ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <MoreHorizontal className={`h-5 w-5 ${showMore ? "stroke-[2.5]" : ""}`} />
              {newLeadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background" />
              )}
            </div>
            <span className="text-[10px] leading-tight font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
