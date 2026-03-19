import { Link } from "wouter";

export function SiteFooter() {
  return (
    <footer className="mt-12 mx-4 sm:mx-8 mb-4 rounded-2xl bg-zinc-900 dark:bg-zinc-950 p-8 md:p-12">
      <div className="flex flex-col md:flex-row items-start justify-between gap-6 max-w-5xl mx-auto">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <img
              src="/homebaselogoicon_nobg.png"
              alt="HomeBase"
              className="h-6 w-6 invert"
              style={{ objectFit: "contain" }}
            />
            <span className="text-white font-semibold text-sm">HomeBase</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/" className="text-zinc-400 hover:text-white transition-colors">Home</Link>
            <Link href="/marketplace" className="text-zinc-400 hover:text-white transition-colors">Pros</Link>
            <Link href="/calculators" className="text-zinc-400 hover:text-white transition-colors">Calculators</Link>
            <Link href="/top-agents" className="text-zinc-400 hover:text-white transition-colors">Find Agents</Link>
            <Link href="/faq" className="text-zinc-400 hover:text-white transition-colors">FAQ</Link>
            <Link href="/contact" className="text-zinc-400 hover:text-white transition-colors">Contact</Link>
            <Link href="/privacy-policy" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">Terms & Conditions</Link>
          </div>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 text-xs">
            &copy; {new Date().getFullYear()} HomeBase, Inc.
          </p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto mt-8 overflow-hidden">
        <span className="text-[4rem] md:text-[6rem] font-black leading-none tracking-tight text-zinc-800 dark:text-zinc-900 select-none">
          HomeBase
        </span>
      </div>
    </footer>
  );
}
