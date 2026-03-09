import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ArrowRight, BarChart3, FileText, Users, MessageSquare, Map, Shield,
  Zap, Phone, Mail, Home, Star, ChevronRight, CheckCircle2, Briefcase,
  Building2, TrendingUp, Clock, Target, Award
} from "lucide-react";
import heroImage from "@/assets/landing-hero.png";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className={`max-w-6xl mx-auto flex items-center justify-between ${isMobile ? "px-4 py-3" : "px-6 py-4"}`}>
          <div className="flex items-center gap-2 shrink-0">
            <img src="/homebaselogoicon_nobg.png" alt="HomeBase" className="h-7 w-7 dark:invert" />
            <span className="font-bold text-lg tracking-tight">HomeBase</span>
          </div>
          <div className="flex items-center gap-2">
            {!isMobile && (
              <nav className="flex items-center gap-6 mr-6">
                <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              </nav>
            )}
            <Button variant="ghost" size="sm" className="px-2 text-xs" onClick={() => setLocation("/auth")}>Log in</Button>
            <Button size="sm" className="px-3 text-xs whitespace-nowrap" onClick={() => setLocation("/auth")}>Get Started</Button>
          </div>
        </div>
      </nav>

      <section className={`relative ${isMobile ? "pt-28 pb-12 px-4" : "pt-32 pb-20 px-6"}`} style={isMobile ? { paddingTop: "calc(7rem + env(safe-area-inset-top, 0px))" } : undefined}>
        <div className="max-w-6xl mx-auto">
          <div className={`grid gap-8 items-center ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className={isMobile ? "text-center" : ""}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
                <Zap className="h-3 w-3" /> Built for real estate professionals
              </div>
              <h1 className={`font-bold tracking-tight leading-tight mb-6 ${isMobile ? "text-4xl" : "text-5xl lg:text-6xl"}`}>
                The Command Center for Your Real Estate Empire.
              </h1>
              <p className={`text-muted-foreground leading-relaxed mb-8 ${isMobile ? "text-base" : "text-lg"} max-w-lg ${isMobile ? "mx-auto" : ""}`}>
                Manage leads, track closings, and automate your follow-ups without the clutter. HomeBase is the CRM built for the modern agent.
              </p>
              <div className={`flex gap-3 ${isMobile ? "justify-center flex-col" : ""}`}>
                <Button size="lg" className="gap-2 text-base px-8" onClick={() => setLocation("/auth")}>
                  Get Started for Free <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
                  <a href="#features">See Features <ChevronRight className="h-4 w-4" /></a>
                </Button>
              </div>
            </div>
            <div className={`relative ${isMobile ? "mt-4" : ""}`}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border">
                <img
                  src={heroImage}
                  alt="HomeBase platform preview"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-card border rounded-xl shadow-lg p-4 hidden lg:flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Pipeline Value</p>
                  <p className="text-xs text-muted-foreground">$2.4M active deals</p>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-card border rounded-xl shadow-lg p-4 hidden lg:flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">12 Active Clients</p>
                  <p className="text-xs text-muted-foreground">3 closing this month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`bg-muted/50 border-y ${isMobile ? "py-8 px-4" : "py-10 px-6"}`}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground mb-6 uppercase tracking-wider font-medium">Trusted by top-producing agents</p>
          <div className={`flex items-center justify-center gap-8 ${isMobile ? "flex-wrap gap-6" : "gap-12"} opacity-50 grayscale`}>
            <span className="font-bold text-xl tracking-tight">RE/MAX</span>
            <span className="font-bold text-xl tracking-tight">COMPASS</span>
            <span className="font-bold text-xl tracking-tight">KW</span>
            <span className="font-bold text-xl tracking-tight">Sotheby's</span>
            {!isMobile && <span className="font-bold text-xl tracking-tight">Coldwell Banker</span>}
          </div>
        </div>
      </section>

      <section id="features" className={`${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">Features</p>
            <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl"}`}>
              Everything you need to close more deals
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From first contact to closing day and beyond, HomeBase keeps you organized and your clients informed.
            </p>
          </div>
          <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3"}`}>
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-lg transition-all duration-300 border hover:border-primary/20">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className={`bg-muted/30 ${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">How It Works</p>
            <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl"}`}>
              Up and running in minutes
            </h2>
          </div>
          <div className={`grid gap-8 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 relative">
                  <span className="text-2xl font-bold text-primary">{i + 1}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">For Every Role</p>
            <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl"}`}>
              One platform, every perspective
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're an agent, vendor, lender, or client — HomeBase has a tailored experience for you.
            </p>
          </div>
          <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
            {roles.map((role) => (
              <Card key={role.title} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className={`h-1.5 ${role.gradient}`} />
                <CardContent className="p-6">
                  <role.icon className={`h-8 w-8 mb-3 ${role.color}`} />
                  <h3 className="font-semibold text-lg mb-2">{role.title}</h3>
                  <ul className="space-y-2">
                    {role.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className={`bg-muted/30 ${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">Pricing</p>
          <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl"}`}>
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            No hidden fees, no contracts. Cancel anytime.
          </p>
          <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-2"} max-w-3xl mx-auto`}>
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow border-2 border-primary/20">
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
              <CardContent className="p-8">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Agent Plan</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">For real estate agents</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold">$49</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <Button className="w-full mb-6 gap-2" size="lg" onClick={() => setLocation("/auth")}>
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
                <ul className="space-y-3 text-left">
                  {["Unlimited transactions", "Client CRM", "Document tracking", "SMS & email integration", "Interactive map", "Lead generation", "Drip campaigns", "Customizable dashboard"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Vendor Plan</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">For home service vendors</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <Button className="w-full mb-6 gap-2" size="lg" variant="outline" onClick={() => setLocation("/auth")}>
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
                <ul className="space-y-3 text-left">
                  {["Vendor portal", "Bid management", "Contractor verification", "Marketplace listing", "Lead notifications", "Zip code leads", "Ratings & reviews", "Encrypted messaging"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className={`${isMobile ? "py-16 px-4" : "py-24 px-6"} bg-foreground text-background`}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl"}`}>
            Less paperwork. More handshakes.
          </h2>
          <p className="text-background/70 mb-8 text-lg max-w-xl mx-auto">
            HomeBase is the CRM built to track, manage, and grow your real estate business. Start closing more deals today.
          </p>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 text-base px-8 bg-background text-foreground hover:bg-background/90 border-0"
            onClick={() => setLocation("/auth")}
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className={`border-t ${isMobile ? "py-8 px-4" : "py-12 px-6"}`}>
        <div className={`max-w-6xl mx-auto flex ${isMobile ? "flex-col gap-6" : "items-center justify-between"}`}>
          <div className="flex items-center gap-2">
            <img src="/homebaselogoicon_nobg.png" alt="HomeBase" className="h-6 w-6 dark:invert" />
            <span className="font-bold text-lg">HomeBase</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/find-agent" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Find an Agent</Link>
            <Link href="/top-agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Top Agents</Link>
          </div>
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} HomeBase. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Target,
    title: "Lead Intelligence",
    description: "Capture, score, and nurture leads with automated drip campaigns and zip code targeting."
  },
  {
    icon: FileText,
    title: "Transaction Tracking",
    description: "Kanban board workflow with TREC contract parsing, document tracking, and AI-powered timelines."
  },
  {
    icon: Zap,
    title: "Smart Automations",
    description: "Automate follow-ups with drip campaigns, scheduled communications, and intelligent reminders."
  },
  {
    icon: MessageSquare,
    title: "Unified Communications",
    description: "SMS, email, and encrypted messaging all in one place with full metrics and tracking."
  },
  {
    icon: Map,
    title: "Interactive Property Map",
    description: "View showings, client locations, and listings on an interactive map with route planning."
  },
  {
    icon: Shield,
    title: "Client Portal",
    description: "Give clients real-time visibility into their transaction progress, documents, and timeline."
  },
];

const steps = [
  {
    title: "Create Your Account",
    description: "Sign up in seconds as an agent, vendor, or lender. No credit card required to get started."
  },
  {
    title: "Import Your Deals",
    description: "Add your transactions and clients. Upload contracts and let our parser extract the key details automatically."
  },
  {
    title: "Close More Deals",
    description: "Stay organized with your dashboard, communicate with clients, and never miss a deadline again."
  },
];

const roles = [
  {
    icon: Briefcase,
    title: "Agents",
    color: "text-blue-600",
    gradient: "bg-gradient-to-r from-blue-500 to-blue-600",
    perks: ["Transaction management", "Client CRM", "Lead generation", "Map & route planning"]
  },
  {
    icon: Building2,
    title: "Vendors",
    color: "text-green-600",
    gradient: "bg-gradient-to-r from-green-500 to-green-600",
    perks: ["Bid management", "Marketplace listing", "Zip code leads", "Contractor badges"]
  },
  {
    icon: Star,
    title: "Lenders",
    color: "text-purple-600",
    gradient: "bg-gradient-to-r from-purple-500 to-purple-600",
    perks: ["Loan pipeline Kanban", "Checklist sync", "Transaction linking", "RESPA compliant"]
  },
  {
    icon: Home,
    title: "Clients",
    color: "text-amber-600",
    gradient: "bg-gradient-to-r from-amber-500 to-amber-600",
    perks: ["Transaction visibility", "Document access", "MyHome hub", "Team directory"]
  },
];
