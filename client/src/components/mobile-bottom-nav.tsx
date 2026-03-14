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
  Settings2,
  Check,
  Moon,
  Sun,
  Briefcase,
  DollarSign,
  ScanLine,
  Phone,
  Zap,
  Key,
  User,
  Settings,
  Target,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { useLeadAlerts } from "@/hooks/use-lead-alerts";

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  id: string;
}

const MORE_ITEM: NavItem = { icon: MoreHorizontal, label: "More", href: "__more__", id: "more" };

function getAllNavItems(role: string | undefined): NavItem[] {
  if (role === "vendor") {
    return [
      { icon: Wrench, label: "Portal", href: "/vendor", id: "vendor-portal" },
      { icon: BarChart3, label: "Ratings", href: "/vendor-ratings", id: "vendor-ratings" },
      { icon: Store, label: "Pros", href: "/marketplace", id: "marketplace" },
      { icon: MessageSquare, label: "Messages", href: "/messages", id: "messages" },
      { icon: HardHat, label: "My Team", href: "/my-team", id: "my-team" },
      { icon: Home, label: "MyHome", href: "/my-home", id: "my-home" },
      { icon: Star, label: "Find Agents", href: "/top-agents", id: "top-agents" },
      { icon: Search, label: "Search", href: "/property-search", id: "search" },
      { icon: Calendar, label: "Calendar", href: "/calendar", id: "calendar" },
      { icon: Calculator, label: "Calculators", href: "/calculators", id: "calculators" },
      { icon: Settings, label: "Settings", href: "/settings", id: "settings" },
    ];
  }

  if (role === "lender") {
    return [
      { icon: FileText, label: "Pipeline", href: "/lender-portal", id: "lender-portal" },
      { icon: Store, label: "Pros", href: "/marketplace", id: "marketplace" },
      { icon: MessageSquare, label: "Messages", href: "/messages", id: "messages" },
      { icon: Search, label: "Search", href: "/property-search", id: "search" },
      { icon: HardHat, label: "My Team", href: "/my-team", id: "my-team" },
      { icon: Home, label: "MyHome", href: "/my-home", id: "my-home" },
      { icon: Star, label: "Find Agents", href: "/top-agents", id: "top-agents" },
      { icon: Calendar, label: "Calendar", href: "/calendar", id: "calendar" },
      { icon: Calculator, label: "Calculators", href: "/calculators", id: "calculators" },
      { icon: Settings, label: "Settings", href: "/settings", id: "settings" },
    ];
  }

  if (role === "broker") {
    return [
      { icon: FileText, label: "Deals", href: "/transactions", id: "transactions" },
      { icon: Users, label: "Clients", href: "/clients", id: "clients" },
      { icon: MessageSquare, label: "Messages", href: "/messages", id: "messages" },
      { icon: Briefcase, label: "Broker Portal", href: "/broker-portal", id: "broker-portal" },
      { icon: DollarSign, label: "Commissions", href: "/commissions", id: "commissions" },
      { icon: Search, label: "Search", href: "/property-search", id: "search" },
      { icon: BarChart3, label: "Data", href: "/data", id: "data" },
      { icon: Map, label: "Map", href: "/map", id: "map" },
      { icon: Store, label: "HomeBase Pros", href: "/marketplace", id: "marketplace" },
      { icon: HardHat, label: "My Team", href: "/my-team", id: "my-team" },
      { icon: Home, label: "MyHome", href: "/my-home", id: "my-home" },
      { icon: Star, label: "Find Agents", href: "/top-agents", id: "top-agents" },
      { icon: Calendar, label: "Calendar", href: "/calendar", id: "calendar" },
      { icon: Mail, label: "Mail", href: "/mail", id: "mail" },
      { icon: Gift, label: "Referrals", href: "/referrals", id: "referrals" },
      { icon: Bell, label: "Drip Campaigns", href: "/drip", id: "drip" },
      { icon: MapPin, label: "Lead Gen", href: "/lead-gen", id: "lead-gen" },
      { icon: Target, label: "Lead Metrics", href: "/lead-metrics", id: "lead-metrics" },
      { icon: Calculator, label: "Calculators", href: "/calculators", id: "calculators" },
      { icon: ScanLine, label: "Scanner", href: "/scanner", id: "scanner" },
      { icon: Phone, label: "Phone & SMS", href: "/phone", id: "phone" },
      { icon: Settings, label: "Settings", href: "/settings", id: "settings" },
    ];
  }

  if (role === "client") {
    return [
      { icon: FileText, label: "Transaction", href: "/my-transaction", id: "my-transaction" },
      { icon: Search, label: "Search", href: "/property-search", id: "search" },
      { icon: MessageSquare, label: "Messages", href: "/messages", id: "messages" },
      { icon: HardHat, label: "My Team", href: "/my-team", id: "my-team" },
      { icon: Store, label: "HomeBase Pros", href: "/marketplace", id: "marketplace" },
      { icon: Home, label: "MyHome", href: "/my-home", id: "my-home" },
      { icon: Star, label: "Find Agents", href: "/top-agents", id: "top-agents" },
      { icon: Calendar, label: "Calendar", href: "/calendar", id: "calendar" },
      { icon: Calculator, label: "Calculators", href: "/calculators", id: "calculators" },
      { icon: Book, label: "Glossary", href: "/glossary", id: "glossary" },
      { icon: Settings, label: "Settings", href: "/settings", id: "settings" },
    ];
  }

  return [
    { icon: FileText, label: "Deals", href: "/transactions", id: "transactions" },
    { icon: Users, label: "Clients", href: "/clients", id: "clients" },
    { icon: MessageSquare, label: "Messages", href: "/messages", id: "messages" },
    { icon: Search, label: "Search", href: "/property-search", id: "search" },
    { icon: BarChart3, label: "Data", href: "/data", id: "data" },
    { icon: Map, label: "Map", href: "/map", id: "map" },
    { icon: Store, label: "HomeBase Pros", href: "/marketplace", id: "marketplace" },
    { icon: HardHat, label: "My Team", href: "/my-team", id: "my-team" },
    { icon: Home, label: "MyHome", href: "/my-home", id: "my-home" },
    { icon: Star, label: "Find Agents", href: "/top-agents", id: "top-agents" },
    { icon: Calendar, label: "Calendar", href: "/calendar", id: "calendar" },
    { icon: Mail, label: "Mail", href: "/mail", id: "mail" },
    { icon: Gift, label: "Referrals", href: "/referrals", id: "referrals" },
    { icon: Bell, label: "Drip Campaigns", href: "/drip", id: "drip" },
    { icon: MapPin, label: "Lead Gen", href: "/lead-gen", id: "lead-gen" },
    { icon: Target, label: "Lead Metrics", href: "/lead-metrics", id: "lead-metrics" },
    { icon: Calculator, label: "Calculators", href: "/calculators", id: "calculators" },
    { icon: ScanLine, label: "Scanner", href: "/scanner", id: "scanner" },
    { icon: Phone, label: "Phone & SMS", href: "/phone", id: "phone" },
    { icon: Settings, label: "Settings", href: "/settings", id: "settings" },
  ];
}

