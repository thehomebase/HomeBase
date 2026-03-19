import { useState, useEffect, useRef } from "react";
import { Link, useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronDown, Send, Mail, Phone, MessageSquare, CheckCircle2,
  Loader2, Zap, Shield, Users, FileText, Calculator, Home,
  BarChart3, Globe, Star, ArrowRight
} from "lucide-react";

const FAQ_CATEGORIES = ["General", "Pricing", "Features", "Getting Started"] as const;

const FAQS: Record<string, Array<{ q: string; a: string }>> = {
  General: [
    {
      q: "What is HomeBase?",
      a: "HomeBase is an all-in-one real estate transaction management platform built for agents, brokers, lenders, and their clients. Unlike generic CRMs, HomeBase is purpose-built for real estate — from contract parsing to closing coordination, everything is designed around how real estate transactions actually work."
    },
    {
      q: "Who is HomeBase for?",
      a: "HomeBase serves real estate agents, managing brokers, lenders, vendors/contractors, and their clients. Each user type gets a tailored experience — agents manage transactions and clients, brokers oversee their teams, lenders track loan pipelines, vendors receive bid requests, and clients get a transparent view of their transaction progress."
    },
    {
      q: "How is HomeBase different from other real estate CRMs?",
      a: "Most real estate CRMs are glorified contact lists. HomeBase is a complete transaction ecosystem — it combines document management with AI parsing, built-in e-signatures, an inspection repair bid system, a vendor marketplace, client portal, drip campaigns, listing alerts, financial calculators, and post-close homeowner engagement all in one platform. No more juggling 5+ separate tools."
    },
    {
      q: "Is HomeBase available as a mobile app?",
      a: "HomeBase is built as a Progressive Web App (PWA), which means it works like a native app on your phone — you can install it to your home screen, receive push notifications, and use it offline. No app store download needed, and it's always up to date."
    },
    {
      q: "Is my data secure?",
      a: "Absolutely. HomeBase uses bank-level encryption for all data, including AES-256-GCM encrypted private messaging. We implement IP-based rate limiting, email verification, optional two-factor authentication (TOTP), CSRF protection, and session-based authentication. Your clients' sensitive information is protected at every level."
    },
  ],
  Pricing: [
    {
      q: "How much does HomeBase cost?",
      a: "HomeBase offers flexible subscription plans to fit solo agents, teams, and brokerages. Contact us for current pricing — we believe in transparent, fair pricing with no hidden fees or long-term contracts."
    },
    {
      q: "Is there a free trial?",
      a: "Yes! You can sign up and explore HomeBase's core features before committing to a paid plan. We want you to see the value before you invest."
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept all major credit cards through our secure Stripe integration. Your payment information is never stored on our servers."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. There are no long-term contracts — you can cancel your subscription at any time. Your data remains accessible for 30 days after cancellation."
    },
  ],
  Features: [
    {
      q: "What is AI document parsing?",
      a: "HomeBase uses Google's Gemini AI to automatically extract key data from real estate contracts and documents. Upload a PDF, and the system pulls out addresses, dates, prices, parties, and other critical details — saving you hours of manual data entry. It works with TREC contracts and most standard real estate forms."
    },
    {
      q: "How does the inspection bid system work?",
      a: "When an inspection report identifies repairs, agents can create bid requests and send them to multiple contractors simultaneously through HomeBase Pros. Contractors submit competitive bids, and agents can compare them side-by-side — all within the platform. No more phone tag with contractors."
    },
    {
      q: "What is HomeBase Pros?",
      a: "HomeBase Pros is our built-in vendor marketplace where verified home service professionals — inspectors, plumbers, electricians, roofers, and more — can be discovered, reviewed, and hired. Agents build trusted teams, homeowners find reliable pros, and vendors gain exposure to real estate professionals."
    },
    {
      q: "Does HomeBase support e-signatures?",
      a: "Yes. HomeBase offers built-in e-signatures through Firma, plus integrations with DocuSign and SignNow. Our Forms Library lets you upload PDF templates, place signature fields visually, and send for signing — all without leaving the platform."
    },
    {
      q: "What are listing alerts?",
      a: "Agents and clients can set up saved search alerts based on location, price range, and property criteria. HomeBase automatically checks for new listings and price changes daily, sending notifications via SMS, email, or in-app — keeping everyone informed without manual searches."
    },
    {
      q: "What is the Client Portal?",
      a: "The Client Portal gives buyers and sellers a mobile-first view of their transaction — they can see where they are in the process, what documents need attention, key dates, their team members, and financial details. It keeps clients informed and reduces \"what's happening with my deal?\" calls."
    },
  ],
  "Getting Started": [
    {
      q: "How do I create an account?",
      a: "Click the \"Get Started\" button, enter your information, and verify your email. The whole process takes less than 2 minutes. Once you're in, our interactive onboarding tutorial walks you through the key features."
    },
    {
      q: "Can I import my existing data?",
      a: "Yes. HomeBase supports importing clients, transactions, and contacts from spreadsheets (CSV/Excel). You can also upload existing documents and contracts directly into transaction folders."
    },
    {
      q: "How do I get my team set up?",
      a: "Brokers can invite agents through the Broker Portal. Agents can add authorized users (other agents or assistants) with configurable permission levels. Clients receive email invitations to join specific transactions."
    },
    {
      q: "Is there training available?",
      a: "HomeBase includes an interactive onboarding tutorial that guides new users through every feature. Our support team is also available to help with setup and answer any questions."
    },
  ],
};

