import React, { useState } from "react";
import {
  FileText, Users, MessageSquare, ListTodo, DollarSign, Search, BarChart3,
  Map, Store, HardHat, Home, Calendar, FolderOpen, Mail, Gift, Bell,
  MapPin, Target, Calculator, ScanLine, Phone, Settings,
  LogOut, Moon, Sun, ChevronDown, ChevronRight, Menu, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";

const NAV_CATEGORIES = [
  {
    title: "Transactions",
    items: [
      { icon: FileText, label: "Deals" },
      { icon: Users, label: "Clients" },
      { icon: ListTodo, label: "Tasks" },
    ]
  },
  {
    title: "Communication",
    items: [
      { icon: MessageSquare, label: "Messages" },
      { icon: Mail, label: "Mail" },
      { icon: Phone, label: "Phone & SMS" },
    ]
  },
  {
    title: "Analytics",
    items: [
      { icon: BarChart3, label: "Data" },
      { icon: Map, label: "Map" },
      { icon: DollarSign, label: "Commissions" },
      { icon: Target, label: "Lead Metrics" },
    ]
  },
  {
    title: "Marketing",
    items: [
      { icon: Gift, label: "Referrals" },
      { icon: Bell, label: "Drip Campaigns" },
      { icon: MapPin, label: "Lead Gen", badge: 3 },
    ]
  },
  {
    title: "Services",
    items: [
      { icon: Store, label: "HomeBase Pros" },
      { icon: HardHat, label: "My Team" },
      { icon: Home, label: "MyHome" },
      { icon: FolderOpen, label: "Forms Library" },
    ]
  },
  {
    title: "Tools",
    items: [
      { icon: Search, label: "Search" },
      { icon: Calendar, label: "Calendar" },
      { icon: Calculator, label: "Calculators" },
      { icon: ScanLine, label: "Scanner" },
    ]
  }
];

export function SideDrawer() {
  const [activeItem, setActiveItem] = useState("Deals");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    Transactions: true,
    Communication: false,
    Analytics: false,
    Marketing: true,
    Services: false,
    Tools: false,
  });
  const [isDark, setIsDark] = useState(false);

  const toggleCategory = (title: string) => {
    setOpenCategories(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 p-4 font-sans">
      {/* Mobile Frame */}
      <div className="relative w-[390px] h-[844px] bg-white rounded-[40px] shadow-2xl overflow-hidden border-[8px] border-zinc-800">
        
        {/* Mock App Content (Behind Drawer) */}
        <div className="absolute inset-0 flex flex-col bg-zinc-50">
          <header className="h-16 bg-white border-b flex items-center px-4 justify-between">
            <button className="p-2 -ml-2 rounded-full hover:bg-neutral-100">
              <Menu className="w-6 h-6 text-zinc-700" />
            </button>
            <div className="font-semibold text-lg flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              HomeBase
            </div>
            <div className="w-10" />
          </header>
          <div className="flex-1 p-6">
            <div className="h-32 bg-white rounded-xl border border-zinc-200 shadow-sm mb-4 p-4 flex flex-col justify-end">
              <div className="w-1/2 h-4 bg-zinc-100 rounded mb-2"></div>
              <div className="w-1/3 h-6 bg-zinc-200 rounded"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-white rounded-xl border border-zinc-200 shadow-sm" />
              <div className="h-24 bg-white rounded-xl border border-zinc-200 shadow-sm" />
              <div className="h-24 bg-white rounded-xl border border-zinc-200 shadow-sm" />
              <div className="h-24 bg-white rounded-xl border border-zinc-200 shadow-sm" />
            </div>
          </div>
          
          {/* Mock Bottom Bar (Visible under scrim) */}
          <div className="h-20 bg-white border-t flex items-center justify-around pb-4 px-2">
            <div className="flex flex-col items-center text-blue-600 pt-2">
              <Menu className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">Menu</span>
            </div>
            <div className="flex flex-col items-center text-zinc-400 pt-2">
              <MessageSquare className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Messages</span>
            </div>
            <div className="flex flex-col items-center text-zinc-400 pt-2">
              <Search className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Search</span>
            </div>
            <div className="flex flex-col items-center text-zinc-400 pt-2">
              <User className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Profile</span>
            </div>
          </div>
        </div>

        {/* Scrim */}
        <div className="absolute inset-0 bg-black/40 z-40 backdrop-blur-[1px]" />

        {/* Side Drawer */}
        <div className="absolute inset-y-0 left-0 w-[85%] bg-white z-50 flex flex-col shadow-2xl border-r border-zinc-200/50">
          
          {/* Drawer Header (Profile) */}
          <div className="p-6 bg-zinc-900 text-white flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <Avatar className="w-14 h-14 border-2 border-white/20 shadow-sm">
                <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
                <AvatarFallback className="bg-zinc-800 text-white">JD</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-lg leading-tight tracking-tight">Jane Doe</span>
                <span className="text-zinc-400 text-sm font-medium">Real Estate Agent</span>
              </div>
            </div>
            
            <button 
              onClick={() => setActiveItem("My Profile")}
              className={cn(
                "flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 -ml-3 transition-colors",
                activeItem === "My Profile" ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <User className="w-4 h-4" />
              <span>View Profile</span>
            </button>
          </div>

          {/* Scrollable Navigation */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-4 bg-zinc-50/50">
            {NAV_CATEGORIES.map((category) => (
              <div key={category.title} className="mb-1">
                <button
                  onClick={() => toggleCategory(category.title)}
                  className="w-full flex items-center justify-between px-6 py-2.5 text-[11px] font-bold tracking-wider uppercase text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  {category.title}
                  {openCategories[category.title] ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                  )}
                </button>
                
                <div 
                  className={cn(
                    "overflow-hidden transition-all duration-200 ease-in-out",
                    openCategories[category.title] ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="mb-2">
                    {category.items.map((item) => {
                      const isActive = activeItem === item.label;
                      return (
                        <button
                          key={item.label}
                          onClick={() => setActiveItem(item.label)}
                          className={cn(
                            "w-full flex items-center justify-between px-6 py-3 transition-colors relative group",
                            isActive 
                              ? "bg-blue-50/80 text-blue-700" 
                              : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-r-full shadow-[2px_0_8px_rgba(37,99,235,0.4)]" />
                          )}
                          <div className="flex items-center gap-3.5">
                            <item.icon 
                              className={cn(
                                "w-5 h-5 transition-colors", 
                                isActive ? "text-blue-600" : "text-zinc-400 group-hover:text-zinc-600"
                              )} 
                              strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className={cn(
                              "text-sm tracking-tight",
                              isActive ? "font-semibold" : "font-medium"
                            )}>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="h-px bg-zinc-200 my-4 mx-6" />
            
            <button
              onClick={() => setActiveItem("Settings")}
              className={cn(
                "w-full flex items-center justify-between px-6 py-3 transition-colors relative group mb-2",
                activeItem === "Settings"
                  ? "bg-blue-50/80 text-blue-700" 
                  : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
              )}
            >
              {activeItem === "Settings" && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-r-full shadow-[2px_0_8px_rgba(37,99,235,0.4)]" />
              )}
              <div className="flex items-center gap-3.5">
                <Settings 
                  className={cn(
                    "w-5 h-5 transition-colors", 
                    activeItem === "Settings" ? "text-blue-600" : "text-zinc-400 group-hover:text-zinc-600"
                  )} 
                  strokeWidth={activeItem === "Settings" ? 2.5 : 2}
                />
                <span className={cn(
                  "text-sm tracking-tight",
                  activeItem === "Settings" ? "font-semibold" : "font-medium"
                )}>Settings</span>
              </div>
            </button>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-zinc-200 bg-white flex flex-col gap-1.5 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700">
                {isDark ? (
                  <Moon className="w-5 h-5 text-zinc-500" strokeWidth={2} />
                ) : (
                  <Sun className="w-5 h-5 text-zinc-500" strokeWidth={2} />
                )}
                <span className="text-sm font-medium">Dark Mode</span>
              </div>
              <Switch checked={isDark} onCheckedChange={setIsDark} />
            </div>
            
            <button className="flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors group">
              <LogOut className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
              <span className="text-sm font-semibold">Log out</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
