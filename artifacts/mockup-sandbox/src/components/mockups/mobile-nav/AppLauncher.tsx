import React, { useState } from "react";
import { 
  FileText, Users, MessageSquare, ListTodo, DollarSign, Search, 
  BarChart3, Map, Store, HardHat, Home, Calendar, FolderOpen, 
  Mail, Gift, Bell, MapPin, Target, Calculator, ScanLine, Phone, 
  Settings, User, Moon, LogOut, X, Grid
} from "lucide-react";
import { Input } from "@/components/ui/input";

export function AppLauncher() {
  const [searchQuery, setSearchQuery] = useState("");
  const activePage = "Deals";

  const categories = [
    {
      title: "Core",
      items: [
        { icon: FileText, label: "Deals", id: "Deals" },
        { icon: Users, label: "Clients", id: "Clients" },
        { icon: MessageSquare, label: "Messages", id: "Messages" },
        { icon: ListTodo, label: "Tasks", id: "Tasks" },
      ]
    },
    {
      title: "Business",
      items: [
        { icon: DollarSign, label: "Commissions", id: "Commissions" },
        { icon: Search, label: "Search", id: "Search" },
        { icon: BarChart3, label: "Data", id: "Data" },
        { icon: Map, label: "Map", id: "Map" },
      ]
    },
    {
      title: "Marketing",
      items: [
        { icon: Gift, label: "Referrals", id: "Referrals" },
        { icon: Bell, label: "Drip Campaigns", id: "Drip Campaigns" },
        { icon: MapPin, label: "Lead Gen", id: "Lead Gen", badge: 3 },
        { icon: Target, label: "Lead Metrics", id: "Lead Metrics" },
      ]
    },
    {
      title: "Services",
      items: [
        { icon: Store, label: "HomeBase Pros", id: "HomeBase Pros" },
        { icon: HardHat, label: "My Team", id: "My Team" },
        { icon: Home, label: "MyHome", id: "MyHome" },
      ]
    },
    {
      title: "Tools",
      items: [
        { icon: Calendar, label: "Calendar", id: "Calendar" },
        { icon: FolderOpen, label: "Forms Library", id: "Forms Library" },
        { icon: Mail, label: "Mail", id: "Mail" },
        { icon: Calculator, label: "Calculators", id: "Calculators" },
        { icon: ScanLine, label: "Scanner", id: "Scanner" },
        { icon: Phone, label: "Phone & SMS", id: "Phone & SMS" },
      ]
    },
    {
      title: "Account",
      items: [
        { icon: Settings, label: "Settings", id: "Settings" },
        { icon: User, label: "My Profile", id: "My Profile" },
        { icon: Moon, label: "Dark Mode", id: "Dark Mode" },
        { icon: LogOut, label: "Logout", id: "Logout", color: "text-red-500" },
      ]
    }
  ];

  const bottomNav = [
    { icon: FileText, label: "Deals", id: "Deals" },
    { icon: Users, label: "Clients", id: "Clients" },
    { icon: MessageSquare, label: "Messages", id: "Messages" },
    { icon: ListTodo, label: "Tasks", id: "Tasks" },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-900 p-4 font-sans">
      {/* Mobile Device Frame */}
      <div className="relative w-[390px] h-[844px] bg-white rounded-[40px] shadow-2xl overflow-hidden border-[8px] border-zinc-800">
        
        {/* Fake Page Content behind */}
        <div className="absolute inset-0 bg-slate-50">
          <div className="h-24 bg-blue-600 px-6 pt-12 text-white">
            <h1 className="text-2xl font-bold">Deals</h1>
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-24">
                <div className="h-4 w-1/3 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 w-1/4 bg-slate-100 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Screen Overlay App Launcher */}
        <div className="absolute inset-0 z-40 bg-white/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          {/* Header & Search */}
          <div className="px-5 pt-14 pb-4 sticky top-0 bg-white/50 backdrop-blur-md border-b border-slate-200/50 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">All Apps</h2>
              <button className="h-8 w-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-600 hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a feature..." 
                className="pl-10 bg-white/70 border-slate-200/60 h-11 rounded-xl shadow-sm focus-visible:ring-blue-500"
              />
            </div>
          </div>

          {/* Grid Content */}
          <div className="px-5 py-4 pb-32 h-[calc(100%-140px)] overflow-y-auto hide-scrollbar">
            <div className="space-y-8">
              {categories.map((category, idx) => (
                <div key={idx}>
                  <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-4 px-1">
                    {category.title}
                  </h3>
                  <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                    {category.items.map((item, itemIdx) => {
                      const Icon = item.icon;
                      const isActive = activePage === item.id;
                      
                      return (
                        <div key={itemIdx} className="flex flex-col items-center gap-2 group cursor-pointer">
                          <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-sm transition-all duration-200 ${
                            isActive 
                              ? 'bg-blue-600 text-white shadow-blue-200' 
                              : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}>
                            <Icon size={24} className={item.color || (isActive ? 'text-white' : '')} strokeWidth={isActive ? 2.5 : 2} />
                            
                            {item.badge && (
                              <div className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm">
                                {item.badge}
                              </div>
                            )}
                          </div>
                          <span className={`text-[11px] text-center leading-tight px-1 ${
                            isActive ? 'font-medium text-blue-700' : 'text-slate-600'
                          }`}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-50">
          {/* Blur background for bottom bar only if not fully overlaid, but here the overlay covers the screen so this bar sits on top of the overlay? 
              Actually, the overlay should sit behind the bottom bar, or bottom bar is part of the overall layout.
          */}
          <div className="bg-white/90 backdrop-blur-md border-t border-slate-200/50 pb-safe pt-2 px-2 flex items-center justify-between pb-6">
            
            {/* Left Items */}
            <div className="flex flex-1 justify-around">
              {bottomNav.slice(0, 2).map((item, idx) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button key={idx} className="flex flex-col items-center gap-1 p-2 w-16">
                    <Icon size={22} className={isActive ? 'text-blue-600' : 'text-slate-500'} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Center Logo Button */}
            <div className="relative -top-5 mx-2">
              <button className="h-14 w-14 bg-zinc-900 rounded-full shadow-lg flex items-center justify-center border-4 border-white transform transition hover:scale-105 active:scale-95">
                <House className="text-white" size={24} strokeWidth={2.5} />
              </button>
            </div>

            {/* Right Items */}
            <div className="flex flex-1 justify-around">
              {bottomNav.slice(2, 4).map((item, idx) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button key={idx} className="flex flex-col items-center gap-1 p-2 w-16">
                    <Icon size={22} className={isActive ? 'text-blue-600' : 'text-slate-500'} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>

          </div>
        </div>

      </div>

      <style dangerouslySetContent={{ __html: `
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 24px); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
