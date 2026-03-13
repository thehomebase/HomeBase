import React from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Home, Users, Briefcase, Building, Key, Shield, Smartphone, Zap } from "lucide-react";

export default function SleekEditorial() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-amber-100">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-8 w-1/3">
          <a href="#" className="text-sm tracking-wide hover:text-amber-600 transition-colors">Solutions</a>
          <a href="#" className="text-sm tracking-wide hover:text-amber-600 transition-colors">Features</a>
          <a href="#" className="text-sm tracking-wide hover:text-amber-600 transition-colors">About</a>
        </div>
        
        <div className="flex justify-center w-1/3">
          <img 
            src="/__mockup/images/homebase-logo.png" 
            alt="HomeBase Logo" 
            className="h-7 object-contain"
          />
        </div>
        
        <div className="flex justify-end w-1/3">
          <button className="px-6 py-2.5 text-sm font-medium border border-neutral-900 rounded-full hover:bg-neutral-900 hover:text-white transition-all duration-300">
            Get a Demo
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-8 max-w-7xl mx-auto text-center">
        <h1 className="text-6xl md:text-8xl font-['Playfair_Display'] font-medium leading-[1.1] tracking-tight mb-6">
          Your empire <br className="hidden md:block" />starts here.
        </h1>
        <p className="text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto mb-16 font-light">
          The all-in-one real estate platform designed for the modern professional. Manage transactions, generate leads, and close deals seamlessly.
        </p>
        
        <div className="relative w-full aspect-[21/9] max-h-[70vh] overflow-hidden rounded-sm group">
          <img 
            src="/__mockup/images/hero-house-dramatic.png" 
            alt="Luxury Home" 
            className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-1000 ease-out"
          />
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-neutral-200">
          <div className="text-center px-4">
            <p className="text-4xl font-['Playfair_Display'] font-medium mb-2">10,000+</p>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Transactions</p>
          </div>
          <div className="text-center px-4">
            <p className="text-4xl font-['Playfair_Display'] font-medium mb-2">2,500+</p>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Agents</p>
          </div>
          <div className="text-center px-4">
            <p className="text-4xl font-['Playfair_Display'] font-medium mb-2">98%</p>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Satisfaction</p>
          </div>
          <div className="text-center px-4">
            <p className="text-4xl font-['Playfair_Display'] font-medium mb-2">50</p>
            <p className="text-xs uppercase tracking-widest text-neutral-500">States</p>
          </div>
        </div>
      </section>

      {/* Feature Spotlights */}
      <section className="py-32 px-8 max-w-7xl mx-auto space-y-40">
        {/* Feature 1 */}
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2 space-y-6">
            <h2 className="text-4xl md:text-5xl font-['Playfair_Display'] leading-tight">
              Master your pipeline.
            </h2>
            <p className="text-lg text-neutral-500 font-light max-w-md">
              Kanban document tracking, TREC contract parsing, and AI-driven timelines. Everything you need to manage transactions flawlessly.
            </p>
            <a href="#" className="inline-flex items-center text-amber-600 hover:text-amber-700 font-medium group">
              Explore Management 
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          <div className="w-full md:w-1/2">
            <img 
              src="/__mockup/images/dashboard-mockup.png" 
              alt="Dashboard Mockup" 
              className="w-full h-auto shadow-2xl rounded-sm border border-neutral-100"
            />
          </div>
        </div>

        {/* Feature 2 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="w-full md:w-1/2 space-y-6 md:pl-16">
            <h2 className="text-4xl md:text-5xl font-['Playfair_Display'] leading-tight">
              A marketplace of pros.
            </h2>
            <p className="text-lg text-neutral-500 font-light max-w-md">
              Search vetted vendors, request inspection bids, and review ratings in the HomeBase Pros Marketplace. Build your trusted network.
            </p>
            <a href="#" className="inline-flex items-center text-amber-600 hover:text-amber-700 font-medium group">
              Discover Vendors 
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          <div className="w-full md:w-1/2">
            <img 
              src="/__mockup/images/hero-network.png" 
              alt="Professional Network" 
              className="w-full h-auto object-cover aspect-[4/3] rounded-sm grayscale hover:grayscale-0 transition-all duration-700"
            />
          </div>
        </div>

        {/* Feature 3 */}
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2 space-y-6">
            <h2 className="text-4xl md:text-5xl font-['Playfair_Display'] leading-tight">
              Capture every lead.
            </h2>
            <p className="text-lg text-neutral-500 font-light max-w-md">
              Targeted RESPA-compliant zip code leads, drip campaigns, and interactive maps. Turn prospects into lifelong clients.
            </p>
            <a href="#" className="inline-flex items-center text-amber-600 hover:text-amber-700 font-medium group">
              Grow Your Business 
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          <div className="w-full md:w-1/2">
            <img 
              src="/__mockup/images/hero-neighborhood.png" 
              alt="Neighborhood View" 
              className="w-full h-auto object-cover aspect-[4/3] rounded-sm grayscale hover:grayscale-0 transition-all duration-700"
            />
          </div>
        </div>
      </section>

      {/* Built for Everyone */}
      <section className="bg-neutral-50 py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-['Playfair_Display'] mb-4">Built for Everyone</h2>
            <p className="text-neutral-500 font-light">Tailored experiences for every role in the real estate journey.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {/* Agent */}
            <div className="border border-neutral-200 p-8 flex flex-col items-center text-center bg-white hover:border-neutral-900 transition-colors duration-300">
              <Users className="w-8 h-8 mb-6 text-neutral-800" strokeWidth={1.5} />
              <h3 className="text-lg font-medium mb-2">Agent</h3>
              <p className="text-sm text-neutral-500 font-light">Lead gen & CRM</p>
            </div>
            
            {/* Broker */}
            <div className="border border-neutral-200 p-8 flex flex-col items-center text-center bg-white hover:border-neutral-900 transition-colors duration-300">
              <Building className="w-8 h-8 mb-6 text-neutral-800" strokeWidth={1.5} />
              <h3 className="text-lg font-medium mb-2">Broker</h3>
              <p className="text-sm text-neutral-500 font-light">Team oversight</p>
            </div>
            
            {/* Vendor */}
            <div className="border border-neutral-200 p-8 flex flex-col items-center text-center bg-white hover:border-neutral-900 transition-colors duration-300">
              <Briefcase className="w-8 h-8 mb-6 text-neutral-800" strokeWidth={1.5} />
              <h3 className="text-lg font-medium mb-2">Vendor</h3>
              <p className="text-sm text-neutral-500 font-light">Marketplace bids</p>
            </div>
            
            {/* Lender */}
            <div className="border border-neutral-200 p-8 flex flex-col items-center text-center bg-white hover:border-neutral-900 transition-colors duration-300">
              <Shield className="w-8 h-8 mb-6 text-neutral-800" strokeWidth={1.5} />
              <h3 className="text-lg font-medium mb-2">Lender</h3>
              <p className="text-sm text-neutral-500 font-light">Client pre-approvals</p>
            </div>
            
            {/* Homeowner */}
            <div className="border border-neutral-200 p-8 flex flex-col items-center text-center bg-white hover:border-neutral-900 transition-colors duration-300">
              <Home className="w-8 h-8 mb-6 text-neutral-800" strokeWidth={1.5} />
              <h3 className="text-lg font-medium mb-2">Homeowner</h3>
              <p className="text-sm text-neutral-500 font-light">Post-close hub</p>
            </div>
          </div>
        </div>
      </section>

      {/* Phone Mockup Section */}
      <section className="py-32 px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto relative h-[800px] flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <h2 className="text-[12rem] font-['Playfair_Display'] whitespace-nowrap">HOMEBASE</h2>
          </div>
          
          <div className="relative z-10 w-full max-w-sm">
            <img 
              src="/__mockup/images/phone-mockup.png" 
              alt="Mobile App" 
              className="w-full h-auto drop-shadow-2xl"
            />
            
            {/* Floating Labels */}
            <div className="absolute top-[20%] -left-12 md:-left-32 bg-white/90 backdrop-blur-sm border border-neutral-200 px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-[bounce_4s_infinite]">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-sm font-medium tracking-wide">Track Deals</span>
            </div>
            
            <div className="absolute top-[40%] -right-12 md:-right-24 bg-white/90 backdrop-blur-sm border border-neutral-200 px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-[bounce_5s_infinite_0.5s]">
              <div className="w-2 h-2 rounded-full bg-neutral-900"></div>
              <span className="text-sm font-medium tracking-wide">Manage Leads</span>
            </div>
            
            <div className="absolute bottom-[40%] -left-8 md:-left-20 bg-white/90 backdrop-blur-sm border border-neutral-200 px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-[bounce_6s_infinite_1s]">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-sm font-medium tracking-wide">Client Portal</span>
            </div>
            
            <div className="absolute bottom-[20%] -right-16 md:-right-32 bg-white/90 backdrop-blur-sm border border-neutral-200 px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-[bounce_4.5s_infinite_1.5s]">
              <div className="w-2 h-2 rounded-full bg-neutral-900"></div>
              <span className="text-sm font-medium tracking-wide">Send Documents</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-32 px-8 max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-['Playfair_Display'] mb-6">Simple, transparent pricing.</h2>
          <p className="text-neutral-500 font-light text-lg">No hidden fees. Just powerful tools.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Agent Plan */}
          <div className="border border-neutral-900 p-12 relative flex flex-col group hover:shadow-2xl transition-shadow duration-500">
            <div className="mb-8">
              <h3 className="text-2xl font-['Playfair_Display'] mb-2">Agent Plan</h3>
              <p className="text-neutral-500 text-sm font-light">For individuals and growing teams.</p>
            </div>
            <div className="mb-8 flex items-baseline">
              <span className="text-5xl font-light">$49</span>
              <span className="text-neutral-500 ml-2">/mo</span>
            </div>
            <ul className="space-y-4 mb-12 flex-grow">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-light">Full CRM & Kanban Tracking</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-light">E-signatures (DocuSign integrated)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-light">Client Portal Access</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-light">Financial Calculators</span>
              </li>
            </ul>
            <button className="w-full py-4 bg-neutral-900 text-white text-sm tracking-widest uppercase hover:bg-neutral-800 transition-colors">
              Select Plan
            </button>
          </div>

          {/* Vendor Plan */}
          <div className="border border-neutral-200 p-12 relative flex flex-col group hover:border-neutral-900 transition-colors duration-500">
            <div className="mb-8">
              <h3 className="text-2xl font-['Playfair_Display'] mb-2">Vendor Plan</h3>
              <p className="text-neutral-500 text-sm font-light">For inspectors, appraisers & services.</p>
            </div>
            <div className="mb-8 flex items-baseline">
              <span className="text-5xl font-light">$29</span>
              <span className="text-neutral-500 ml-2">/mo</span>
            </div>
            <ul className="space-y-4 mb-12 flex-grow">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-neutral-400 shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-light">HomeBase Pros Marketplace Listing</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-neutral-400 shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-light">Receive & Respond to Bids</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-neutral-400 shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-light">Verified Badge Status</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-neutral-400 shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-light">Review & Rating Management</span>
              </li>
            </ul>
            <button className="w-full py-4 border border-neutral-900 text-neutral-900 text-sm tracking-widest uppercase hover:bg-neutral-50 transition-colors">
              Select Plan
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-neutral-900 text-white py-32 px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <img 
            src="/__mockup/images/homebaselogoicon_nobg.png" 
            alt="HomeBase Icon" 
            className="w-16 h-16 mx-auto mb-10 brightness-0 invert opacity-80"
          />
          <h2 className="text-5xl md:text-7xl font-['Playfair_Display'] mb-8">Ready to elevate your practice?</h2>
          <p className="text-xl text-neutral-400 font-light mb-12">
            Join the elite network of professionals closing deals with HomeBase.
          </p>
          <button className="px-10 py-5 bg-white text-neutral-900 text-sm tracking-widest uppercase font-medium hover:bg-amber-500 hover:text-white transition-all duration-300">
            Start Your Journey
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <img 
            src="/__mockup/images/homebase-logo.png" 
            alt="HomeBase Logo" 
            className="h-6 grayscale opacity-80"
          />
          
          <div className="flex gap-8 text-sm text-neutral-500">
            <a href="#" className="hover:text-neutral-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-neutral-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-neutral-900 transition-colors">Contact</a>
          </div>
          
          <p className="text-sm text-neutral-400">
            © {new Date().getFullYear()} HomeBase. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
