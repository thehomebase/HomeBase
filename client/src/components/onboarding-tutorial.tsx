import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, FileText, Users, Wrench, MessageSquare,
  MapPin, Home, DollarSign, Gift, Bell, Calendar,
  Store, Search, Mail, ChevronRight, ChevronLeft, X,
  Rocket, CheckCircle2, Sparkles, BarChart3, HelpCircle
} from "lucide-react";

type TutorialStep = {
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
  route?: string;
  highlight?: string;
  category: "getting-started" | "deals" | "clients" | "tools" | "growth";
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to HomeBase!",
    description: "This quick tour will walk you through the key features of your new real estate command center. Each step highlights a tool designed to save you time and close more deals.",
    icon: Rocket,
    route: "/dashboard",
    category: "getting-started",
  },
  {
    title: "Your Dashboard",
    description: "This is your home base. See your deal pipeline, key metrics, unread messages, and upcoming deadlines at a glance. You can customize which widgets appear using the settings gear icon.",
    icon: LayoutDashboard,
    route: "/dashboard",
    category: "getting-started",
  },
  {
    title: "Transactions",
    description: "Manage all your active and past deals here. Create new transactions, upload contracts for automatic data extraction, track document checklists, and monitor each deal's timeline from listing to close.",
    icon: FileText,
    route: "/transactions",
    category: "deals",
  },
  {
    title: "Commission Tracker",
    description: "Track your earnings on every deal. Set commission rates, splits, referral fees, and expenses. When a transaction closes, a commission entry is automatically created. View your YTD earnings and monthly trends.",
    icon: DollarSign,
    route: "/commissions",
    category: "deals",
  },
  {
    title: "Client Management",
    description: "Your CRM for buyers and sellers. Add clients, track their contact info, invite them to their own client portal, and manage the relationship throughout and beyond the transaction.",
    icon: Users,
    route: "/clients",
    category: "clients",
  },
  {
    title: "Smart Reminders",
    description: "Never miss a birthday, closing anniversary, or follow-up. Set up automated reminders that deliver via SMS, email, or in-app message. Closing anniversary reminders are auto-created when deals close.",
    icon: Bell,
    route: "/reminders",
    category: "clients",
  },
  {
    title: "Messages",
    description: "Communicate securely with clients, vendors, and lenders through encrypted private messaging. All conversations are organized and searchable in one place.",
    icon: MessageSquare,
    route: "/messages",
    category: "tools",
  },
  {
    title: "Mail Integration",
    description: "Connect your Gmail account to send and receive emails directly within HomeBase. Keep all your client communication in one place without switching between apps.",
    icon: Mail,
    route: "/mail",
    category: "tools",
  },
  {
    title: "Calendar",
    description: "View all your appointments, showings, open houses, and deadlines in one calendar. Stay organized and never double-book.",
    icon: Calendar,
    route: "/calendar",
    category: "tools",
  },
  {
    title: "HomeBase Pros",
    description: "Find and manage trusted home service professionals. Browse by category, add pros, rate their performance, read reviews from other agents, and add top vendors to your team with one click. Switch between card and table views for easy sorting.",
    icon: Store,
    route: "/marketplace",
    category: "tools",
  },
  {
    title: "Open Houses",
    description: "Schedule open houses and generate a unique digital sign-in page. Visitors enter their info on their phone — no paper sign-in sheets. Every visitor automatically becomes a lead in your system.",
    icon: Home,
    route: "/open-houses",
    category: "growth",
  },
  {
    title: "Lead Generation",
    description: "Claim zip codes to receive consumer leads in your area. Leads come from public service request forms and are routed to you automatically. Track and convert them right from this page.",
    icon: MapPin,
    route: "/lead-gen",
    category: "growth",
  },
  {
    title: "Drip Campaigns",
    description: "Set up automated email sequences to nurture leads over time. Create campaigns, add contacts, and let HomeBase keep your name in front of prospects on autopilot.",
    icon: Sparkles,
    route: "/drip",
    category: "growth",
  },
  {
    title: "Referral Program",
    description: "Earn rewards by referring other agents and vendors to HomeBase. Track your referrals, see who's signed up, and monitor your earnings from the affiliate program.",
    icon: Gift,
    route: "/referrals",
    category: "growth",
  },
  {
    title: "Market Data & Analytics",
    description: "Dive deep into your performance metrics, transaction history, and market trends. Use data-driven insights to make smarter business decisions.",
    icon: BarChart3,
    route: "/data",
    category: "tools",
  },
  {
    title: "Property Search & Map",
    description: "Search property listings and explore your market on an interactive map. Draw boundaries to define your farm area and discover opportunities in your target neighborhoods.",
    icon: Search,
    route: "/property-search",
    category: "tools",
  },
  {
    title: "You're All Set!",
    description: "You've completed the HomeBase tour! Start by adding your first client or creating a transaction. You can always restart this tutorial from the help button in the sidebar. Happy closing!",
    icon: CheckCircle2,
    route: "/dashboard",
    category: "getting-started",
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  "getting-started": { label: "Getting Started", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  "deals": { label: "Deals & Money", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  "clients": { label: "Client Relations", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  "tools": { label: "Tools", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  "growth": { label: "Growth", color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" },
};

function getStorageKey(userId: number | undefined) {
  return `homebase_tutorial_completed_${userId ?? "anon"}`;
}

function getActiveKey(userId: number | undefined) {
  return `homebase_tutorial_active_${userId ?? "anon"}`;
}

export function useOnboardingTutorial(userId?: number, role?: string) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();

  const isEligible = role === "agent" || role === "broker";

  useEffect(() => {
    if (!isEligible || !userId) return;
    const completed = localStorage.getItem(getStorageKey(userId));
    const active = localStorage.getItem(getActiveKey(userId));
    if (!completed && !active) {
      setIsActive(true);
      localStorage.setItem(getActiveKey(userId), "true");
    }
  }, [isEligible, userId]);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    if (userId) localStorage.setItem(getActiveKey(userId), "true");
    setLocation("/dashboard");
  }, [userId, setLocation]);

  const closeTutorial = useCallback(() => {
    setIsActive(false);
    if (userId) {
      localStorage.setItem(getStorageKey(userId), "true");
      localStorage.removeItem(getActiveKey(userId));
    }
  }, [userId]);

  return { isActive: isActive && isEligible, currentStep, setCurrentStep, startTutorial, closeTutorial };
}

export function TutorialStartButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <HelpCircle className="h-4 w-4" />
      <span>Tutorial</span>
    </Button>
  );
}

