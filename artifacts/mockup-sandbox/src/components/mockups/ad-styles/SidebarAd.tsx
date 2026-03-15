export function SidebarAd() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 flex items-start justify-center">
      <div className="w-full max-w-[280px] space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Sidebar Ad — shown in page sidebars
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=200&fit=crop"
              alt="Dream Homes Realty"
              className="w-full h-32 object-cover"
            />
            <div className="absolute top-2 left-2">
              <span className="bg-blue-600 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                Ad
              </span>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <h4 className="font-bold text-sm text-foreground">Dream Homes Realty</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Looking for your dream home? Our agents have 20+ years of local market expertise.
            </p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors">
              Visit Website →
            </button>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-semibold text-blue-600 uppercase tracking-wider">Sponsored</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">First National Lending</h4>
                <p className="text-xs text-muted-foreground">Rates as low as 5.99% APR</p>
              </div>
            </div>
            <button className="w-full border border-blue-200 dark:border-blue-800 text-blue-600 text-xs font-semibold py-2 px-4 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
              Get Pre-Approved
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
          These appear in page sidebars and detail views
        </p>
      </div>
    </div>
  );
}