const COMPARISON_FEATURES = [
  { feature: "AI Document Parsing", homebase: true, others: false, icon: Zap },
  { feature: "Built-in E-Signatures", homebase: true, others: false, icon: FileText },
  { feature: "Inspection Bid System", homebase: true, others: false, icon: BarChart3 },
  { feature: "Vendor Marketplace", homebase: true, others: false, icon: Globe },
  { feature: "Client Portal", homebase: true, others: false, icon: Users },
  { feature: "Financial Calculators", homebase: true, others: false, icon: Calculator },
  { feature: "Post-Close Engagement", homebase: true, others: false, icon: Home },
  { feature: "Listing Alerts", homebase: true, others: false, icon: Star },
  { feature: "Contact Management", homebase: true, others: true, icon: Users },
  { feature: "Transaction Tracking", homebase: true, others: true, icon: FileText },
  { feature: "Communication Tools", homebase: true, others: true, icon: MessageSquare },
  { feature: "Security & Encryption", homebase: true, others: false, icon: Shield },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left group"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-sm pr-4">{question}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="pb-4 pr-8">
          <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqContactPage() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("General");
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", message: "", topic: "general" });
  const [sent, setSent] = useState(false);
  const [isContactRoute] = useRoute("/contact");
  const contactRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isContactRoute && contactRef.current) {
      setTimeout(() => {
        contactRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isContactRoute]);

  const contactMut = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/platform/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      toast({ title: "Message sent! We'll get back to you soon." });
    },
    onError: (e: Error) => {
      toast({ title: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="w-full">
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-primary mb-2">Help</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Find answers to the most common questions about HomeBase — the all-in-one platform built for real estate professionals.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mt-8">
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {FAQ_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          <div className="border rounded-xl px-5">
            {FAQS[activeCategory]?.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Why Agents Choose HomeBase Over Other CRMs
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Other CRMs give you a contact list. HomeBase gives you the entire transaction ecosystem.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 md:gap-x-8 items-center">
              <div className="py-3 border-b">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feature</span>
              </div>
              <div className="py-3 border-b text-center">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">HomeBase</span>
              </div>
              <div className="py-3 border-b text-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Others</span>
              </div>

              {COMPARISON_FEATURES.map((item, i) => {
                const Icon = item.icon;
                return (
                  <>
                    <div key={`f-${i}`} className="py-3 border-b flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{item.feature}</span>
                    </div>
                    <div key={`h-${i}`} className="py-3 border-b text-center">
                      {item.homebase ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div key={`o-${i}`} className="py-3 border-b text-center">
                      {item.others ? (
                        <CheckCircle2 className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </>
                );
              })}
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/auth">
              <Button size="lg" className="gap-2 rounded-full px-8">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4" id="contact" ref={contactRef}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Contact Us
            </h2>
            <p className="text-muted-foreground">
              Can't find what you're looking for? Our team is here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            <Card>
              <CardContent className="p-6 md:p-8">
                {sent ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="font-bold text-lg mb-2">Message Sent!</h3>
                    <p className="text-sm text-muted-foreground">
                      Thanks for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => { setSent(false); setFormData({ firstName: "", lastName: "", email: "", phone: "", message: "", topic: "general" }); }}>
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      contactMut.mutate(formData);
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">First Name *</Label>
                        <Input
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                          placeholder="First name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Last Name *</Label>
                        <Input
                          required
                          value={formData.lastName}
                          onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                          placeholder="Last name"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Email *</Label>
                      <Input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                        placeholder="you@company.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">What can we help with?</Label>
                      <select
                        value={formData.topic}
                        onChange={(e) => setFormData(p => ({ ...p, topic: e.target.value }))}
                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="pricing">Pricing & Plans</option>
                        <option value="support">Technical Support</option>
                        <option value="partnership">Partnership</option>
                        <option value="demo">Request a Demo</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Message *</Label>
                      <Textarea
                        required
                        value={formData.message}
                        onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                        placeholder="Leave us a message..."
                        className="mt-1"
                        rows={4}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={contactMut.isPending}>
                      {contactMut.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                      ) : (
                        "Send Message"
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Chat with Sales
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Interested in HomeBase for your brokerage? Talk to our team.
                </p>
                <a href="mailto:sales@homebase.com" className="text-sm text-primary hover:underline font-medium">
                  sales@homebase.com
                </a>
              </div>

              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Email Support
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Need help? We typically respond within 24 hours.
                </p>
                <a href="mailto:support@homebase.com" className="text-sm text-primary hover:underline font-medium">
                  support@homebase.com
                </a>
              </div>

              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Call Us
                </h3>
                <p className="text-sm text-muted-foreground">
                  Mon - Fri, 8:00 AM - 6:00 PM CT
                </p>
              </div>

              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <Link href="/auth" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowRight className="h-3 w-3" /> Create an Account
                  </Link>
                  <Link href="/privacy-policy" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowRight className="h-3 w-3" /> Privacy Policy
                  </Link>
                  <Link href="/terms" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowRight className="h-3 w-3" /> Terms & Conditions
                  </Link>
                  <Link href="/top-agents" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowRight className="h-3 w-3" /> Find an Agent
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
