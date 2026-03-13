import React from "react";
import { 
  BarChart3, 
  Target, 
  FileText, 
  Users, 
  Bell,
  Briefcase,
  Building,
  Wrench,
  Landmark,
  Home,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  Calendar,
  Navigation,
  Route,
  MessageSquare,
  Send,
  Star,
  ChevronRight,
  GripVertical,
  Plus,
  Search,
  MoreHorizontal,
  CalendarDays
} from "lucide-react";

function KanbanMockup() {
  const columns: { title: string; color: string; borderColor: string; docs: { name: string; badge: string; signing?: string }[] }[] = [
    {
      title: "Not Applicable",
      color: "bg-gray-100 text-gray-700",
      borderColor: "border-gray-200",
      docs: [
        { name: "IABS", badge: "gray" },
        { name: "Lead Paint Disclosure", badge: "gray" },
      ]
    },
    {
      title: "Waiting Signatures",
      color: "bg-orange-100 text-orange-700",
      borderColor: "border-orange-200",
      docs: [
        { name: "Buyer Rep Agreement", badge: "orange", signing: "DocuSign" },
        { name: "Third Party Financing", badge: "orange", signing: "SignNow" },
      ]
    },
    {
      title: "Signed",
      color: "bg-blue-100 text-blue-700",
      borderColor: "border-blue-200",
      docs: [
        { name: "1-4 Family Contract", badge: "blue" },
        { name: "Listing Agreement", badge: "blue" },
        { name: "T-47 Survey", badge: "blue" },
      ]
    },
    {
      title: "Waiting Others",
      color: "bg-purple-100 text-purple-700",
      borderColor: "border-purple-200",
      docs: [
        { name: "Option Fee Receipt", badge: "purple" },
        { name: "Earnest Money Receipt", badge: "purple" },
      ]
    },
    {
      title: "Complete",
      color: "bg-green-100 text-green-700",
      borderColor: "border-green-200",
      docs: [
        { name: "MLS Data Sheet", badge: "green" },
        { name: "Seller's Disclosure", badge: "green" },
        { name: "HOA Docs", badge: "green" },
        { name: "Title Commitment", badge: "green" },
      ]
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-600" />
          <span className="font-semibold text-sm text-slate-800">Document Checklist</span>
          <span className="text-xs text-slate-400">• 1847 Oakwood Dr</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs bg-black text-white px-3 py-1 rounded-md flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
        </div>
      </div>
      <div className="flex gap-0 overflow-x-auto">
        {columns.map((col) => (
          <div key={col.title} className={`min-w-[160px] flex-1 border-r last:border-r-0 border-slate-100`}>
            <div className="px-3 py-2 border-b border-slate-100">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.color}`}>{col.title}</span>
              <span className="text-[10px] text-slate-400 ml-1">{col.docs.length}</span>
            </div>
            <div className="p-2 space-y-1.5 min-h-[120px]">
              {col.docs.map((doc) => (
                <div key={doc.name} className="bg-white border border-slate-150 rounded-md p-2 text-[11px] hover:shadow-sm transition-shadow cursor-move group">
                  <div className="flex items-start gap-1">
                    <GripVertical className="w-3 h-3 text-slate-300 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    <span className="font-medium text-slate-800 leading-tight">{doc.name}</span>
                  </div>
                  {doc.signing && (
                    <span className="text-[9px] text-slate-400 ml-4 flex items-center gap-0.5 mt-0.5">
                      <Send className="w-2.5 h-2.5" /> {doc.signing}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 280 }}>
      <div className="bg-slate-900 rounded-[40px] p-3 shadow-[0_25px_60px_rgba(0,0,0,0.3)]">
        <div className="bg-white rounded-[28px] overflow-hidden" style={{ height: 560 }}>
          <div className="bg-white px-4 pt-3 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
                  <Home className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-xs">HomeBase</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">JD</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Good morning, James</p>
          </div>
          
          <div className="px-3 py-2 space-y-2 overflow-hidden">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-blue-50 rounded-xl p-2.5">
                <p className="text-[9px] text-blue-600 font-medium">Active Deals</p>
                <p className="text-lg font-bold text-blue-900">12</p>
                <p className="text-[8px] text-blue-500">+3 this week</p>
              </div>
              <div className="bg-green-50 rounded-xl p-2.5">
                <p className="text-[9px] text-green-600 font-medium">Pipeline</p>
                <p className="text-lg font-bold text-green-900">$2.4M</p>
                <p className="text-[8px] text-green-500">↑ 18% MoM</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-2.5">
                <p className="text-[9px] text-orange-600 font-medium">New Leads</p>
                <p className="text-lg font-bold text-orange-900">8</p>
                <p className="text-[8px] text-orange-500">4 unclaimed</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-2.5">
                <p className="text-[9px] text-purple-600 font-medium">Showings</p>
                <p className="text-lg font-bold text-purple-900">5</p>
                <p className="text-[8px] text-purple-500">2 today</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-800">Today's Schedule</span>
                <CalendarDays className="w-3 h-3 text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-500 rounded-full shrink-0"></div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-800">Showing — 1847 Oakwood Dr</p>
                    <p className="text-[8px] text-slate-400">10:00 AM • with Sarah M.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-green-500 rounded-full shrink-0"></div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-800">Closing — 402 Elm St</p>
                    <p className="text-[8px] text-slate-400">2:00 PM • Title Company</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-orange-500 rounded-full shrink-0"></div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-800">Inspection — 98 Pine Ln</p>
                    <p className="text-[8px] text-slate-400">4:30 PM • Vendor: ProCheck</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-800">Recent Messages</span>
                <MessageSquare className="w-3 h-3 text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[7px] font-bold text-blue-700 shrink-0">SM</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-medium text-slate-700 truncate">Sarah Martinez</p>
                    <p className="text-[8px] text-slate-400 truncate">Can we reschedule the showing?</p>
                  </div>
                  <span className="text-[7px] text-slate-400">2m</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-[7px] font-bold text-green-700 shrink-0">TJ</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-medium text-slate-700 truncate">Tom Johnson</p>
                    <p className="text-[8px] text-slate-400 truncate">Inspection report is ready</p>
                  </div>
                  <span className="text-[7px] text-slate-400">15m</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 bg-white border border-slate-200 rounded-2xl px-2 py-1.5 flex items-center justify-around">
            <div className="flex flex-col items-center"><Home className="w-4 h-4 text-black" /><span className="text-[7px] font-medium">Home</span></div>
            <div className="flex flex-col items-center"><Search className="w-4 h-4 text-slate-400" /><span className="text-[7px] text-slate-400">Search</span></div>
            <div className="flex flex-col items-center"><MessageSquare className="w-4 h-4 text-slate-400" /><span className="text-[7px] text-slate-400">Messages</span></div>
            <div className="flex flex-col items-center"><Users className="w-4 h-4 text-slate-400" /><span className="text-[7px] text-slate-400">Clients</span></div>
          </div>
        </div>
      </div>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-b-2xl z-10"></div>
    </div>
  );
}

function MapRouteMockup() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-slate-600" />
          <span className="font-semibold text-sm text-slate-800">Route Optimizer</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Optimized</span>
        </div>
      </div>
      <div className="relative h-[260px] bg-[#f0ede8] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[20%] left-[15%] w-[70%] h-[60%]">
            <svg viewBox="0 0 300 150" className="w-full h-full" fill="none">
              <path d="M30 120 Q80 20, 150 80 Q220 140, 270 40" stroke="#3b82f6" strokeWidth="3" strokeDasharray="8 4" fill="none" opacity="0.6"/>
              <circle cx="30" cy="120" r="8" fill="#3b82f6" stroke="white" strokeWidth="2"/>
              <circle cx="110" cy="55" r="8" fill="#f59e0b" stroke="white" strokeWidth="2"/>
              <circle cx="190" cy="100" r="8" fill="#f59e0b" stroke="white" strokeWidth="2"/>
              <circle cx="270" cy="40" r="8" fill="#10b981" stroke="white" strokeWidth="2"/>
              <text x="30" y="118" textAnchor="middle" className="text-[8px] font-bold fill-white">1</text>
              <text x="110" y="53" textAnchor="middle" className="text-[8px] font-bold fill-white">2</text>
              <text x="190" y="98" textAnchor="middle" className="text-[8px] font-bold fill-white">3</text>
              <text x="270" y="38" textAnchor="middle" className="text-[8px] font-bold fill-white">4</text>
            </svg>
          </div>
          <div className="absolute top-3 right-3 bg-white rounded-lg shadow-md p-2 text-[10px]">
            <p className="font-bold text-slate-800">4 stops</p>
            <p className="text-slate-500">32 mi • ~48 min</p>
          </div>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        {[
          { num: "1", label: "Start: Office", time: "9:00 AM", color: "bg-blue-500" },
          { num: "2", label: "1847 Oakwood Dr", time: "9:25 AM", color: "bg-amber-500" },
          { num: "3", label: "402 Elm St", time: "10:10 AM", color: "bg-amber-500" },
          { num: "4", label: "98 Pine Lane", time: "10:45 AM", color: "bg-green-500" },
        ].map((stop) => (
          <div key={stop.num} className="flex items-center gap-2 text-[11px]">
            <div className={`w-5 h-5 ${stop.color} rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>{stop.num}</div>
            <span className="font-medium text-slate-700 flex-1">{stop.label}</span>
            <span className="text-slate-400">{stop.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MobileShowcase() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex gap-8 items-center w-1/3">
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Pros</a>
          </div>
          <div className="w-1/3 flex justify-center">
            <img src="/__mockup/images/homebase-logo.png" alt="HomeBase" className="h-8 object-contain" />
          </div>
          <div className="flex justify-end w-1/3 gap-4 items-center">
            <a href="#" className="text-sm font-medium text-slate-900 hover:text-slate-600 transition-colors hidden sm:block">Log in</a>
            <button className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-slate-800 transition-all">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 relative">
          
          {/* Left Text */}
          <div className="w-full lg:w-1/2 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/50 text-slate-800 text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              The modern platform for real estate
            </div>
            <h1 className="text-5xl lg:text-7xl font-['Playfair_Display'] font-bold leading-[1.1] tracking-tight mb-6">
              Real estate,<br />reimagined.
            </h1>
            <p className="text-lg text-slate-600 mb-10 max-w-lg leading-relaxed">
              Connect agents, vendors, lenders, and clients on one powerful, mobile-first platform. Say goodbye to fragmented tools and hello to seamless closings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-black text-white px-8 py-4 rounded-full text-base font-medium hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                Start your free trial <ArrowRight className="w-4 h-4" />
              </button>
              <button className="bg-white border border-slate-200 text-slate-900 px-8 py-4 rounded-full text-base font-medium hover:bg-slate-50 transition-all flex items-center justify-center">
                Book a Demo
              </button>
            </div>
            
            <div className="mt-12 flex items-center gap-4 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold">
                    {String.fromCharCode(64+i)}
                  </div>
                ))}
              </div>
              <p>Join 10,000+ top producing professionals</p>
            </div>
          </div>

          {/* Right Mobile Mockup */}
          <div className="w-full lg:w-1/2 relative flex justify-center items-center py-8">
            <div className="relative z-20">
              <PhoneMockup />
              
              {/* Floating feature pills around the phone - hidden on small screens to prevent clipping */}
              <div className="hidden lg:flex absolute top-[8%] -left-[55%] bg-white pl-4 pr-6 py-3 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] items-center gap-3 animate-[float_6s_ease-in-out_infinite] border border-slate-100/80">
                <div className="bg-slate-900 p-2 rounded-xl text-white shrink-0"><BarChart3 className="w-4 h-4" /></div>
                <div><span className="font-bold text-xs text-slate-900 block">Track Deals</span><span className="text-[10px] text-slate-500">Visual pipeline</span></div>
              </div>
              <div className="hidden lg:flex absolute top-[30%] -right-[50%] bg-white pl-4 pr-6 py-3 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] items-center gap-3 animate-[float_6s_ease-in-out_infinite_1s] border border-slate-100/80">
                <div className="bg-slate-900 p-2 rounded-xl text-white shrink-0"><FileText className="w-4 h-4" /></div>
                <div><span className="font-bold text-xs text-slate-900 block">E-Signatures</span><span className="text-[10px] text-slate-500">DocuSign & SignNow</span></div>
              </div>
              <div className="hidden lg:flex absolute top-[55%] -left-[48%] bg-white pl-4 pr-6 py-3 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] items-center gap-3 animate-[float_6s_ease-in-out_infinite_2s] border border-slate-100/80">
                <div className="bg-slate-900 p-2 rounded-xl text-white shrink-0"><Target className="w-4 h-4" /></div>
                <div><span className="font-bold text-xs text-slate-900 block">Manage Leads</span><span className="text-[10px] text-slate-500">Zip code targeting</span></div>
              </div>
              <div className="hidden lg:flex absolute bottom-[25%] -right-[45%] bg-white pl-4 pr-6 py-3 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] items-center gap-3 animate-[float_6s_ease-in-out_infinite_3s] border border-slate-100/80">
                <div className="bg-slate-900 p-2 rounded-xl text-white shrink-0"><Navigation className="w-4 h-4" /></div>
                <div><span className="font-bold text-xs text-slate-900 block">Route Optimizer</span><span className="text-[10px] text-slate-500">Plan your showings</span></div>
              </div>
              <div className="hidden lg:flex absolute bottom-[8%] -left-[42%] bg-white pl-4 pr-6 py-3 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] items-center gap-3 animate-[float_6s_ease-in-out_infinite_4s] border border-slate-100/80">
                <div className="bg-slate-900 p-2 rounded-xl text-white shrink-0"><Calendar className="w-4 h-4" /></div>
                <div><span className="font-bold text-xs text-slate-900 block">Calendar Sync</span><span className="text-[10px] text-slate-500">iCal & Google</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-b border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-medium text-slate-400 uppercase tracking-widest mb-8">Trusted by industry leaders</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Placeholders for logos */}
            <div className="text-xl font-bold font-['Playfair_Display']">Compass</div>
            <div className="text-xl font-bold">eXp Realty</div>
            <div className="text-xl font-bold font-serif">Sotheby's</div>
            <div className="text-xl font-bold tracking-tighter">Keller Williams</div>
            <div className="text-xl font-bold">RE/MAX</div>
          </div>
        </div>
      </section>

      {/* Not Just a CRM */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold font-['Playfair_Display'] mb-6 tracking-tight">Not just another CRM.</h2>
            <p className="text-lg text-slate-600">
              HomeBase is an entire ecosystem designed to bring everyone involved in a transaction onto a single, beautifully designed platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2">Agents</h3>
              <p className="text-sm text-slate-600">Track deals, capture leads, and close faster with AI-driven workflows.</p>
            </div>
            
            <div className="bg-purple-50/50 p-8 rounded-3xl border border-purple-100 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2">Brokers</h3>
              <p className="text-sm text-slate-600">Gain bird's-eye visibility into team performance and compliance.</p>
            </div>

            <div className="bg-orange-50/50 p-8 rounded-3xl border border-orange-100 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2">Vendors</h3>
              <p className="text-sm text-slate-600">Win inspection bids and manage your pros profile directly.</p>
            </div>

            <div className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2">Lenders</h3>
              <p className="text-sm text-slate-600">Stay aligned with agents and provide clear timelines to buyers.</p>
            </div>

            <div className="bg-rose-50/50 p-8 rounded-3xl border border-rose-100 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-6 group-hover:scale-110 transition-transform">
                <Home className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2">Homeowners</h3>
              <p className="text-sm text-slate-600">Enjoy real-time transaction updates and post-close home management.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dives */}
      <section className="py-24 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-32">
          
          {/* Feature 1: Transaction Management */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2">
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <KanbanMockup />
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6">
                Transaction Management
              </div>
              <h2 className="text-3xl lg:text-5xl font-['Playfair_Display'] font-bold mb-6">Control the chaos of closing.</h2>
              <p className="text-lg text-slate-600 mb-8">
                Move deals from draft to done with an intelligent, visual pipeline. Let AI parse your TREC contracts and auto-generate compliance timelines.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-500 shrink-0" />
                  <span className="text-slate-700"><strong>Visual Kanban Boards:</strong> Drag and drop your deals through every stage of the process.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-500 shrink-0" />
                  <span className="text-slate-700"><strong>Built-in E-Signatures:</strong> Native integrations with DocuSign and SignNow.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-500 shrink-0" />
                  <span className="text-slate-700"><strong>AI Timeline Generation:</strong> Instant deadlines parsed directly from your uploaded contracts.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 2: Lead Generation */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="w-full lg:w-1/2">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 relative group">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10"></div>
                <img src="/__mockup/images/hero-aerial-home.png" alt="Map based lead generation" className="w-full object-cover aspect-[4/3]" />
                
                {/* Floating UI element */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl z-20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-full"><Zap className="w-5 h-5 text-green-600" /></div>
                    <div>
                      <p className="text-sm font-bold">New Lead: Sarah Jenkins</p>
                      <p className="text-xs text-slate-500">Looking in 78704 • $850k budget</p>
                    </div>
                  </div>
                  <button className="bg-black text-white text-xs px-4 py-2 rounded-full font-medium">Claim</button>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-6">
                Lead Generation
              </div>
              <h2 className="text-3xl lg:text-5xl font-['Playfair_Display'] font-bold mb-6">Never miss an opportunity.</h2>
              <p className="text-lg text-slate-600 mb-8">
                Capture high-intent buyers and sellers with our exclusive, RESPA-compliant zip code lead system and interactive mapping tools.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 shrink-0" />
                  <span className="text-slate-700"><strong>Zip Code Dominance:</strong> Claim your territory and get exclusive routing for inquiries in your area.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 shrink-0" />
                  <span className="text-slate-700"><strong>Automated Drip Campaigns:</strong> Keep your pipeline warm while you sleep with smart follow-ups.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 shrink-0" />
                  <span className="text-slate-700"><strong>Listing Alerts:</strong> Auto-notify clients the second a matching property hits the market.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3: Marketplace */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
                <img src="/__mockup/images/hero-interior.png" alt="HomeBase Pros Marketplace" className="w-full object-cover aspect-[4/3]" />
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-bold uppercase tracking-wider mb-6">
                HomeBase Pros
              </div>
              <h2 className="text-3xl lg:text-5xl font-['Playfair_Display'] font-bold mb-6">Your rolodex, revolutionized.</h2>
              <p className="text-lg text-slate-600 mb-8">
                Connect with top-rated inspectors, contractors, and service providers. Send bid requests and track vendor status without leaving the app.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-teal-500 shrink-0" />
                  <span className="text-slate-700"><strong>Instant Bid System:</strong> Send property details to multiple vendors and compare quotes side-by-side.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-teal-500 shrink-0" />
                  <span className="text-slate-700"><strong>Verified Reviews:</strong> Real feedback from other agents in the HomeBase network.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-teal-500 shrink-0" />
                  <span className="text-slate-700"><strong>License Verification:</strong> Trust that every Pro on the platform is fully licensed and insured.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 4: Route Optimization & Showings */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="w-full lg:w-1/2">
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <MapRouteMockup />
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-bold uppercase tracking-wider mb-6">
                Showings & Route Optimization
              </div>
              <h2 className="text-3xl lg:text-5xl font-['Playfair_Display'] font-bold mb-6">Show smarter, not harder.</h2>
              <p className="text-lg text-slate-600 mb-8">
                Plan your day like a pro. Our intelligent route optimizer maps the fastest path between showings, while clients can request and schedule tours directly from their portal.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-sky-500 shrink-0" />
                  <span className="text-slate-700"><strong>Route Optimization:</strong> Automatically plan the most efficient drive route between all your day's showings.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-sky-500 shrink-0" />
                  <span className="text-slate-700"><strong>Showing Requests:</strong> Clients request tours on properties they like — approve, reschedule, or decline with one tap.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-sky-500 shrink-0" />
                  <span className="text-slate-700"><strong>Interactive Map:</strong> See all your showings, clients, and listings pinned on one live map view.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 5: Calendar Integration */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-sm text-slate-800">Calendar</span>
                    <span className="text-xs text-slate-400">• March 2026</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Google Synced</span>
                    <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">iCal</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["S","M","T","W","T","F","S"].map((d, i) => (
                      <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
                    ))}
                    {Array.from({length: 35}, (_, i) => {
                      const day = i - 2;
                      const isToday = day === 13;
                      const hasEvent = [5, 8, 13, 14, 19, 22, 27].includes(day);
                      const hasShowing = [8, 13, 19].includes(day);
                      const hasClosing = [14, 27].includes(day);
                      return (
                        <div key={i} className={`text-center py-1.5 rounded-lg text-[11px] relative ${isToday ? 'bg-black text-white font-bold' : day < 1 || day > 31 ? 'text-slate-200' : 'text-slate-700'}`}>
                          {day < 1 ? 31 + day : day > 31 ? day - 31 : day}
                          {hasEvent && day >= 1 && day <= 31 && (
                            <div className="flex gap-0.5 justify-center mt-0.5">
                              {hasShowing && <div className="w-1 h-1 bg-blue-500 rounded-full"></div>}
                              {hasClosing && <div className="w-1 h-1 bg-green-500 rounded-full"></div>}
                              {!hasShowing && !hasClosing && <div className="w-1 h-1 bg-orange-400 rounded-full"></div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-[10px] font-bold text-slate-800 mb-2">Upcoming</p>
                    {[
                      { time: "10:00 AM", title: "Showing — 1847 Oakwood Dr", color: "bg-blue-500", type: "Buyer Tour" },
                      { time: "1:00 PM", title: "Inspection — 98 Pine Ln", color: "bg-orange-500", type: "ProCheck Inc." },
                      { time: "3:30 PM", title: "Closing — 402 Elm St", color: "bg-green-500", type: "Title Co." },
                    ].map((event) => (
                      <div key={event.title} className="flex items-center gap-2 group">
                        <div className={`w-1 h-8 ${event.color} rounded-full shrink-0`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-800">{event.title}</p>
                          <p className="text-[9px] text-slate-400">{event.time} • {event.type}</p>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-wider mb-6">
                Calendar & Scheduling
              </div>
              <h2 className="text-3xl lg:text-5xl font-['Playfair_Display'] font-bold mb-6">Your entire day, at a glance.</h2>
              <p className="text-lg text-slate-600 mb-8">
                Sync your HomeBase calendar with Google Calendar, iCal, or Outlook. Every showing, inspection, and closing date auto-populates so you never double-book again.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-violet-500 shrink-0" />
                  <span className="text-slate-700"><strong>Calendar Sync:</strong> Two-way sync with Google Calendar, Apple iCal, and Outlook — all your events in one place.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-violet-500 shrink-0" />
                  <span className="text-slate-700"><strong>Auto-Populated Deadlines:</strong> AI-parsed contract dates automatically appear on your calendar with reminders.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-violet-500 shrink-0" />
                  <span className="text-slate-700"><strong>Client Scheduling:</strong> Clients book showings directly from their portal — no more back-and-forth texts.</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-[#F5F2EE] border-y border-[#E8E4DF]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-[#E8E4DF]">
            <div className="text-center px-4">
              <p className="text-4xl lg:text-6xl font-['Playfair_Display'] font-bold text-slate-900 mb-2">45%</p>
              <p className="text-sm text-slate-600 font-medium">Faster transaction closes</p>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl lg:text-6xl font-['Playfair_Display'] font-bold text-slate-900 mb-2">3.2x</p>
              <p className="text-sm text-slate-600 font-medium">More repeat clients</p>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl lg:text-6xl font-['Playfair_Display'] font-bold text-slate-900 mb-2">12hrs</p>
              <p className="text-sm text-slate-600 font-medium">Saved per week on admin</p>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl lg:text-6xl font-['Playfair_Display'] font-bold text-slate-900 mb-2">10k+</p>
              <p className="text-sm text-slate-600 font-medium">Active verified pros</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold font-['Playfair_Display'] mb-6 tracking-tight">Radically simple workflow.</h2>
            <p className="text-lg text-slate-600">
              Get up and running in minutes, not weeks. Our platform is designed to intuitively match how you already work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="relative">
              <div className="text-[120px] font-bold font-['Playfair_Display'] text-slate-100 absolute -top-16 -left-6 z-0 leading-none">1</div>
              <div className="relative z-10 pt-8">
                <h3 className="text-2xl font-bold mb-4">Set up your hub</h3>
                <p className="text-slate-600">Create your profile, sync your Gmail and calendar, and connect your favorite tools like Dropbox and Zapier.</p>
              </div>
            </div>
            
            <div className="relative">
              <div className="text-[120px] font-bold font-['Playfair_Display'] text-slate-100 absolute -top-16 -left-6 z-0 leading-none">2</div>
              <div className="relative z-10 pt-8">
                <h3 className="text-2xl font-bold mb-4">Invite your network</h3>
                <p className="text-slate-600">Add your clients to their portal, loop in your preferred lenders, and connect with local inspectors.</p>
              </div>
            </div>

            <div className="relative">
              <div className="text-[120px] font-bold font-['Playfair_Display'] text-slate-100 absolute -top-16 -left-6 z-0 leading-none">3</div>
              <div className="relative z-10 pt-8">
                <h3 className="text-2xl font-bold mb-4">Close more deals</h3>
                <p className="text-slate-600">Use AI to generate timelines, capture leads automatically, and manage everything from the palm of your hand.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-32 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold font-['Playfair_Display'] mb-6 tracking-tight">Transparent pricing.</h2>
            <p className="text-lg text-slate-600">
              Choose the plan that fits your role. No hidden fees, no long-term contracts.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Vendor Plan */}
            <div className="bg-white rounded-3xl p-10 border border-slate-200 flex flex-col hover:border-slate-300 transition-colors">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">Vendor Plan</h3>
                <p className="text-slate-500 text-sm h-10">For inspectors, contractors, and home service pros.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">$29</span>
                  <span className="text-slate-500 font-medium">/mo</span>
                </div>
              </div>
              <div className="space-y-4 flex-grow mb-10">
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-slate-900" /><span className="text-sm text-slate-700">Verified Pro Badge</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-slate-900" /><span className="text-sm text-slate-700">Receive Direct Bid Requests</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-slate-900" /><span className="text-sm text-slate-700">Review & Rating Management</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-slate-900" /><span className="text-sm text-slate-700">Basic App Integrations</span></div>
              </div>
              <button className="w-full py-4 rounded-xl border border-slate-200 font-medium hover:bg-slate-50 transition-colors">
                Start 14-Day Free Trial
              </button>
            </div>

            {/* Agent Plan */}
            <div className="bg-slate-900 text-white rounded-3xl p-10 border border-slate-800 flex flex-col relative shadow-2xl">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Most Popular
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">Agent Plan</h3>
                <p className="text-slate-400 text-sm h-10">For agents and brokers scaling their business.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">$49</span>
                  <span className="text-slate-400 font-medium">/mo</span>
                </div>
              </div>
              <div className="space-y-4 flex-grow mb-10">
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-blue-400" /><span className="text-sm text-slate-300">Full Transaction Management</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-blue-400" /><span className="text-sm text-slate-300">Unlimited E-Signatures</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-blue-400" /><span className="text-sm text-slate-300">AI Contract Parsing</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-blue-400" /><span className="text-sm text-slate-300">Zip Code Lead Routing</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-blue-400" /><span className="text-sm text-slate-300">Client Portal Access</span></div>
              </div>
              <button className="w-full py-4 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors">
                Get Started
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 overflow-hidden">
        {/* Background Image with Dark Overlay */}
        <div className="absolute inset-0 z-0">
          <img src="/__mockup/images/hero-house-clean.png" alt="Modern Home" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px]"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-5xl md:text-7xl font-bold font-['Playfair_Display'] mb-8">Ready to close more deals?</h2>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Join the thousands of real estate professionals who are saving time and providing a better experience for their clients.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="bg-white text-slate-900 px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-100 transition-all">
              Create your account
            </button>
            <button className="bg-transparent border border-white/30 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-white/10 transition-all">
              Talk to Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white pt-20 pb-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <img src="/__mockup/images/homebase-logo.png" alt="HomeBase" className="h-8 object-contain mb-6" />
              <p className="text-slate-500 text-sm max-w-xs mb-8">
                The modern operating system for real estate professionals. Manage transactions, capture leads, and connect your entire network.
              </p>
              <div className="flex gap-4">
                {/* Social icons placeholders */}
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer transition-colors"><span className="text-slate-600 font-bold text-xs">Tw</span></div>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer transition-colors"><span className="text-slate-600 font-bold text-xs">In</span></div>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer transition-colors"><span className="text-slate-600 font-bold text-xs">Li</span></div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-6">Solutions</h4>
              <ul className="space-y-4 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">For Agents</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">For Brokers</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">For Vendors</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">For Lenders</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500">© 2024 HomeBase, Inc. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <a href="#" className="hover:text-slate-900">Terms of Service</a>
              <a href="#" className="hover:text-slate-900">Privacy</a>
              <a href="#" className="hover:text-slate-900">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating animations definitions */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}} />
    </div>
  );
}
