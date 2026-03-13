import React from 'react';
import { 
  Building2, Users, Wrench, CircleDollarSign, ShieldCheck,
  TrendingUp, MapPin, Search, FileText, Smartphone,
  Star, Award, ArrowRight, CheckCircle2, MessageSquare, Briefcase
} from 'lucide-react';

export default function Marketplace() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <img src="/__mockup/images/homebaselogoicon_nobg.png" alt="HomeBase" className="h-10" />
              <span className="text-2xl font-black tracking-tight text-slate-900">HomeBase</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#roles" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Ecosystem</a>
              <a href="#leads" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Leads</a>
              <a href="#pros" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">HomeBase Pros</a>
              <a href="#pricing" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <button className="hidden md:block text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                Log In
              </button>
              <button className="px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transform hover:-translate-y-0.5">
                Join the Network
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/hero-handshake.png" 
            alt="Real estate professionals shaking hands" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-blue-900/80"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-sm font-bold mb-8 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
              Where Real Estate Meets Opportunity
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] mb-8 tracking-tight">
              Your Real Estate Business, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Amplified.</span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed max-w-2xl font-medium">
              Join the only platform where agents, vendors, lenders, and clients connect, collaborate, and close deals faster. It's not just a CRM—it's your entire business ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-4 rounded-full bg-white text-blue-900 text-lg font-bold hover:bg-slate-50 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] transform hover:-translate-y-1 flex items-center justify-center gap-2">
                Start Growing Today <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 rounded-full bg-slate-800/50 text-white border border-slate-700 text-lg font-bold hover:bg-slate-800 transition-all backdrop-blur-sm flex items-center justify-center">
                Explore the Marketplace
              </button>
            </div>
            
            <div className="mt-16 flex items-center gap-8 text-slate-400 font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For - Ecosystem */}
      <section id="roles" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Built for the Entire Ecosystem</h2>
            <p className="text-lg text-slate-600 font-medium">
              Real estate is a team sport. HomeBase brings every player onto the same field, creating a seamless experience from search to closing and beyond.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Agent Card */}
            <div className="bg-slate-50 rounded-3xl p-8 border-l-8 border-blue-600 shadow-sm hover:shadow-xl transition-all group">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Briefcase className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Agents & Brokers</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Manage transactions, generate zip-code leads, and track documents with AI-powered timelines. Your command center.
              </p>
            </div>

            {/* Vendor Card */}
            <div className="bg-slate-50 rounded-3xl p-8 border-l-8 border-orange-500 shadow-sm hover:shadow-xl transition-all group">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wrench className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Home Service Pros</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Win inspection bids, receive direct referrals from top agents, and manage your pipeline in our verified marketplace.
              </p>
            </div>

            {/* Lender Card */}
            <div className="bg-slate-50 rounded-3xl p-8 border-l-8 border-emerald-500 shadow-sm hover:shadow-xl transition-all group">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CircleDollarSign className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Lenders</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Connect with ready buyers, provide instant pre-approvals, and stay integrated in the transaction timeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Generation Spotlight */}
      <section id="leads" className="py-24 bg-slate-900 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-bold mb-6">
                <TrendingUp className="w-4 h-4" /> Growth Engine
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">
                Get Leads, Not Headaches.
              </h2>
              <p className="text-xl text-slate-300 mb-10 font-medium leading-relaxed">
                Stop buying shared, recycled contacts. Our RESPA-compliant lead generation system connects you with highly-targeted, exclusive opportunities in your territory.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Zip Code Targeting</h4>
                    <p className="text-slate-400 font-medium">Claim your territory. Receive exclusive leads from specific zip codes through our interactive map interface.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">100% RESPA Compliant</h4>
                    <p className="text-slate-400 font-medium">Grow your business without the legal worry. Our lead routing and co-marketing tools are built with compliance first.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Automated Drip Campaigns</h4>
                    <p className="text-slate-400 font-medium">Never let a lead go cold. Engage prospects instantly with customizable SMS and email sequences.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-[2.5rem] transform rotate-3 scale-105 opacity-50 blur-lg"></div>
              <img 
                src="/__mockup/images/hero-neighborhood.png" 
                alt="Neighborhood Aerial View" 
                className="relative rounded-[2.5rem] shadow-2xl border border-slate-700/50 w-full object-cover aspect-[4/3]"
              />
              
              {/* Floating UI Elements */}
              <div className="absolute -bottom-6 -left-6 bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 font-medium">New Lead</div>
                    <div className="text-white font-bold">78701 Area</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Features Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Everything You Need. All In One Place.</h2>
            <p className="text-lg text-slate-600 font-medium">
              We've replaced 5 different apps with one unified platform. Simplify your workflow and reduce your software costs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <FileText className="w-7 h-7 text-indigo-600" />,
                bg: "bg-indigo-100",
                title: "Transaction Management",
                desc: "Kanban boards, TREC contract parsing, and AI timelines. Integrated with DocuSign & SignNow."
              },
              {
                icon: <Smartphone className="w-7 h-7 text-pink-600" />,
                bg: "bg-pink-100",
                title: "Communication Hub",
                desc: "Centralized SMS via Twilio, Gmail integration, and encrypted messaging for sensitive client data."
              },
              {
                icon: <Users className="w-7 h-7 text-amber-600" />,
                bg: "bg-amber-100",
                title: "Client Portal",
                desc: "Give buyers and sellers real-time visibility into their transaction progress and next steps."
              },
              {
                icon: <Building2 className="w-7 h-7 text-sky-600" />,
                bg: "bg-sky-100",
                title: "MyHome Hub",
                desc: "Post-close engagement. Stay top-of-mind with homeowners long after the keys are handed over."
              },
              {
                icon: <CircleDollarSign className="w-7 h-7 text-emerald-600" />,
                bg: "bg-emerald-100",
                title: "Financial Tools",
                desc: "Built-in mortgage, affordability, and rent vs. buy calculators to help clients make informed decisions."
              },
              {
                icon: <Search className="w-7 h-7 text-violet-600" />,
                bg: "bg-violet-100",
                title: "5000+ Integrations",
                desc: "Connect your favorite tools via Zapier. Direct integrations with Dropbox, Stripe, and more."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow border border-slate-100 relative overflow-hidden group">
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 font-medium leading-relaxed">{feature.desc}</p>
                <div className={`absolute top-0 right-0 w-24 h-24 ${feature.bg} rounded-bl-full -mr-12 -mt-12 opacity-20 transition-transform group-hover:scale-150`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HomeBase Pros Marketplace */}
      <section id="pros" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2 order-2 lg:order-1 relative">
               <div className="absolute inset-0 bg-orange-100 rounded-[2.5rem] transform -rotate-3 scale-105"></div>
               <img 
                  src="/__mockup/images/hero-interior.png" 
                  alt="Modern interior" 
                  className="relative rounded-[2.5rem] shadow-xl w-full object-cover aspect-[4/3] border-4 border-white"
                />
                
                {/* Floating Badge */}
                <div className="absolute top-8 -right-8 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-orange-500 fill-orange-500" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Elite Contractor</div>
                    <div className="text-sm font-medium text-slate-500">Verified by HomeBase</div>
                  </div>
                </div>
            </div>
            
            <div className="lg:w-1/2 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-bold mb-6">
                <Award className="w-4 h-4" /> HomeBase Pros
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                The Elite Vendor Marketplace.
              </h2>
              <p className="text-xl text-slate-600 mb-8 font-medium leading-relaxed">
                Need a fast inspection? A reliable plumber? Our integrated marketplace connects agents with verified, top-rated local professionals.
              </p>
              
              <ul className="space-y-5">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block text-lg">Inspection Bid System</strong>
                    <span className="text-slate-600 font-medium">Post a job and receive competitive bids from verified inspectors instantly.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block text-lg">Verified Network</strong>
                    <span className="text-slate-600 font-medium">Every Pro is vetted. License verification and real reviews from other agents.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block text-lg">Seamless Communication</strong>
                    <span className="text-slate-600 font-medium">Chat, share documents, and coordinate schedules without leaving the transaction dashboard.</span>
                  </div>
                </li>
              </ul>
              
              <button className="mt-10 px-8 py-4 rounded-full bg-slate-900 text-white text-lg font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                Browse Pros Network <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">How the Network Works</h2>
            <p className="text-lg text-slate-600 font-medium">A flywheel of opportunity that accelerates everyone's business.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-1 bg-slate-200 z-0"></div>
            
            {[
              {
                num: "01",
                title: "Connect & Setup",
                desc: "Agents, vendors, and lenders create profiles, verify licenses, and claim territories."
              },
              {
                num: "02",
                title: "Collaborate on Deals",
                desc: "Manage transactions seamlessly. Route leads, request bids, and share documents securely."
              },
              {
                num: "03",
                title: "Grow Together",
                desc: "Close faster, generate referrals, and build lasting relationships with clients post-close."
              }
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white rounded-full border-8 border-slate-50 flex items-center justify-center text-3xl font-black text-blue-600 shadow-xl mb-6">
                  {step.num}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 font-medium max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-lg text-slate-600 font-medium">Invest in the platform that pays for itself with your first closed deal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Agent Plan */}
            <div className="bg-slate-900 rounded-[2rem] p-10 text-white relative shadow-2xl transform md:-translate-y-4">
              <div className="absolute top-0 right-8 transform -translate-y-1/2">
                <span className="bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full shadow-lg">
                  Most Popular
                </span>
              </div>
              
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-300">Agent Plan</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-5xl font-black tracking-tight">$49</span>
                    <span className="text-xl text-slate-400 font-medium ml-2">/mo</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center">
                  <Briefcase className="w-7 h-7 text-blue-400" />
                </div>
              </div>
              
              <p className="text-slate-400 font-medium mb-8 pb-8 border-b border-slate-800">
                Everything an agent needs to manage clients, transactions, and grow their business.
              </p>
              
              <ul className="space-y-4 mb-10">
                {[
                  "Unlimited transactions & clients",
                  "Document tracking & Kanban boards",
                  "Interactive map & zip code leads",
                  "SMS, email & drip campaigns",
                  "Customizable agent dashboard",
                  "Client portal access"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <span className="font-medium text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button className="w-full py-4 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                Start Agent Free Trial
              </button>
            </div>

            {/* Vendor Plan */}
            <div className="bg-white rounded-[2rem] p-10 border-2 border-slate-100 shadow-xl relative">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-600">Vendor Plan</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-5xl font-black tracking-tight text-slate-900">$29</span>
                    <span className="text-xl text-slate-500 font-medium ml-2">/mo</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <Wrench className="w-7 h-7 text-orange-500" />
                </div>
              </div>
              
              <p className="text-slate-600 font-medium mb-8 pb-8 border-b border-slate-100">
                Join the exclusive network to receive bids, leads, and manage real estate relationships.
              </p>
              
              <ul className="space-y-4 mb-10">
                {[
                  "Verified marketplace listing",
                  "Inspection bid management",
                  "Zip code lead notifications",
                  "Contractor verification badge",
                  "Ratings & reviews system",
                  "Encrypted messaging"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button className="w-full py-4 rounded-xl bg-slate-100 text-slate-900 text-lg font-bold hover:bg-slate-200 transition-all">
                Join Pro Network
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-blue-600 relative overflow-hidden">
        {/* Background Network Graphic */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
           <img 
            src="/__mockup/images/hero-network.png" 
            alt="Network background" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-5xl font-black text-white mb-6 tracking-tight">Ready to Grow?</h2>
          <p className="text-2xl text-blue-100 mb-10 font-medium">
            Join thousands of real estate professionals powering their business on HomeBase.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-10 py-5 rounded-full bg-white text-blue-900 text-xl font-bold hover:bg-slate-50 transition-all shadow-2xl transform hover:-translate-y-1">
              Create Your Free Account
            </button>
            <button className="px-10 py-5 rounded-full bg-blue-700 text-white text-xl font-bold hover:bg-blue-800 transition-all border border-blue-500">
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 pt-20 pb-10 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src="/__mockup/images/homebaselogoicon_nobg.png" alt="HomeBase" className="h-8 grayscale brightness-200" />
                <span className="text-2xl font-black tracking-tight text-white">HomeBase</span>
              </div>
              <p className="font-medium mb-6 max-w-sm">
                The unified ecosystem for real estate professionals. Manage transactions, generate leads, and collaborate in one place.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Product</h4>
              <ul className="space-y-4 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Ecosystem</h4>
              <ul className="space-y-4 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">For Agents</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For Brokers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">HomeBase Pros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For Lenders</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Company</h4>
              <ul className="space-y-4 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-medium">© {new Date().getFullYear()} HomeBase. All rights reserved.</p>
            <div className="flex gap-6">
               <a href="#" className="hover:text-white transition-colors">Twitter</a>
               <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
               <a href="#" className="hover:text-white transition-colors">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
