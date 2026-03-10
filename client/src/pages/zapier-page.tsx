import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ArrowRight, Zap, CheckCircle2, ChevronRight, Clock, Repeat,
  UserPlus, FileText, Bell, Upload, RefreshCw, Users, Home,
  Mail, Calendar, MessageSquare, BarChart3, Plug
} from "lucide-react";
import {
  SiMailchimp, SiSlack, SiGooglesheets, SiCalendly, SiTrello,
  SiHubspot, SiSalesforce, SiAirtable
} from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";

export default function ZapierPage() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className={`max-w-6xl mx-auto flex items-center justify-between ${isMobile ? "px-4 py-3" : "px-6 py-4"}`}>
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/homebaselogoicon_nobg.png" alt="HomeBase" className="h-7 w-7 dark:invert" />
            <span className="font-bold text-lg tracking-tight">HomeBase</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button size="sm" className="px-3 text-xs" onClick={() => setLocation("/api-keys")}>
                API Keys Settings
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="px-2 text-xs" onClick={() => setLocation("/auth")}>Log in</Button>
                <Button size="sm" className="px-3 text-xs whitespace-nowrap" onClick={() => setLocation("/auth")}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className={`relative ${isMobile ? "pt-24 pb-16 px-4" : "pt-36 pb-24 px-6"}`} style={isMobile ? { paddingTop: "calc(6rem + env(safe-area-inset-top, 0px))" } : undefined}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-16 w-16 rounded-2xl bg-background border-2 shadow-lg flex items-center justify-center">
              <img src="/homebaselogoicon_nobg.png" alt="HomeBase" className="h-10 w-10 dark:invert" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-0.5 w-6 bg-muted-foreground/30 rounded" />
              <Zap className="h-6 w-6 text-[#FF4A00]" />
              <div className="h-0.5 w-6 bg-muted-foreground/30 rounded" />
            </div>
            <div className="h-16 w-16 rounded-2xl bg-[#FF4A00] shadow-lg flex items-center justify-center">
              <Zap className="h-10 w-10 text-white" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4A00]/10 text-[#FF4A00] text-xs font-medium mb-6">
            <Plug className="h-3 w-3" /> Zapier Integration
          </div>
          <h1 className={`font-bold tracking-tight leading-tight mb-6 ${isMobile ? "text-3xl" : "text-5xl lg:text-6xl"}`}>
            Connect Home-Base to{" "}
            <span className="text-[#FF4A00]">5,000+</span> apps
          </h1>
          <p className={`text-muted-foreground leading-relaxed mb-8 ${isMobile ? "text-base" : "text-lg"} max-w-2xl mx-auto`}>
            Automate your real estate workflows by connecting HomeBase with Zapier. Trigger actions across your favorite tools — no coding required.
          </p>
          <div className={`flex gap-3 justify-center ${isMobile ? "flex-col" : ""}`}>
            <Button size="lg" className="gap-2 text-base px-8 bg-[#FF4A00] hover:bg-[#E04400]" onClick={() => setLocation(user ? "/api-keys" : "/auth")}>
              {user ? "Set Up Integration" : "Get Started Free"} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
              <a href="#how-it-works">See How It Works <ChevronRight className="h-4 w-4" /></a>
            </Button>
          </div>
        </div>
      </section>

      <section className={`bg-muted/50 border-y ${isMobile ? "py-12 px-4" : "py-16 px-6"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">Popular Automations</p>
            <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-2xl" : "text-3xl"}`}>
              Pre-built Zaps to get you started
            </h2>
          </div>
          <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
            {popularZaps.map((zap) => (
              <Card key={zap.title} className="group hover:shadow-lg transition-all duration-300 border hover:border-[#FF4A00]/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${zap.bgColor}`}>
                      <zap.icon className={`h-5 w-5 ${zap.iconColor}`} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">{zap.app}</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5">{zap.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{zap.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className={`${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-6xl mx-auto">
          <div className={`grid gap-12 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <div>
              <p className="text-sm text-[#FF4A00] font-medium uppercase tracking-wider mb-2">Triggers</p>
              <h2 className={`font-bold tracking-tight mb-6 ${isMobile ? "text-2xl" : "text-3xl"}`}>
                Events that start your Zaps
              </h2>
              <div className="space-y-3">
                {triggers.map((trigger) => (
                  <div key={trigger.name} className="flex items-start gap-3 p-4 rounded-xl border hover:border-[#FF4A00]/30 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-[#FF4A00]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <trigger.icon className="h-4 w-4 text-[#FF4A00]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{trigger.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{trigger.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">Actions</p>
              <h2 className={`font-bold tracking-tight mb-6 ${isMobile ? "text-2xl" : "text-3xl"}`}>
                Things HomeBase can do
              </h2>
              <div className="space-y-3">
                {actions.map((action) => (
                  <div key={action.name} className="flex items-start gap-3 p-4 rounded-xl border hover:border-primary/30 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <action.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{action.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={`bg-muted/30 ${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm text-[#FF4A00] font-medium uppercase tracking-wider mb-2">How It Works</p>
            <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-2xl" : "text-3xl"}`}>
              Set up in 3 simple steps
            </h2>
          </div>
          <div className={`grid gap-8 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            {howItWorks.map((step, i) => (
              <div key={step.title} className="text-center relative">
                {!isMobile && i < 2 && (
                  <div className="absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#FF4A00]/30 to-transparent" />
                )}
                <div className="h-16 w-16 rounded-full bg-[#FF4A00]/10 flex items-center justify-center mx-auto mb-4 relative z-10">
                  <span className="text-2xl font-bold text-[#FF4A00]">{i + 1}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${isMobile ? "py-16 px-4" : "py-24 px-6"}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm text-primary font-medium uppercase tracking-wider mb-2">Benefits</p>
            <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-2xl" : "text-3xl"}`}>
              Why automate with HomeBase + Zapier?
            </h2>
          </div>
          <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className={`${isMobile ? "py-16 px-4" : "py-24 px-6"} bg-foreground text-background`}>
        <div className="max-w-3xl mx-auto text-center">
          <Zap className="h-12 w-12 text-[#FF4A00] mx-auto mb-6" />
          <h2 className={`font-bold tracking-tight mb-4 ${isMobile ? "text-3xl" : "text-4xl"}`}>
            Ready to automate your business?
          </h2>
          <p className="text-background/70 mb-8 text-lg max-w-xl mx-auto">
            Connect HomeBase to thousands of apps and start saving hours every week. Set up your first Zap in minutes.
          </p>
          <div className={`flex gap-3 justify-center ${isMobile ? "flex-col" : ""}`}>
            <Button
              size="lg"
              className="gap-2 text-base px-8 bg-[#FF4A00] hover:bg-[#E04400] text-white border-0"
              onClick={() => setLocation(user ? "/api-keys" : "/auth")}
            >
              {user ? "Go to API Keys" : "Sign Up & Connect"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
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
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          </div>
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} HomeBase. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const popularZaps = [
  {
    icon: SiMailchimp,
    app: "Mailchimp",
    bgColor: "bg-[#FFE01B]/20",
    iconColor: "text-[#FFE01B]",
    title: "New Lead → Mailchimp",
    description: "Add new HomeBase leads to a Mailchimp audience automatically."
  },
  {
    icon: SiSlack,
    app: "Slack",
    bgColor: "bg-[#4A154B]/10",
    iconColor: "text-[#4A154B]",
    title: "Transaction Update → Slack",
    description: "Get a Slack notification when a transaction status changes."
  },
  {
    icon: SiGooglesheets,
    app: "Google Sheets",
    bgColor: "bg-[#0F9D58]/10",
    iconColor: "text-[#0F9D58]",
    title: "New Client → Sheet Row",
    description: "Log every new client to a Google Sheets spreadsheet."
  },
  {
    icon: SiCalendly,
    app: "Calendly",
    bgColor: "bg-[#006BFF]/10",
    iconColor: "text-[#006BFF]",
    title: "Calendly Event → Lead",
    description: "Create a HomeBase lead from every new Calendly booking."
  },
  {
    icon: SiTrello,
    app: "Trello",
    bgColor: "bg-[#0079BF]/10",
    iconColor: "text-[#0079BF]",
    title: "Transaction → Trello Card",
    description: "Create a Trello card for each new HomeBase transaction."
  },
  {
    icon: SiHubspot,
    app: "HubSpot",
    bgColor: "bg-[#FF7A59]/10",
    iconColor: "text-[#FF7A59]",
    title: "Sync Clients → HubSpot",
    description: "Keep your HubSpot contacts in sync with HomeBase clients."
  },
  {
    icon: SiSalesforce,
    app: "Salesforce",
    bgColor: "bg-[#00A1E0]/10",
    iconColor: "text-[#00A1E0]",
    title: "Lead → Salesforce",
    description: "Push HomeBase leads into your Salesforce pipeline."
  },
  {
    icon: SiAirtable,
    app: "Airtable",
    bgColor: "bg-[#18BFFF]/10",
    iconColor: "text-[#18BFFF]",
    title: "Document → Airtable",
    description: "Log uploaded documents to an Airtable base for tracking."
  },
];

const triggers = [
  {
    icon: UserPlus,
    name: "New Lead",
    description: "Triggers when a new lead is captured in HomeBase from any source."
  },
  {
    icon: FileText,
    name: "Transaction Created",
    description: "Triggers when a new transaction is added to your pipeline."
  },
  {
    icon: CheckCircle2,
    name: "Transaction Closed",
    description: "Triggers when a transaction is marked as closed/completed."
  },
  {
    icon: Users,
    name: "Client Added",
    description: "Triggers when a new client is added to your CRM."
  },
  {
    icon: Upload,
    name: "Document Uploaded",
    description: "Triggers when a document is uploaded to a transaction."
  },
];

const actions = [
  {
    icon: UserPlus,
    name: "Create Lead",
    description: "Create a new lead in HomeBase from any external app."
  },
  {
    icon: Users,
    name: "Create Client",
    description: "Add a new client to your HomeBase CRM."
  },
  {
    icon: FileText,
    name: "Create Transaction",
    description: "Start a new transaction in your HomeBase pipeline."
  },
  {
    icon: RefreshCw,
    name: "Update Client",
    description: "Update an existing client's details in HomeBase."
  },
];

const howItWorks = [
  {
    title: "Connect Your Account",
    description: "Generate an API key in HomeBase and paste it into Zapier to connect your accounts securely."
  },
  {
    title: "Choose a Trigger",
    description: "Pick what event in HomeBase should kick off the automation — new lead, transaction closed, and more."
  },
  {
    title: "Set Your Action",
    description: "Choose what happens in your connected app. Send emails, update spreadsheets, post to Slack — anything."
  },
];

const benefits = [
  {
    icon: Clock,
    title: "Save Hours Weekly",
    description: "Eliminate repetitive data entry by automatically syncing data between HomeBase and your other tools."
  },
  {
    icon: Repeat,
    title: "Never Miss a Follow-Up",
    description: "Automatically trigger emails, SMS, or tasks when leads come in or transactions update."
  },
  {
    icon: BarChart3,
    title: "Better Data Everywhere",
    description: "Keep all your tools in sync with real-time data from HomeBase — no more copy-pasting between apps."
  },
];