export function OnboardingTutorial({
  isActive,
  currentStep,
  setCurrentStep,
  onClose,
}: {
  isActive: boolean;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();

  if (!isActive) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;
  const totalSteps = TUTORIAL_STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const categoryInfo = CATEGORY_LABELS[step.category];

  const handleNext = () => {
    if (isLast) {
      onClose();
      setLocation("/dashboard");
      return;
    }
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    if (TUTORIAL_STEPS[nextStep].route) {
      setLocation(TUTORIAL_STEPS[nextStep].route!);
    }
  };

  const handlePrev = () => {
    if (isFirst) return;
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    if (TUTORIAL_STEPS[prevStep].route) {
      setLocation(TUTORIAL_STEPS[prevStep].route!);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={handleSkip} />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 pointer-events-auto">
        <Card className="shadow-2xl border-2 overflow-hidden">
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${categoryInfo.color}`}>
                      {categoryInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {currentStep + 1} of {totalSteps}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base leading-tight">{step.title}</h3>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={handleSkip}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-4 pl-[52px]">
              {step.description}
            </p>

            <div className="flex items-center justify-between pl-[52px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-xs text-muted-foreground"
              >
                Skip tour
              </Button>

              <div className="flex items-center gap-2">
                {!isFirst && (
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4 mr-0.5" />
                    Back
                  </Button>
                )}
                <Button size="sm" onClick={handleNext}>
                  {isLast ? (
                    <>
                      Finish
                      <CheckCircle2 className="h-4 w-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-0.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-center gap-1 mt-4">
              {TUTORIAL_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentStep(i);
                    if (TUTORIAL_STEPS[i].route) setLocation(TUTORIAL_STEPS[i].route!);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStep
                      ? "w-6 bg-primary"
                      : i < currentStep
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
