export function BannerAd() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 flex items-start justify-center">
      <div className="w-full max-w-2xl space-y-5">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Banner Ad — shown at top of pages
        </div>

        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 via-white to-blue-50 dark:from-blue-950/40 dark:via-zinc-900 dark:to-blue-950/40 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
          <div className="flex items-center gap-5 p-4">
            <img
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=200&fit=crop"
              alt="Sunset Properties"
              className="h-20 w-20 rounded-xl object-cover shrink-0 border border-blue-100 dark:border-blue-900 hidden sm:block"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Sponsored</span>
              </div>
              <h3 className="font-bold text-base text-foreground">Sunset Properties — New Listings This Week!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Exclusive waterfront homes starting at $450K. Schedule a tour today and get $500 closing credit.
              </p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-5 rounded-lg transition-colors shrink-0 hidden sm:block">
              Learn More
            </button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-600 to-indigo-600 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider">Ad</span>
                  <h4 className="font-bold text-sm text-white">HomeGuard Insurance — Protect What Matters</h4>
                </div>
                <p className="text-xs text-white/80 mt-0.5">Bundle home + auto and save up to 25%. Get a free quote in 2 minutes.</p>
              </div>
            </div>
            <button className="bg-white text-purple-700 text-xs font-bold py-2 px-4 rounded-lg hover:bg-white/90 transition-colors shrink-0">
              Get Quote
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
          These stretch across the full width at the top of dashboard, search, and listing pages
        </p>
      </div>
    </div>
  );
}
