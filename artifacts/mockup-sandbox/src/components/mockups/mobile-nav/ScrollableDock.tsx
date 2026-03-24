import React, { useState, useRef, useEffect } from "react";
import { 
  FileText, Users, MessageSquare, ListTodo, DollarSign, Search, BarChart3, 
  Map as MapIcon, Store, HardHat, Home, Calendar, FolderOpen, Mail, Gift, 
  Bell, MapPin, Target, Calculator, ScanLine, Phone, Settings, User, 
  LogOut, Moon, Sun, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "deals", icon: FileText, label: "Deals", category: "Core" },
  { id: "clients", icon: Users, label: "Clients", category: "Core" },
  { id: "messages", icon: MessageSquare, label: "Messages", category: "Core" },
  { id: "tasks", icon: ListTodo, label: "Tasks", category: "Core" },
  { id: "commissions", icon: DollarSign, label: "Commissions", category: "Data" },
  { id: "search", icon: Search, label: "Search", category: "Core" },
  { id: "data", icon: BarChart3, label: "Data", category: "Data" },
  { id: "map", icon: MapIcon, label: "Map", category: "Core" },
  { id: "pros", icon: Store, label: "HomeBase Pros", category: "Services" },
  { id: "team", icon: HardHat, label: "My Team", category: "Services" },
  { id: "myhome", icon: Home, label: "MyHome", category: "Services" },
  { id: "calendar", icon: Calendar, label: "Calendar", category: "Services" },
  { id: "forms", icon: FolderOpen, label: "Forms Library", category: "Services" },
  { id: "mail", icon: Mail, label: "Mail", category: "Marketing" },
  { id: "referrals", icon: Gift, label: "Referrals", category: "Marketing" },
  { id: "drip", icon: Bell, label: "Drip Campaigns", category: "Marketing" },
  { id: "lead-gen", icon: MapPin, label: "Lead Gen", badge: 3, category: "Marketing" },
  { id: "lead-metrics", icon: Target, label: "Lead Metrics", category: "Data" },
  { id: "calculators", icon: Calculator, label: "Calculators", category: "Data" },
  { id: "scanner", icon: ScanLine, label: "Scanner", category: "Tools" },
  { id: "phone", icon: Phone, label: "Phone & SMS", category: "Tools" },
  { id: "settings", icon: Settings, label: "Settings", category: "Core" },
  { id: "profile", icon: User, label: "My Profile", category: "Core" },
  { id: "dark-mode", icon: Moon, label: "Dark Mode", category: "Tools" },
  { id: "logout", icon: LogOut, label: "Logout", category: "Tools" },
];

const CATEGORIES = ["All", "Core", "Marketing", "Services", "Data", "Tools"];

export function ScrollableDock() {
  const [activeTab, setActiveTab] = useState("All");
  const [activeItem, setActiveItem] = useState("deals");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const filteredItems = activeTab === "All" 
    ? NAV_ITEMS 
    : NAV_ITEMS.filter(item => item.category === activeTab);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    handleScroll();
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [activeTab]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 p-4 font-sans">
      {/* Mobile Device Frame */}
      <div className="w-[390px] h-[844px] bg-white rounded-[40px] shadow-2xl overflow-hidden relative border-[8px] border-neutral-900 flex flex-col">
        
        {/* Status Bar Mock */}
        <div className="h-12 w-full flex items-center justify-between px-6 pt-2 text-neutral-900 bg-white z-10 shrink-0">
          <span className="text-sm font-semibold">9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-4 h-4 rounded-full bg-neutral-900" />
            <div className="w-4 h-4 rounded-full bg-neutral-900" />
            <div className="w-6 h-4 rounded-sm bg-neutral-900" />
          </div>
        </div>

        {/* Fake Page Content */}
        <div className="flex-1 bg-slate-50 overflow-y-auto pb-[160px]">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Good Morning, Agent</h1>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">New Leads</p>
                <p className="text-2xl font-bold text-blue-600">12</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">Active Deals</p>
                <p className="text-2xl font-bold text-emerald-600">8</p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
              <h2 className="font-semibold mb-3">Today's Tasks</h2>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded border border-slate-300" />
                    <div className="flex-1 h-4 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium text-blue-900">Campaign Update</h3>
              </div>
              <p className="text-sm text-blue-700">Your Spring Market drip campaign has reached 450 contacts.</p>
            </div>
            
            <div className="space-y-4">
              <div className="h-24 bg-slate-100 rounded-2xl w-full" />
              <div className="h-24 bg-slate-100 rounded-2xl w-full" />
              <div className="h-24 bg-slate-100 rounded-2xl w-full" />
            </div>
          </div>
        </div>

        {/* Scrollable Dock Navigation */}
        <div className="absolute bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] rounded-t-3xl pt-3">
          
          {/* Top Row: Category Pills */}
          <div className="px-4 mb-3">
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeTab === cat 
                      ? "bg-slate-900 text-white" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          {/* Bottom Row: Icons Grid with Home Button overlay */}
          <div className="relative">
            {/* Left fade indicator */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-6 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            )}
            
            {/* Right fade indicator */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none flex items-center justify-end pr-2">
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            )}
            
            {/* Scrollable Icon Strip */}
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto hide-scrollbar px-4 pb-6 pt-1 gap-1 snap-x"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveItem(item.id)}
                  className="flex flex-col items-center justify-start gap-1 w-[72px] shrink-0 snap-start"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center relative transition-all duration-200",
                    activeItem === item.id
                      ? "bg-blue-50 text-blue-600"
                      : "bg-transparent text-slate-500 hover:bg-slate-50"
                  )}>
                    <item.icon className={cn(
                      "h-6 w-6 transition-transform",
                      activeItem === item.id ? "scale-110 stroke-[2.5]" : "stroke-[2]"
                    )} />
                    
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] leading-tight text-center px-1 font-medium line-clamp-2",
                    activeItem === item.id ? "text-blue-600" : "text-slate-500"
                  )}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
            
            {/* HomeBase Floating Action Button */}
            <div className="absolute -top-14 right-4 pointer-events-none z-20">
              <button className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center shadow-lg shadow-slate-900/20 pointer-events-auto active:scale-95 transition-transform border-4 border-white">
                <Home className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
          
          {/* Scroll Progress Indicator (subtle) */}
          {scrollRef.current && scrollRef.current.scrollWidth > scrollRef.current.clientWidth && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-400 rounded-full transition-all"
                style={{ 
                  width: `${Math.max(20, (scrollRef.current.clientWidth / scrollRef.current.scrollWidth) * 100)}%`,
                  transform: `translateX(${(scrollRef.current.scrollLeft / (scrollRef.current.scrollWidth - scrollRef.current.clientWidth)) * (100 - Math.max(20, (scrollRef.current.clientWidth / scrollRef.current.scrollWidth) * 100))}%)`
                }}
              />
            </div>
          )}
          
        </div>
      </div>
      
      {/* Hide scrollbar global style */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
}

export default ScrollableDock;
