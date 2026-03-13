import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ArrowRight, BarChart3, FileText, Users, MessageSquare, Map, Shield,
  Zap, Phone, Mail, Home, Star, ChevronRight, CheckCircle2, Briefcase,
  Building2, TrendingUp, Clock, Target, Award, ExternalLink, ArrowRightLeft,
  Lock, BarChart2, ChevronDown, MapPin, Gift, DollarSign, Bell, Search,
  Wrench, Hammer
} from "lucide-react";
import { SiSlack, SiMailchimp, SiGooglesheets, SiCalendly, SiTrello, SiHubspot, SiSalesforce, SiZapier, SiAirtable, SiNotion, SiTwilio, SiGmail } from "react-icons/si";
import heroImage from "@/assets/landing-hero.png";
import myTeamDesktopImage from "@/assets/image_1773430206672.png";
import zipCodeMapImage from "@/assets/image_1773428370460.png";
import referralImage from "@/assets/image_1773428743920.png";

function useCountUp(end: number, duration: number = 2000, startTrigger: boolean = false) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!startTrigger) { setCount(0); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [end, duration, startTrigger]);

  return count;
}

function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function MessagingPhoneMockup() {
  const { ref, inView } = useInView(0.3);
  const messages = useCountUp(1284, 2200, inView);
  const sms = useCountUp(847, 2000, inView);
  const emails = useCountUp(2156, 2400, inView);
  const allTime = useCountUp(4287, 2600, inView);

  const conversations = [
    { initials: "SJ", name: "Sarah Johnson", role: "client", time: "2:14 PM", msg: "Thank you! The inspection report looks great.", unread: true, color: "bg-blue-500" },
    { initials: "MR", name: "Mike Rivera", role: "vendor", time: "1:48 PM", msg: "Roof repair estimate attached — $3,200.", unread: true, color: "bg-green-600" },
    { initials: "KO", name: "Katie O'Brien", role: "vendor", time: "12:30 PM", msg: "Hi Kate! I am just following up on the repairs.", unread: false, color: "bg-neutral-800" },
    { initials: "TW", name: "Tom Williams", role: "lender", time: "11:15 AM", msg: "Pre-approval letter is ready for your buyer.", unread: false, color: "bg-purple-600" },
    { initials: "LP", name: "Lisa Park", role: "client", time: "Yesterday", msg: "Can we schedule the final walkthrough?", unread: false, color: "bg-rose-500" },
  ];

  return (
    <div ref={ref} className="relative mx-auto" style={{ maxWidth: 340 }}>
      <div className="rounded-[2.5rem] border-[6px] border-neutral-800 dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden">
        <div className="bg-neutral-800 dark:bg-neutral-700 h-6 flex items-center justify-center">
          <div className="w-20 h-4 bg-neutral-900 dark:bg-neutral-800 rounded-b-xl" />
        </div>

        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
            <span className="font-semibold text-base text-neutral-900 dark:text-white">Messages</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" /> Encrypted
            </span>
            <div className="h-6 w-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <BarChart2 className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
            </div>
          </div>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center gap-1 text-[10px] text-neutral-500 mb-1.5">
            <span>All Contacts (Total)</span>
            <ChevronDown className="h-2.5 w-2.5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <MessageSquare className="h-3 w-3 text-neutral-500" />
              <span className="text-[10px] text-neutral-500">Messages</span>
            </div>
            <p className="text-xl font-bold text-neutral-900 dark:text-white tabular-nums">{messages.toLocaleString()}</p>
            <p className="text-[9px] text-neutral-400">Today: 12 &middot; Week: 84</p>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Phone className="h-3 w-3 text-neutral-500" />
              <span className="text-[10px] text-neutral-500">SMS Sent</span>
            </div>
            <p className="text-xl font-bold text-neutral-900 dark:text-white tabular-nums">{sms.toLocaleString()}</p>
            <p className="text-[9px] text-neutral-400">Today: 5 &middot; Week: 38</p>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Mail className="h-3 w-3 text-neutral-500" />
              <span className="text-[10px] text-neutral-500">Emails</span>
            </div>
            <p className="text-xl font-bold text-neutral-900 dark:text-white tabular-nums">{emails.toLocaleString()}</p>
            <p className="text-[9px] text-neutral-400">Today: 8 &middot; Week: 52</p>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingUp className="h-3 w-3 text-neutral-500" />
              <span className="text-[10px] text-neutral-500">All-Time</span>
            </div>
            <p className="text-xl font-bold text-neutral-900 dark:text-white tabular-nums">{allTime.toLocaleString()}</p>
            <p className="text-[9px] text-neutral-400">Msgs: {messages.toLocaleString()} &middot; SMS: {sms.toLocaleString()}</p>
          </div>
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-700">
          {conversations.map((c, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 ${c.unread ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}>
              <div className={`h-9 w-9 rounded-full ${c.color} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                {c.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white">{c.name}</span>
                    <span className={`text-[8px] px-1 py-0.5 rounded font-medium ${
                      c.role === "client" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                      c.role === "vendor" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                    }`}>{c.role}</span>
                  </div>
                  <span className="text-[9px] text-neutral-400">{c.time}</span>
                </div>
                <p className="text-[10px] text-neutral-500 truncate">{c.msg}</p>
              </div>
              {c.unread && <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
            </div>
          ))}
        </div>

        <div className="h-5 bg-white dark:bg-neutral-900 flex items-center justify-center">
          <div className="w-24 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}

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
                <a href="#integrations" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Integrations</a>
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              </nav>
            )}
            <Button variant="ghost" size="sm" className="px-2 text-xs" onClick={() => setLocation("/auth")}>Log in</Button>
            <Button size="sm" className="px-3 text-xs whitespace-nowrap" onClick={() => setLocation("/auth")}>Get Started</Button>
          </div>
        </div>
      </nav>

      <section className={`relative ${isMobile ? "pt-20 pb-12 px-4" : "pt-32 pb-20 px-6"}`} style={isMobile ? { paddingTop: "calc(5rem + env(safe-area-inset-top, 0px))" } : undefined}>
        <div className="max-w-6xl mx-auto">
          <div className={`grid gap-8 items-center ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className={isMobile ? "text-center" : ""}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
                <Zap className="h-3 w-3" /> Built for real estate professionals
              </div>
              <h1 className={`font-bold tracking-tight leading-tight mb-6 ${isMobile ? "text-4xl" : "text-5xl lg:text-6xl"}`}>
                The All-in-One Real Estate Platform
              </h1>
              <p className={`text-muted-foreground leading-relaxed mb-8 ${isMobile ? "text-base" : "text-lg"} max-w-lg ${isMobile ? "mx-auto" : ""}`}>
                Manage leads, track closings, automate your follow-ups and collaborate with pros—all in one place. Everything you need to scale your real estate business, nothing you don't.
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
              Not just another CRM.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              HomeBase is an entire ecosystem designed to bring everyone involved in a transaction onto a single, beautifully designed platform.
            </p>
          </div>
          <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-5"}`}>
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

      <section className={`bg-muted/30 ${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-6xl mx-auto">
          <div className={`grid gap-12 items-center ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className={isMobile ? "order-2" : ""}>
              <MessagingPhoneMockup />
            </div>
            <div className={isMobile ? "order-1 text-center" : ""}>
              <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">Unified Communications</p>
              <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl"}`}>
                Every conversation, one place
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                SMS, email, and encrypted in-app messaging — all tracked with real-time metrics. Know exactly how you're connecting with clients, vendors, and lenders.
              </p>
              <ul className="space-y-3 mb-8">
                <li className={`flex items-center gap-3 text-sm ${isMobile ? "justify-center" : ""}`}>
                  <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4 text-green-600" />
                  </div>
                  <span>End-to-end encrypted messaging</span>
                </li>
                <li className={`flex items-center gap-3 text-sm ${isMobile ? "justify-center" : ""}`}>
                  <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                    <SiTwilio className="h-4 w-4 text-[#F22F46]" />
                  </div>
                  <span>SMS powered by Twilio</span>
                </li>
                <li className={`flex items-center gap-3 text-sm ${isMobile ? "justify-center" : ""}`}>
                  <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                    <SiGmail className="h-4 w-4 text-[#EA4335]" />
                  </div>
                  <span>Gmail & email sync</span>
                </li>
                <li className={`flex items-center gap-3 text-sm ${isMobile ? "justify-center" : ""}`}>
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <BarChart2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <span>Communication metrics dashboard</span>
                </li>
                <li className={`flex items-center gap-3 text-sm ${isMobile ? "justify-center" : ""}`}>
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <span>Role-tagged conversations</span>
                </li>
              </ul>
              <Button size="lg" className="gap-2" onClick={() => setLocation("/auth")}>
                Try It Free <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className={`${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">HomeBase Pros</p>
            <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl"}`}>
              Your trusted team, always at your fingertips
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Build and manage your go-to team of inspectors, lenders, contractors, and more. Every pro is verified, rated, and just a tap away.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border mb-10">
            <img
              src={myTeamDesktopImage}
              alt="HomeBase Pros — your trusted team of verified vendors and service providers"
              className="w-full h-auto"
            />
          </div>
          <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <h4 className="font-semibold mb-1">Verified Professionals</h4>
                <p className="text-sm text-muted-foreground">Every vendor is verified with ratings, reviews, and specialties so you always know who you're working with.</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                  <Search className="h-5 w-5 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-1">Filter by Category</h4>
                <p className="text-sm text-muted-foreground">Find the right pro instantly — filter by specialty, location, and availability across 10+ categories.</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                <h4 className="font-semibold mb-1">Direct Communication</h4>
                <p className="text-sm text-muted-foreground">Call, message, or email your pros directly from their card. Coordinate repairs and bids seamlessly.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className={`bg-muted/30 ${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-6xl mx-auto">
          <div className={`grid gap-12 items-center ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <div>
              <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">Lead Generation</p>
              <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl"}`}>
                Claim your territory, own your leads
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Select zip codes on an interactive map and get exclusive leads delivered to you. The more you invest, the higher your share of voice — and if there are no leads, you don't pay.
              </p>
              <ul className="space-y-3 mb-8">
                <li className={`flex items-center gap-3 text-sm`}>
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <span>Interactive zip code territory map</span>
                </li>
                <li className={`flex items-center gap-3 text-sm`}>
                  <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Share of Voice — spend more, get more leads</span>
                </li>
                <li className={`flex items-center gap-3 text-sm`}>
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span>No Leads, No Charge guarantee</span>
                </li>
                <li className={`flex items-center gap-3 text-sm`}>
                  <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Bell className="h-4 w-4 text-amber-600" />
                  </div>
                  <span>Push + SMS alerts for new leads</span>
                </li>
                <li className={`flex items-center gap-3 text-sm`}>
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4 text-purple-600" />
                  </div>
                  <span>RESPA-compliant for agents & lenders</span>
                </li>
              </ul>
              <Button size="lg" className="gap-2" onClick={() => setLocation("/auth")}>
                Start Generating Leads <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border">
              <img
                src={zipCodeMapImage}
                alt="Interactive zip code map for lead generation territory claiming"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={`${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-6xl mx-auto">
          <div className={`grid gap-12 items-center ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className={`relative ${isMobile ? "order-2" : ""}`}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-card mx-auto" style={{ maxWidth: 380 }}>
                <img
                  src={referralImage}
                  alt="Referral program with credits tracking — 4 applied, 3 pending"
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-card border rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Gift className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold">4 Free Months Earned</p>
                  <p className="text-[10px] text-muted-foreground">$196 saved so far</p>
                </div>
              </div>
            </div>
            <div className={isMobile ? "order-1" : ""}>
              <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">Referral Program</p>
              <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl"}`}>
                Share the love, earn free months
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Invite agents and vendors to HomeBase. When they sign up and add a payment method, you both get a free month. Track your referrals, see pending and applied credits, and share your unique code with one tap.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <Gift className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Both you and your referral get a free month</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <span>Refer agents, vendors, or lenders</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <BarChart2 className="h-4 w-4 text-amber-600" />
                  </div>
                  <span>Track applied & pending credits in real time</span>
                </li>
              </ul>
              <Button size="lg" variant="outline" className="gap-2" onClick={() => setLocation("/auth")}>
                Start Referring <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="integrations" className={`relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background ${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold mb-4 uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5" /> Powered by Zapier
            </div>
            <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl lg:text-5xl"}`}>
              Connect to <span className="text-primary">5,000+ apps</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Automate your entire workflow. When something happens in HomeBase, trigger actions across your favorite tools — no code required.
            </p>
          </div>

          <div className={`flex items-center justify-center gap-3 mb-12 ${isMobile ? "flex-wrap" : ""}`}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border shadow-sm">
              <img src="/homebaselogoicon_nobg.png" alt="HomeBase" className="h-5 w-5 dark:invert" />
              <span className="font-semibold text-sm">HomeBase</span>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 shadow-sm">
              <SiZapier className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-sm text-orange-600 dark:text-orange-400">Zapier</span>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="px-4 py-2 rounded-full bg-card border shadow-sm">
              <span className="font-semibold text-sm text-muted-foreground">5,000+ Apps</span>
            </div>
          </div>

          <div className="grid gap-3 mb-12 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {zapierApps.map((app) => (
              <div key={app.name} className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-card border hover:border-primary/30 hover:shadow-md transition-all duration-300 cursor-default">
                <div className={`h-9 w-9 rounded-lg ${app.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <app.icon className={`h-[18px] w-[18px] ${app.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{app.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.action}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`grid gap-6 mb-10 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            <Card className="bg-card/80 backdrop-blur border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold mb-1">Triggers</h4>
                <p className="text-sm text-muted-foreground">New Lead, Transaction Created, Client Added, Deal Closed, Document Uploaded</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <ArrowRightLeft className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-1">Actions</h4>
                <p className="text-sm text-muted-foreground">Create Lead, Create Client, Create Transaction, Update Client, Search Records</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur border hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold mb-1">Secure API</h4>
                <p className="text-sm text-muted-foreground">API key authentication, HMAC-signed webhooks, HTTPS-only, role-based access</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button size="lg" className="gap-2 text-base px-8" onClick={() => setLocation("/integrations/zapier")}>
              Explore Integrations <ExternalLink className="h-4 w-4" />
            </Button>
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
            <Link href="/find-lender" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Find a Lender</Link>
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

const zapierApps = [
  { icon: SiSlack, name: "Slack", action: "Post new leads", bg: "bg-purple-100 dark:bg-purple-900/30", color: "text-purple-600" },
  { icon: SiMailchimp, name: "Mailchimp", action: "Sync contacts", bg: "bg-yellow-100 dark:bg-yellow-900/30", color: "text-yellow-600" },
  { icon: SiGooglesheets, name: "Google Sheets", action: "Log transactions", bg: "bg-green-100 dark:bg-green-900/30", color: "text-green-600" },
  { icon: SiCalendly, name: "Calendly", action: "Schedule showings", bg: "bg-blue-100 dark:bg-blue-900/30", color: "text-blue-600" },
  { icon: SiTrello, name: "Trello", action: "Create task cards", bg: "bg-sky-100 dark:bg-sky-900/30", color: "text-sky-600" },
  { icon: SiHubspot, name: "HubSpot", action: "Sync CRM data", bg: "bg-orange-100 dark:bg-orange-900/30", color: "text-orange-600" },
  { icon: SiSalesforce, name: "Salesforce", action: "Push deals", bg: "bg-blue-100 dark:bg-blue-900/30", color: "text-blue-500" },
  { icon: SiAirtable, name: "Airtable", action: "Track pipeline", bg: "bg-teal-100 dark:bg-teal-900/30", color: "text-teal-600" },
  { icon: SiNotion, name: "Notion", action: "Create docs", bg: "bg-gray-100 dark:bg-gray-800", color: "text-gray-800 dark:text-gray-200" },
  { icon: Mail, name: "Gmail", action: "Send follow-ups", bg: "bg-red-100 dark:bg-red-900/30", color: "text-red-500" },
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
    title: "Brokers",
    color: "text-indigo-600",
    gradient: "bg-gradient-to-r from-indigo-500 to-indigo-600",
    perks: ["Agent oversight", "Sales competitions", "Lead routing", "Team performance"]
  },
  {
    icon: Award,
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
