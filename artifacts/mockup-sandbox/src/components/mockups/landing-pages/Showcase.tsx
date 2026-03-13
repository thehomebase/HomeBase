import React from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Target, 
  MessageSquare, 
  LayoutDashboard, 
  Store, 
  Puzzle,
  Building2,
  Users,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Smartphone,
  Star,
  Quote
} from 'lucide-react';

export default function Showcase() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-amber-200">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <img src="/__mockup/images/homebaselogoicon_nobg.png" alt="HomeBase" className="h-8 w-8" />
              <span className="text-xl font-bold tracking-tight">HomeBase</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Features</a>
              <a href="#roles" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">For Everyone</a>
              <a href="#pricing" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <button className="hidden md:block text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                Sign In
              </button>
              <button className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-sm shadow-amber-500/20">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-40 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-sm font-medium text-zinc-800 mb-6">
                <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
                The Standard in Real Estate Software
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.1] mb-6">
                The All-in-One Real Estate Platform
              </h1>
              <p className="text-xl text-zinc-600 mb-8 leading-relaxed">
                Manage transactions, generate leads, and collaborate with pros—all in one place. Everything you need to scale your real estate business, nothing you don't.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-black hover:bg-zinc-800 text-white px-8 py-4 rounded-full text-base font-semibold transition-colors flex items-center justify-center gap-2">
                  Start Your Free Trial <ArrowRight className="w-4 h-4" />
                </button>
                <button className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-900 px-8 py-4 rounded-full text-base font-semibold transition-colors flex items-center justify-center">
                  Book a Demo
                </button>
              </div>
              <p className="mt-4 text-sm text-zinc-500">No credit card required. 14-day free trial.</p>
            </div>
            
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 aspect-[4/3]">
                <img 
                  src="/__mockup/images/hero-interior.png" 
                  alt="Modern home interior" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              
              {/* Floating Metric 1 */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-zinc-100 flex items-center gap-4 animate-bounce-slow" style={{ animationDuration: '4s' }}>
                <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 font-medium">Lead Conversion</p>
                  <p className="text-xl font-bold text-zinc-900">+45%</p>
                </div>
              </div>

              {/* Floating Metric 2 */}
              <div className="absolute top-12 -right-8 bg-white p-4 rounded-xl shadow-xl border border-zinc-100 flex items-center gap-4 animate-bounce-slow" style={{ animationDuration: '5s', animationDelay: '1s' }}>
                <div className="bg-amber-100 text-amber-600 p-3 rounded-lg">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 font-medium">Active Deals</p>
                  <p className="text-xl font-bold text-zinc-900">12 Pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Bar */}
      <section className="border-y border-zinc-100 bg-zinc-50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-zinc-500 mb-6 uppercase tracking-wider">Trusted by top agents from</p>
          <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-24 opacity-60 grayscale">
            <h3 className="text-2xl font-serif font-bold text-zinc-800">RE/MAX</h3>
            <h3 className="text-2xl font-sans font-light tracking-widest text-zinc-800">COMPASS</h3>
            <h3 className="text-2xl font-serif font-bold text-zinc-800 italic">Sotheby's</h3>
            <h3 className="text-2xl font-sans font-black text-zinc-800">kw</h3>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Everything You Need, Nothing You Don't</h2>
            <p className="text-lg text-zinc-600">A complete ecosystem designed to replace your fragmented software stack with one cohesive, powerful platform.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <FileText className="w-6 h-6 text-amber-500" />,
                title: "Transaction Management",
                desc: "Kanban document tracking, TREC contract parsing, AI timelines, and integrated e-signatures."
              },
              {
                icon: <Target className="w-6 h-6 text-amber-500" />,
                title: "Smart Lead Generation",
                desc: "RESPA-compliant zip code leads, interactive maps, drip campaigns, and listing alerts."
              },
              {
                icon: <MessageSquare className="w-6 h-6 text-amber-500" />,
                title: "Unified Communication",
                desc: "SMS via Twilio, Gmail integration, encrypted messaging, and comprehensive call logging."
              },
              {
                icon: <LayoutDashboard className="w-6 h-6 text-amber-500" />,
                title: "Client Portal",
                desc: "Real-time transaction visibility for buyers and sellers, keeping everyone in the loop."
              },
              {
                icon: <Store className="w-6 h-6 text-amber-500" />,
                title: "HomeBase Pros Marketplace",
                desc: "Find vendors, manage inspection bids, and read verified reviews for home service pros."
              },
              {
                icon: <Puzzle className="w-6 h-6 text-amber-500" />,
                title: "Seamless Integrations",
                desc: "Connect with over 5,000 apps via Zapier, sync with Dropbox, and manage billing with Stripe."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl border border-zinc-100 bg-white hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">{feature.title}</h3>
                <p className="text-zinc-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spotlights */}
      <section className="py-24 bg-zinc-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
          
          {/* Spotlight 1: Multi-Role */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium mb-6">
                <Users className="w-4 h-4" /> Multi-Role Support
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-zinc-900 mb-6 leading-tight">
                Tailored experiences for every stakeholder.
              </h2>
              <p className="text-lg text-zinc-600 mb-8">
                HomeBase isn't just a CRM for agents. It provides customized dashboards and tools for brokers, vendors, lenders, and homeowners. When everyone uses the same platform, transactions close faster and communication is seamless.
              </p>
              <ul className="space-y-4">
                {[
                  "Agent Dashboard: Pipeline, leads, and tasks",
                  "Vendor Portal: Bids, jobs, and marketplace profile",
                  "Client Hub: Real-time updates and post-close engagement"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-amber-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-200 to-amber-50 rounded-2xl transform rotate-3 scale-105 opacity-50"></div>
              <img 
                src="/__mockup/images/dashboard-mockup.png" 
                alt="HomeBase Dashboard" 
                className="relative rounded-2xl shadow-xl border border-zinc-200"
              />
            </div>
          </div>

          {/* Spotlight 2: Marketplace */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-200 to-zinc-50 rounded-2xl transform -rotate-3 scale-105 opacity-50"></div>
              <img 
                src="/__mockup/images/hero-network.png" 
                alt="Professional Network" 
                className="relative rounded-2xl shadow-xl border border-zinc-200"
              />
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-200 text-zinc-800 text-sm font-medium mb-6">
                <Store className="w-4 h-4" /> The Pros Network
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-zinc-900 mb-6 leading-tight">
                A built-in marketplace for home service pros.
              </h2>
              <p className="text-lg text-zinc-600 mb-8">
                Stop emailing lists of recommended contractors. The HomeBase Pros Marketplace lets your clients find verified inspectors, plumbers, and electricians instantly. 
              </p>
              <ul className="space-y-4">
                {[
                  "License verification & trusted badges",
                  "Automated inspection bid system",
                  "Transparent ratings & reviews from verified clients"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-zinc-900" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">How It Works</h2>
            <p className="text-lg text-zinc-600">Get up and running in minutes, not months.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-zinc-100 -z-10 -translate-y-1/2"></div>
            {[
              {
                step: "01",
                title: "Claim Your Profile",
                desc: "Set up your agent or vendor profile, verify your licenses, and customize your dashboard.",
                icon: <Smartphone className="w-8 h-8 text-amber-500" />
              },
              {
                step: "02",
                title: "Invite Your Network",
                desc: "Bring your clients, preferred lenders, and favorite contractors into your HomeBase ecosystem.",
                icon: <Users className="w-8 h-8 text-amber-500" />
              },
              {
                step: "03",
                title: "Close More Deals",
                desc: "Use AI timelines, smart leads, and seamless communication to scale your pipeline.",
                icon: <TrendingUp className="w-8 h-8 text-amber-500" />
              }
            ].map((item, i) => (
              <div key={i} className="relative bg-white p-8 rounded-2xl border border-zinc-100 shadow-sm text-center">
                <div className="w-16 h-16 bg-amber-50 border-4 border-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  {item.icon}
                </div>
                <div className="absolute top-4 right-4 text-4xl font-black text-zinc-50">{item.step}</div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">{item.title}</h3>
                <p className="text-zinc-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Loved by the Entire Industry</h2>
            <p className="text-lg text-zinc-400">Hear from the agents, vendors, and lenders who use HomeBase every day.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "HomeBase replaced my CRM, transaction manager, and lead gen tools. Having my clients and vendors in one place has saved me 10+ hours a week.",
                author: "Sarah Jenkins",
                role: "Top Producing Agent",
                type: "Agent"
              },
              {
                quote: "As a home inspector, the marketplace is a game-changer. I get bid requests directly from agents' timelines. My business has grown 30% this year.",
                author: "Michael Chang",
                role: "Certified Home Inspector",
                type: "Vendor"
              },
              {
                quote: "The client portal means I don't have to answer 'what's the status?' emails anymore. The buyers see exactly where we are in the loan process.",
                author: "David Ross",
                role: "Mortgage Broker",
                type: "Lender"
              }
            ].map((t, i) => (
              <div key={i} className="bg-zinc-800/50 p-8 rounded-2xl border border-zinc-700 relative">
                <Quote className="absolute top-6 right-6 w-8 h-8 text-zinc-700" />
                <div className="flex gap-1 mb-6">
                  {[1,2,3,4,5].map(star => <Star key={star} className="w-5 h-5 fill-amber-500 text-amber-500" />)}
                </div>
                <p className="text-zinc-300 mb-8 leading-relaxed text-lg">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center font-bold text-lg text-zinc-400">
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{t.author}</h4>
                    <p className="text-sm text-zinc-400">{t.role} • <span className="text-amber-500">{t.type}</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-zinc-600">Choose the plan that fits your role. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Agent Plan */}
            <div className="bg-white p-10 rounded-3xl border-2 border-zinc-200 shadow-sm relative hover:border-black transition-colors">
              <div className="absolute top-0 right-10 transform -translate-y-1/2">
                <span className="bg-black text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide">MOST POPULAR</span>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Agent Plan</h3>
              <p className="text-zinc-500 mb-6">For real estate professionals</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black text-zinc-900">$49</span>
                <span className="text-zinc-500 font-medium">/mo</span>
              </div>
              <button className="w-full bg-black hover:bg-zinc-800 text-white py-4 rounded-xl font-bold text-lg transition-colors mb-8">
                Start 14-Day Free Trial
              </button>
              <ul className="space-y-4">
                {[
                  "Unlimited transactions",
                  "Client CRM & document tracking",
                  "Interactive map & zip code leads",
                  "Automated drip campaigns",
                  "Customizable agent dashboard",
                  "SMS & Encrypted Email"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-700">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Vendor Plan */}
            <div className="bg-white p-10 rounded-3xl border border-zinc-200 shadow-sm hover:border-black transition-colors">
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Vendor Plan</h3>
              <p className="text-zinc-500 mb-6">For home service professionals</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black text-zinc-900">$29</span>
                <span className="text-zinc-500 font-medium">/mo</span>
              </div>
              <button className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900 py-4 rounded-xl font-bold text-lg transition-colors mb-8">
                Create Vendor Profile
              </button>
              <ul className="space-y-4">
                {[
                  "Marketplace vendor listing",
                  "Inspection & bid management",
                  "Contractor verification badge",
                  "Lead notifications",
                  "Ratings & review management",
                  "Direct agent messaging"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-700">
                    <CheckCircle2 className="w-5 h-5 text-zinc-900 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-amber-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40L40 0H20L0 20M40 40V20L20 40" fill="currentColor"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)"/>
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-black text-zinc-900 mb-6">Ready to transform your real estate business?</h2>
          <p className="text-xl text-zinc-800 mb-10 font-medium">
            Join thousands of agents, brokers, and vendors already building on HomeBase.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-zinc-900 hover:bg-black text-white px-8 py-4 rounded-full text-lg font-bold transition-colors shadow-xl shadow-zinc-900/20">
              Get Started for Free
            </button>
            <button className="bg-white/20 hover:bg-white/30 text-zinc-900 border border-zinc-900/20 px-8 py-4 rounded-full text-lg font-bold transition-colors backdrop-blur-sm">
              Talk to Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src="/__mockup/images/homebaselogoicon.png" alt="HomeBase" className="h-8 w-8" />
                <span className="text-xl font-bold text-zinc-900 tracking-tight">HomeBase</span>
              </div>
              <p className="text-zinc-500 mb-6 max-w-sm">
                The all-in-one platform connecting real estate agents, vendors, and clients.
              </p>
              <div className="flex gap-4">
                {/* Social icons placeholders */}
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors cursor-pointer">
                  <span className="font-bold text-zinc-600">X</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors cursor-pointer">
                  <span className="font-bold text-zinc-600">in</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-zinc-900 mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">Features</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">Pricing</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">Marketplace</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-zinc-900 mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">About Us</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">Careers</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">Blog</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-zinc-900 mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-zinc-100 text-center md:text-left text-zinc-500 text-sm flex flex-col md:flex-row justify-between items-center">
            <p>© {new Date().getFullYear()} HomeBase Technologies, Inc. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Designed for Real Estate Professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
