"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const publicLinks = [
  { href: "/",      label: "Übersicht" },
  { href: "/h2h",   label: "H2H" },
  { href: "/stats", label: "Statistiken" },
];

const adminLinks = [
  { href: "/aliases", label: "Aliase" },
  { href: "/import",  label: "Import" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open,    setOpen]    = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const links = isAdmin ? [...publicLinks, ...adminLinks] : publicLinks;

  return (
    <header className="bg-[#006B5E] text-white shadow-md">
      <div className="container mx-auto max-w-6xl px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="text-2xl">🥏</span>
          <span>DFV Statistiken</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-white/20 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin ? (
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Login
            </Link>
          )}
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Menü"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile Dropdown */}
      {open && (
        <nav className="md:hidden border-t border-white/20 px-4 pb-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 mt-1 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin ? (
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              className="block w-full text-left px-3 py-2 mt-1 rounded-lg text-sm text-white/60 hover:bg-white/10 transition-colors"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 mt-1 rounded-lg text-sm text-white/60 hover:bg-white/10 transition-colors"
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
