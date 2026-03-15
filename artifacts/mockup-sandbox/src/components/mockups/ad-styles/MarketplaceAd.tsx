export function MarketplaceAd() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 flex items-start justify-center">
      <div className="w-full max-w-md space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Marketplace Ad — shown in HomeBase Pros
        </div>
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="p-4 flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=120&h=120&fit=crop"
              alt="Elite Plumbing"
              className="h-16 w-16 rounded-lg object-cover shrink-0 border border-blue-100 dark:border-blue-900"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Sponsored</span>
              </div>
              <h4 className="font-semibold text-sm text-foreground truncate">Elite Plumbing & Drain Co.</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                24/7 emergency service. Licensed & insured. Serving Austin metro area for 15+ years.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className={`h-3 w-3 ${i <= 4 ? 'text-yellow-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">4.8 (127 reviews)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="p-4 flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=120&h=120&fit=crop"
              alt="Green Thumb Landscaping"
              className="h-16 w-16 rounded-lg object-cover shrink-0 border border-blue-100 dark:border-blue-900"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Sponsored</span>
              </div>
              <h4 className="font-semibold text-sm text-foreground truncate">Green Thumb Landscaping</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                Full-service lawn care, design & irrigation. Free estimates for new customers.
              </p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
          These appear at the top of the HomeBase Pros marketplace page
        </p>
      </div>
    </div>
  );
}