function getDefaultSelectedIds(role: string | undefined): string[] {
  if (role === "vendor") return ["vendor-portal", "messages", "marketplace", "more"];
  if (role === "lender") return ["lender-portal", "messages", "search", "more"];
  if (role === "client") return ["my-transaction", "messages", "search", "more"];
  if (role === "broker") return ["transactions", "broker-portal", "messages", "more"];
  return ["transactions", "clients", "messages", "more"];
}

function getStorageKey(role: string | undefined, userId?: number): string {
  return `mobile-nav-items-${userId || "0"}-${role || "agent"}`;
}

function loadSelectedIds(role: string | undefined, userId?: number): string[] {
  try {
    const stored = localStorage.getItem(getStorageKey(role, userId));
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((s: unknown) => typeof s === "string")) {
        if (!parsed.includes("more")) {
          parsed[3] = "more";
        }
        return parsed;
      }
    }
  } catch {}
  return getDefaultSelectedIds(role);
}

function saveSelectedIds(role: string | undefined, userId: number | undefined, ids: string[]) {
  localStorage.setItem(getStorageKey(role, userId), JSON.stringify(ids));
}

export function MobileBottomNav() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [showMore, setShowMore] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const { newLeadCount } = useLeadAlerts();

  const [selectedIds, setSelectedIds] = useState<string[]>(() => loadSelectedIds(user?.role, user?.id));

  useEffect(() => {
    setSelectedIds(loadSelectedIds(user?.role, user?.id));
  }, [user?.role, user?.id]);

  if (!user) return null;

  const allItems = getAllNavItems(user.role);
  const allWithMore = [...allItems, MORE_ITEM];

  const barItems = selectedIds
    .map((id) => allWithMore.find((item) => item.id === id))
    .filter(Boolean) as NavItem[];

  while (barItems.length < 4) {
    const defaults = getDefaultSelectedIds(user.role);
    const missing = defaults.find((d) => !barItems.some((b) => b.id === d));
    if (missing) {
      const item = allWithMore.find((i) => i.id === missing);
      if (item) barItems.push(item);
    } else break;
  }

  const leftItems = barItems.slice(0, 2);
  const rightItems = barItems.slice(2, 4);

  const overflowItems = allItems.filter(
    (item) => !barItems.some((b) => b.id === item.id)
  );

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const hasBadge = (item: NavItem) =>
    newLeadCount > 0 && (item.href === "/lead-gen" || item.href === "/vendor");

  const hasMoreBadge = newLeadCount > 0 && overflowItems.some(
    (item) => item.href === "/lead-gen" || item.href === "/vendor"
  );

  function renderNavButton(item: NavItem) {
    if (item.id === "more") {
      return (
        <button
          key="more"
          onClick={() => setShowMore(!showMore)}
          className={`flex flex-col items-center gap-0.5 py-1 px-1 flex-1 rounded-lg transition-all active:scale-90 ${
            showMore ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div className="relative">
            <MoreHorizontal className={`h-5 w-5 ${showMore ? "stroke-[2.5]" : ""}`} />
            {hasMoreBadge && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background" />
            )}
          </div>
          <span className="text-[10px] leading-tight font-medium">More</span>
        </button>
      );
    }

    const badge = hasBadge(item);
    return (
      <Link
        key={item.id}
        href={item.href}
        className={`flex flex-col items-center gap-0.5 py-1 px-1 flex-1 rounded-lg transition-all active:scale-90 ${
          isActive(item.href) ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <div className="relative">
          <item.icon className={`h-5 w-5 ${isActive(item.href) ? "stroke-[2.5]" : ""}`} />
          {badge && (
            <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-0.5 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full leading-none">
              {newLeadCount > 99 ? "99+" : newLeadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] leading-tight font-medium">{item.label}</span>
      </Link>
    );
  }

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-[1100] bg-black/50" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl max-h-[70vh] overflow-y-auto pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
              <span className="font-semibold text-sm">More</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowMore(false);
                    setShowCustomize(true);
                  }}
                  className="p-1.5 rounded-full hover:bg-muted active:scale-90 transition-transform"
                  title="Customize bottom bar"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowMore(false)}
                  className="p-1 rounded-full hover:bg-muted active:scale-90 transition-transform"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 p-3">
              {overflowItems.map((item) => (
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
              <Link
                href="/profile"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 w-full p-3 rounded-xl text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
              >
                <User className="h-5 w-5" />
                <span className="text-sm">My Profile</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 w-full p-3 rounded-xl text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
              >
                <Settings className="h-5 w-5" />
                <span className="text-sm">Settings</span>
              </Link>
              <button
                onClick={() => {
                  const nowDark = document.documentElement.classList.toggle("dark");
                  localStorage.setItem("theme", nowDark ? "dark" : "light");
                  setIsDarkMode(nowDark);
                }}
                className="flex items-center gap-3 w-full p-3 rounded-xl text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="text-sm">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
              </button>
              <button
                onClick={() => {
                  setShowMore(false);
                  setShowCustomize(true);
                }}
                className="flex items-center gap-3 w-full p-3 rounded-xl text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
              >
                <Settings2 className="h-5 w-5" />
                <span className="text-sm">Customize Bottom Bar</span>
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

      {showCustomize && (
        <CustomizeSheet
          role={user.role}
          allItems={allItems}
          selectedIds={selectedIds}
          onSave={(ids) => {
            setSelectedIds(ids);
            saveSelectedIds(user.role, user.id, ids);
            setShowCustomize(false);
          }}
          onClose={() => setShowCustomize(false)}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-[1050] bg-background/95 backdrop-blur-md border-t md:hidden">
        <div className="flex items-center px-1 pt-1 pb-safe">
          {leftItems.map(renderNavButton)}

          <Link
            href="/"
            className="flex flex-col items-center -mt-5 active:scale-90 transition-transform flex-1"
          >
            <div className={`rounded-full p-2.5 shadow-lg border-2 transition-colors ${
              isActive("/")
                ? "bg-primary border-primary"
                : "bg-zinc-900 border-zinc-700 dark:bg-zinc-800 dark:border-zinc-600"
            }`}>
              <img
                src="/homebaselogoicon_nobg.png"
                alt="Home"
                className="h-6 w-6 invert"
                style={{ objectFit: 'contain' }}
              />
            </div>
            <span className={`text-[10px] leading-tight font-medium mt-0.5 ${
              isActive("/") ? "text-primary" : "text-muted-foreground"
            }`}>Home</span>
          </Link>

          {rightItems.map(renderNavButton)}
        </div>
      </nav>
    </>
  );
}

function CustomizeSheet({
  role,
  allItems,
  selectedIds,
  onSave,
  onClose,
}: {
  role: string;
  allItems: NavItem[];
  selectedIds: string[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}) {
  const allWithMore = [...allItems, MORE_ITEM];
  const [draft, setDraft] = useState<string[]>([...selectedIds]);

  const toggleItem = useCallback((id: string) => {
    if (id === "more") return;
    setDraft((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 4) return prev;
      const moreIdx = prev.indexOf("more");
      if (moreIdx === prev.length - 1) {
        return [...prev.slice(0, moreIdx), id, "more"];
      }
      return [...prev, id];
    });
  }, []);

  const selectedItems = draft
    .map((id) => allWithMore.find((item) => item.id === id))
    .filter(Boolean) as NavItem[];

  return (
    <div className="fixed inset-0 z-[70] bg-black/50" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl max-h-[85vh] overflow-y-auto pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <span className="font-semibold text-sm">Customize Bottom Bar</span>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted active:scale-90 transition-transform"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-3">
            Choose 3 buttons for your bottom bar. Home and More always stay in place.
          </p>

          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Preview
            </p>
            <div className="flex items-center justify-around bg-muted/50 rounded-xl p-2">
              {selectedItems.slice(0, 2).map((item) => (
                <div key={item.id} className="flex flex-col items-center gap-0.5 px-2">
                  <item.icon className="h-4 w-4 text-foreground" />
                  <span className="text-[9px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-0.5 px-2">
                <div className="rounded-full bg-zinc-900 dark:bg-zinc-700 p-1.5">
                  <img src="/homebaselogoicon_nobg.png" alt="Home" className="h-4 w-4 invert" style={{ objectFit: 'contain' }} />
                </div>
                <span className="text-[9px] text-muted-foreground">Home</span>
              </div>
              {selectedItems.slice(2, 4).map((item) => (
                <div key={item.id} className="flex flex-col items-center gap-0.5 px-2">
                  <item.icon className="h-4 w-4 text-foreground" />
                  <span className="text-[9px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - selectedItems.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex flex-col items-center gap-0.5 px-2">
                  <div className="h-4 w-4 rounded border-2 border-dashed border-muted-foreground/30" />
                  <span className="text-[9px] text-muted-foreground/30">Empty</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Available buttons ({draft.length}/4 selected)
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {allWithMore.map((item) => {
              const isSelected = draft.includes(item.id);
              const isLocked = item.id === "more";
              const isDisabled = isLocked || (!isSelected && draft.length >= 4);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${
                    isLocked
                      ? "bg-primary/10 text-primary border border-primary/30 opacity-80"
                      : isSelected
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : isDisabled
                      ? "text-muted-foreground/40 bg-muted/30"
                      : "text-foreground hover:bg-muted border border-transparent"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                  {isLocked && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-primary/70 font-medium">Always shown</span>
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  {isSelected && !isLocked && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-primary/70 font-medium">
                        {draft.indexOf(item.id) < 2 ? "Left" : "Right"}
                      </span>
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 p-4 border-t bg-background flex gap-3">
          <button
            onClick={() => {
              const defaults = getDefaultSelectedIds(role);
              setDraft(defaults);
            }}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => {
              if (draft.length === 4) onSave(draft);
            }}
            disabled={draft.length !== 4}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              draft.length === 4
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
