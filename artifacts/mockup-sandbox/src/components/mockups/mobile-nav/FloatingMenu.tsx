import React, { useState } from "react";
import {
  FileText,
  Users,
  MessageSquare,
  ListTodo,
  DollarSign,
  Search,
  BarChart3,
  Map as MapIcon,
  Store,
  HardHat,
  Home,
  Calendar,
  FolderOpen,
  Mail,
  Gift,
  Bell,
  MapPin,
  Target,
  Calculator,
  ScanLine,
  Phone,
  Settings,
  Menu,
  X,
  User,
  Moon,
  LogOut,
  Check,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const navItems = [
  { icon: FileText, label: "Deals", id: "deals" },
  { icon: Users, label: "Clients", id: "clients" },
  { icon: MessageSquare, label: "Messages", id: "messages" },
  { icon: ListTodo, label: "Tasks", id: "tasks" },
  { icon: DollarSign, label: "Commissions", id: "commissions" },
  { icon: Search, label: "Search", id: "search" },
  { icon: BarChart3, label: "Data", id: "data" },
  { icon: MapIcon, label: "Map", id: "map" },
  { icon: Store, label: "HomeBase Pros", id: "homebase-pros" },
  { icon: HardHat, label: "My Team", id: "my-team" },
  { icon: Home, label: "MyHome", id: "myhome" },
  { icon: Calendar, label: "Calendar", id: "calendar" },
  { icon: FolderOpen, label: "Forms Library", id: "forms" },
  { icon: Mail, label: "Mail", id: "mail" },
  { icon: Gift, label: "Referrals", id: "referrals" },
  { icon: Bell, label: "Drip Campaigns", id: "drip" },
  { icon: MapPin, label: "Lead Gen", id: "lead-gen", badge: 3 },
  { icon: Target, label: "Lead Metrics", id: "lead-metrics" },
  { icon: Calculator, label: "Calculators", id: "calculators" },
  { icon: ScanLine, label: "Scanner", id: "scanner" },
  { icon: Phone, label: "Phone & SMS", id: "phone" },
  { icon: Settings, label: "Settings", id: "settings" },
];

const quickAccessIds = ["deals", "clients", "messages", "tasks", "homebase-pros"];

export function FloatingMenu() {
  // Hard constraint: Show expanded/open state by default
  const [isOpen, setIsOpen] = useState(true);
  const [activeItem, setActiveItem] = useState("deals");
  const [searchQuery, setSearchQuery] = useState("");

  const quickAccessItems = navItems.filter((item) => quickAccessIds.includes(item.id));
  
  const filteredItems = navItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 p-4">
      {/* Phone Frame */}
      <div className="relative w-[390px] h-[844px] bg-white rounded-[40px] shadow-2xl overflow-hidden ring-8 ring-neutral-900 flex flex-col">
        {/* Status Bar Mock */}
        <div className="absolute top-0 w-full h-12 z-50 flex justify-between items-center px-6 pt-2 pointer-events-none">
          <span className="text-sm font-semibold">9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-4 h-4 rounded-full bg-neutral-900" />
            <div className="w-4 h-4 rounded-full bg-neutral-900" />
            <div className="w-6 h-3 rounded bg-neutral-900" />
          </div>
        </div>

        {/* Dummy Page Content */}
        <div className="flex-1 bg-zinc-50 overflow-y-auto pb-24 pt-16 px-5 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100">
              <p className="text-sm text-neutral-500 font-medium">Active Deals</p>
              <p className="text-2xl font-bold mt-1">12</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100">
              <p className="text-sm text-neutral-500 font-medium">Volume</p>
              <p className="text-2xl font-bold mt-1">$4.2M</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex items-center gap-4">
                <div className="h-12 w-12 bg-neutral-100 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-neutral-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">123 Main St</h3>
                  <p className="text-sm text-neutral-500">Inspection scheduled</p>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-300" />
              </div>
            ))}
          </div>
        </div>

        {/* FAB Menu Overlay */}
        {isOpen && (
          <div className="absolute inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] h-[85%] flex flex-col shadow-2xl transition-transform transform translate-y-0">
              
              {/* Drag handle */}
              <div className="w-full flex justify-center py-3" onClick={() => setIsOpen(false)}>
                <div className="w-12 h-1.5 bg-neutral-200 rounded-full" />
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto px-5 pb-24">
                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <Input 
                    placeholder="Find anything..." 
                    className="pl-11 bg-neutral-100 border-none rounded-2xl h-12 text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {!searchQuery && (
                  <>
                    <h3 className="text-sm font-bold text-neutral-900 mb-3 px-1 tracking-wide uppercase">Quick Access</h3>
                    <div className="flex gap-3 mb-8 overflow-x-auto pb-2 hide-scrollbar">
                      {quickAccessItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeItem === item.id;
                        return (
                          <button
                            key={`qa-${item.id}`}
                            onClick={() => { setActiveItem(item.id); setIsOpen(false); }}
                            className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl min-w-[80px] transition-colors ${
                              isActive ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                            }`}
                          >
                            <Icon className={`w-7 h-7 ${isActive ? "text-white" : "text-neutral-700"}`} />
                            <span className="text-[11px] font-medium leading-tight text-center">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                <h3 className="text-sm font-bold text-neutral-900 mb-3 px-1 tracking-wide uppercase">All Features</h3>
                <div className="grid grid-cols-4 gap-x-2 gap-y-6">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveItem(item.id); setIsOpen(false); }}
                        className="relative flex flex-col items-center gap-2 group"
                      >
                        <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all ${
                          isActive 
                            ? "bg-blue-50 text-blue-600 ring-2 ring-blue-600 ring-offset-2" 
                            : "bg-white text-neutral-600 shadow-sm border border-neutral-100 group-hover:bg-neutral-50"
                        }`}>
                          <Icon className={`w-6 h-6 ${isActive ? "text-blue-600" : "text-neutral-500"}`} />
                          
                          {item.badge && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                              {item.badge}
                            </div>
                          )}
                          
                          {isActive && (
                            <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center border-2 border-white">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] text-center leading-tight font-medium ${isActive ? "text-blue-600" : "text-neutral-600"}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User Bar inside Menu */}
              <div className="border-t border-neutral-100 p-4 bg-neutral-50/80 backdrop-blur-md rounded-b-[32px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                    JD
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 leading-tight">Jane Doe</p>
                    <p className="text-xs text-neutral-500">Agent</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 shadow-sm">
                    <Moon className="w-4 h-4" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-red-500 shadow-sm">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95 ${
            isOpen ? "bg-neutral-800 text-white" : "bg-blue-600 text-white"
          }`}
        >
          {isOpen ? (
            <X className="w-8 h-8" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Home className="w-7 h-7" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-blue-600 rounded-full" />
            </div>
          )}
        </button>

      </div>
    </div>
  );
}
