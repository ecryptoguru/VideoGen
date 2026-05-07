"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  PlusCircle,
  Palette,
  Video,
  Calendar,
  Settings,
  Library,
  LayoutTemplate,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/create", icon: PlusCircle, label: "Create Video" },
  { href: "/create/studio", icon: Sparkles, label: "Studio" },
  { href: "/brand-kit", icon: Palette, label: "Brand Kit" },
  { href: "/library", icon: Library, label: "Library" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/templates", icon: LayoutTemplate, label: "Templates" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: mobileOpen ? 0 : -260 }}
        transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.8 }}
        className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col lg:static"
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={() => setMobileOpen(false)}
          >
            <div className="gradient-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-md">
              <Video className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-bold gradient-text tracking-tight">VideoGen</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn("nav-item", isActive && "active")}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                    isActive ? "text-primary" : "text-current"
                  )}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div className="border-t border-border/60 p-4">
          <div className="rounded-xl border border-border/80 bg-gradient-to-br from-violet-50/60 to-pink-50/40 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-xs font-semibold text-foreground">MiniMax API</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">All systems operational</p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="flex h-14 items-center gap-3 border-b border-border/60 bg-white/80 backdrop-blur-md px-4 lg:hidden sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="gradient-primary flex h-7 w-7 items-center justify-center rounded-lg">
              <Video className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <span className="text-base font-bold gradient-text">VideoGen</span>
          </Link>
        </div>
        <div className="mx-auto max-w-7xl p-5 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
