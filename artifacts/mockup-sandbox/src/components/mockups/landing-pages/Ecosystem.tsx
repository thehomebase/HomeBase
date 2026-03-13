import React from "react";
import { 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Home, 
  Briefcase, 
  Building, 
  Wrench, 
  ShieldCheck, 
  Zap, 
  Smartphone, 
  LineChart, 
  FileText, 
  MessageSquare,
  Globe
} from "lucide-react";

export default function EcosystemLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <img 
                src="/__mockup/images/homebaselogoicon_nobg.png" 
                alt="HomeBase Logo" 
                className="h-10 w-10 object-contain"
              />
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
                HomeBase
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#roles" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">The Ecosystem</a>
              <a href="#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Platform</a>
              <a href="#pricing" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <button className="hidden md:block text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Log in
              </button>
              <button className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white text-sm font-semibold hover:from-blue-500 hover:to-teal-400 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 mix-blend-screen pointer-events-none" />
          <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[100px] opacity-50 mix-blend-screen pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-teal-300 text-xs font-semibold uppercase tracking-wide mb-6">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                The Real Estate Operating System
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                Where Every Deal <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-blue-500">
                  Comes Together.
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-400 mb-8 leading-relaxed max-w-xl">
                One Platform. Every Perspective. Connect agents, brokers, vendors, lenders, and homeowners in a single, powerful ecosystem.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold hover:from-blue-500 hover:to-teal-400 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2">
                  Explore the Network <ArrowRight className="w-5 h-5" />
                </button>
                <button className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors flex items-center justify-center">
                  View Demo
                </button>
              </div>
            </div>

            <div className="relative w-full aspect-square max-w-lg mx-auto lg:max-w-none">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-3xl backdrop-blur-3xl border border-white/10 p-4 transform rotate-3 scale-105 transition-transform duration-700 hover:rotate-0 hover:scale-100">
                <img 
                  src="/__mockup/images/hero-network.png" 
                  alt="Connected Network" 
                  className="w-full h-full object-cover rounded-2xl opacity-90"
                />
              </div>
              
              {/* Floating Node: Agent */}
              <div className="absolute -left-6 top-1/4 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl animate-float" style={{ animationDelay: '0s' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Briefcase className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm font-semibold text-white">Agent Portal</p>
                    <p className="text-xs text-slate-400">Deal Tracker Active</p>
                  </div>
                </div>
              </div>

              {/* Floating Node: Vendor */}
              <div className="absolute -right-8 top-1/2 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl animate-float" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/20 rounded-lg text-teal-400"><Wrench className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm font-semibold text-white">Vendor Network</p>
                    <p className="text-xs text-slate-400">New Bid Request</p>
                  </div>
                </div>
              </div>

              {/* Floating Node: Client */}
              <div className="absolute left-8 -bottom-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl animate-float" style={{ animationDelay: '4s' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Home className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm font-semibold text-white">Homeowner Hub</p>
                    <p className="text-xs text-slate-400">Timeline Updated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholder Hub */}
      <section id="roles" className="py-24 bg-slate-950 relative border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Five Perspectives. One Truth.</h2>
            <p className="text-slate-400 text-lg">Tailored experiences for every stakeholder, seamlessly synchronized in real-time.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Briefcase, role: "Agents", desc: "Kanban deal tracking, AI timelines, and RESPA-compliant lead gen.", color: "from-blue-500/20 to-blue-600/5", border: "hover:border-blue-500/50" },
              { icon: Building, role: "Brokers", desc: "Team management, license verification, and brokerage-wide analytics.", color: "from-indigo-500/20 to-indigo-600/5", border: "hover:border-indigo-500/50" },
              { icon: Wrench, role: "Vendors & Pros", desc: "Marketplace listings, bid management, and verified badges.", color: "from-teal-500/20 to-teal-600/5", border: "hover:border-teal-500/50" },
              { icon: LineChart, role: "Lenders", desc: "Direct integration for financial calculators and mortgage tracking.", color: "from-emerald-500/20 to-emerald-600/5", border: "hover:border-emerald-500/50" },
              { icon: Home, role: "Homeowners", desc: "Real-time transaction visibility and post-close MyHome Hub.", color: "from-purple-500/20 to-purple-600/5", border: "hover:border-purple-500/50" },
            ].map((role, idx) => (
              <div key={idx} className={`p-8 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm transition-all duration-300 ${role.border} hover:bg-white/[0.04] group`}>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <role.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{role.role}</h3>
                <p className="text-slate-400 leading-relaxed">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Deep Dives */}
      <section id="features" className="py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-6 border border-blue-500/30">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">Intelligent Transaction Management</h2>
              <p className="text-lg text-slate-400 mb-8">
                Move beyond clunky spreadsheets. Our Kanban boards, TREC contract parsing, and AI-driven timelines automate the heavy lifting of compliance and document tracking.
              </p>
              <ul className="space-y-4">
                {['Kanban document tracking', 'TREC contract parsing', 'Built-in document scanning', 'e-Signatures via DocuSign & SignNow'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-2xl blur-2xl opacity-20" />
              <img 
                src="/__mockup/images/dashboard-mockup.png" 
                alt="Dashboard Mockup" 
                className="relative rounded-2xl border border-white/10 shadow-2xl bg-slate-900"
              />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32 flex-col-reverse lg:flex-row-reverse">
            <div className="lg:order-2">
              <div className="w-12 h-12 rounded-lg bg-teal-500/20 flex items-center justify-center mb-6 border border-teal-500/30">
                <Users className="w-6 h-6 text-teal-400" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">HomeBase Pros Marketplace</h2>
              <p className="text-lg text-slate-400 mb-8">
                Instantly connect with verified home service professionals. Request bids for inspections, view ratings, and manage vendor teams entirely within the platform.
              </p>
              <ul className="space-y-4">
                {['Integrated vendor search', 'Inspection bid system', 'Ratings & reviews', 'License verification & badges'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative lg:order-1">
              <div className="absolute -inset-1 bg-gradient-to-tr from-teal-500 to-blue-600 rounded-2xl blur-2xl opacity-20" />
              <div className="relative rounded-2xl border border-white/10 shadow-2xl bg-slate-900 p-8">
                <div className="space-y-6">
                  {/* Mock Vendor Cards */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                          <Wrench className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white flex items-center gap-2">
                            Elite Home Inspections
                            <ShieldCheck className="w-4 h-4 text-teal-400" />
                          </p>
                          <div className="flex gap-1 text-xs text-slate-400 mt-1">
                            <span>★ 4.9 (120 reviews)</span>
                            <span>•</span>
                            <span>Austin, TX</span>
                          </div>
                        </div>
                      </div>
                      <button className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors">
                        Request Bid
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30">
                <Smartphone className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">Omnichannel Communication</h2>
              <p className="text-lg text-slate-400 mb-8">
                Keep every conversation in context. From automated drip campaigns to encrypted direct messaging, communication has never been cleaner.
              </p>
              <ul className="space-y-4">
                {['SMS via Twilio integration', 'Gmail sync & encrypted messaging', 'Call logging & quick snippets', 'RESPA-compliant zip code leads'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative grid grid-cols-2 gap-4">
              <div className="space-y-4 mt-8">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <MessageSquare className="w-8 h-8 text-blue-400 mb-4" />
                  <h4 className="font-semibold mb-2">Encrypted Chat</h4>
                  <p className="text-sm text-slate-400">Secure broker-to-agent and agent-to-client channels.</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <Zap className="w-8 h-8 text-yellow-400 mb-4" />
                  <h4 className="font-semibold mb-2">Drip Campaigns</h4>
                  <p className="text-sm text-slate-400">Automated follow-ups for warm leads.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <Globe className="w-8 h-8 text-teal-400 mb-4" />
                  <h4 className="font-semibold mb-2">Interactive Maps</h4>
                  <p className="text-sm text-slate-400">Visual lead generation and territory tracking.</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-teal-500/20 border border-blue-500/30 backdrop-blur-md">
                  <h4 className="text-2xl font-bold text-white mb-1">5000+</h4>
                  <p className="text-sm text-blue-200">Integrations via Zapier</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-x divide-white/10">
            <div>
              <p className="text-4xl lg:text-5xl font-bold text-white mb-2">$10B+</p>
              <p className="text-slate-400 font-medium">Transaction Volume</p>
            </div>
            <div>
              <p className="text-4xl lg:text-5xl font-bold text-white mb-2">50k+</p>
              <p className="text-slate-400 font-medium">Active Users</p>
            </div>
            <div>
              <p className="text-4xl lg:text-5xl font-bold text-white mb-2">98%</p>
              <p className="text-slate-400 font-medium">CSAT Score</p>
            </div>
            <div>
              <p className="text-4xl lg:text-5xl font-bold text-white mb-2">5k+</p>
              <p className="text-slate-400 font-medium">Verified Vendors</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-900/30 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400 text-lg">Choose the plan that fits your role in the ecosystem.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Agent Plan */}
            <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Briefcase className="w-24 h-24 text-blue-500" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-2">Agent Plan</h3>
                <p className="text-slate-400 mb-6">Everything you need to close more deals.</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-white">$49</span>
                  <span className="text-slate-400">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Unlimited transactions & CRM', 'Document tracking & e-Signatures', 'Interactive map & zip code leads', 'SMS, email & drip campaigns', 'Customizable dashboard'].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors">
                  Start Agent Trial
                </button>
              </div>
            </div>

            {/* Vendor Plan */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-teal-500/30 relative overflow-hidden shadow-[0_0_40px_rgba(20,184,166,0.1)]">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Wrench className="w-24 h-24 text-teal-500" />
              </div>
              <div className="absolute top-0 right-8 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-b-lg uppercase tracking-wider">
                Popular
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-2">Vendor Plan</h3>
                <p className="text-slate-400 mb-6">Grow your home services business.</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-white">$29</span>
                  <span className="text-slate-400">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Vendor portal & marketplace listing', 'Bid management system', 'Contractor verification badge', 'Lead notifications & messaging', 'Ratings & reviews engine'].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold transition-colors">
                  Join Marketplace
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/20" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Ready to join the ecosystem?</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Stop juggling multiple disconnected tools. Bring your entire real estate network into one unified platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="px-8 py-4 rounded-full bg-white text-slate-900 font-bold hover:bg-blue-50 transition-colors shadow-xl">
              Get Started for Free
            </button>
            <button className="px-8 py-4 rounded-full bg-slate-900 border border-white/20 text-white font-bold hover:bg-slate-800 transition-colors">
              Talk to Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 pt-16 pb-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img 
                  src="/__mockup/images/homebaselogoicon_nobg.png" 
                  alt="HomeBase Logo" 
                  className="h-8 w-8 object-contain grayscale opacity-80"
                />
                <span className="text-xl font-bold text-white">HomeBase</span>
              </div>
              <p className="text-slate-400 text-sm max-w-xs mb-6">
                The central nervous system for real estate professionals, vendors, lenders, and homeowners.
              </p>
              <div className="flex space-x-4">
                {/* Social icons placeholders */}
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors"><Globe className="w-4 h-4 text-slate-400" /></div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors"><Users className="w-4 h-4 text-slate-400" /></div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Agents</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Brokers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Vendors</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Homeowners</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Transaction Mgt</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Lead Generation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Calculators</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} HomeBase Real Estate Systems. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInlineStyle={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
