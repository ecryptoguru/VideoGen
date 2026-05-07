"use client";

import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import {
  Plus, Video, TrendingUp, Palette, Calendar, AlertCircle,
  Music, Image as ImageIcon, Type, Mic, Sparkles,
  ArrowRight, Clock, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Project } from "@/types";

function getPlatformBadge(platform: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    instagram_reels: { label: "Reels", color: "text-pink-700", bg: "bg-pink-50 border-pink-100" },
    linkedin: { label: "LinkedIn", color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
    youtube_shorts: { label: "Shorts", color: "text-red-700", bg: "bg-red-50 border-red-100" },
    youtube_long: { label: "YouTube", color: "text-red-700", bg: "bg-red-50 border-red-100" },
  };
  const s = map[platform] || { label: platform, color: "text-zinc-600", bg: "bg-zinc-50 border-zinc-100" };
  return s;
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    ready:      { label: "Ready",      color: "text-success",  bg: "bg-success/10 border-success/20" },
    generating: { label: "Generating", color: "text-warning",  bg: "bg-warning/10 border-warning/20" },
    published:  { label: "Published",  color: "text-info",     bg: "bg-info/10 border-info/20" },
    draft:      { label: "Draft",      color: "text-zinc-500", bg: "bg-zinc-100 border-zinc-200" },
    processing: { label: "Processing", color: "text-warning",  bg: "bg-warning/10 border-warning/20" },
    failed:     { label: "Failed",     color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
  };
  const s = map[status] || { label: status, color: "text-zinc-500", bg: "bg-zinc-100 border-zinc-200" };
  return s;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero skeleton */}
      <div className="skeleton h-52 w-full rounded-3xl" />

      {/* Stat cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-white border border-border p-5 space-y-3">
            <div className="flex items-center gap-3">
              <SkeletonCard className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <SkeletonCard className="h-6 w-12" />
                <SkeletonCard className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="space-y-4">
        <SkeletonCard className="h-6 w-28" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-border p-4 space-y-3 items-center">
              <SkeletonCard className="h-10 w-10 rounded-xl mx-auto" />
              <SkeletonCard className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Projects skeleton */}
      <div className="space-y-4">
        <SkeletonCard className="h-6 w-36" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <SkeletonCard className="h-5 w-32" />
                  <SkeletonCard className="h-3 w-20" />
                </div>
                <SkeletonCard className="h-6 w-16 rounded-lg" />
              </div>
              <SkeletonCard className="h-5 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    videosThisWeek: 0,
    totalGenerations: 0,
    voiceCount: 0,
    brandConsistency: "0%",
    nextScheduled: "None",
    upcomingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upcomingEvents, setUpcomingEvents] = useState<{ title: string; event_date: string; platform: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [projectsRes, brandKitRes, calendarRes, generationsRes, voicesRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/brand-kit"),
          fetch("/api/calendar"),
          fetch("/api/generations"),
          fetch("/api/voices"),
        ]);

        const projectsData = projectsRes.ok ? await projectsRes.json() : [];
        const brandKitData = brandKitRes.ok ? await brandKitRes.json() : null;
        const calendarData = calendarRes.ok ? await calendarRes.json() : [];
        const generationsData = generationsRes.ok ? await generationsRes.json() : [];
        const voicesData = voicesRes.ok ? await voicesRes.json() : [];

        if (cancelled) return;

        setProjects(projectsData.slice(0, 6));

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const videosThisWeek = projectsData.filter((p: Project) =>
          new Date(p.created_at) > weekAgo
        ).length;

        const brandFields = brandKitData ? [
          brandKitData.brand_name, brandKitData.description, brandKitData.tone_of_voice,
          brandKitData.primary_color, brandKitData.heading_font,
        ].filter(Boolean).length : 0;
        const brandConsistency = Math.round((brandFields / 5) * 100);

        const upcoming = calendarData.filter((e: { event_date: string }) =>
          new Date(e.event_date) > new Date()
        );
        const nextEvent = [...upcoming].sort(
          (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        )[0];

        setUpcomingEvents(upcoming.slice(0, 3));

        setStats({
          totalProjects: projectsData.length,
          videosThisWeek,
          totalGenerations: generationsData.length,
          voiceCount: voicesData.length,
          brandConsistency: `${brandConsistency}%`,
          nextScheduled: nextEvent
            ? new Date(nextEvent.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "None",
          upcomingCount: upcoming.length,
        });
      } catch {
        if (!cancelled) setError("Failed to load dashboard data");
      }
      if (!cancelled) setLoading(false);
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    { label: "Total Projects", value: String(stats.totalProjects), icon: Video, color: "bg-primary/10 text-primary", desc: "All time" },
    { label: "Videos This Week", value: String(stats.videosThisWeek), icon: TrendingUp, color: "bg-success/10 text-success", desc: "Last 7 days" },
    { label: "Brand Consistency", value: stats.brandConsistency, icon: Palette, color: "bg-secondary/10 text-secondary", desc: "Profile complete" },
    { label: "Next Scheduled", value: stats.nextScheduled, icon: Calendar, color: "bg-accent/10 text-accent", desc: `${stats.upcomingCount} upcoming` },
  ];

  const quickActions = [
    { label: "New Video", href: "/create", icon: Video, color: "bg-violet-50 border-violet-100 text-violet-600", hoverBg: "hover:bg-violet-50" },
    { label: "Music Studio", href: "/create/studio/music", icon: Music, color: "bg-pink-50 border-pink-100 text-pink-600", hoverBg: "hover:bg-pink-50" },
    { label: "Image Gen", href: "/create/studio/image", icon: ImageIcon, color: "bg-orange-50 border-orange-100 text-orange-600", hoverBg: "hover:bg-orange-50" },
    { label: "Caption Studio", href: "/create/studio/caption", icon: Type, color: "bg-blue-50 border-blue-100 text-blue-600", hoverBg: "hover:bg-blue-50" },
    { label: "Voice Clone", href: "/create/studio/voice-clone", icon: Mic, color: "bg-emerald-50 border-emerald-100 text-emerald-600", hoverBg: "hover:bg-emerald-50" },
    { label: "Templates", href: "/templates", icon: Sparkles, color: "bg-amber-50 border-amber-100 text-amber-600", hoverBg: "hover:bg-amber-50" },
  ];

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 24 } },
  };

  return (
    <div className="space-y-8">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 via-pink-500 to-orange-400 p-8 text-white lg:p-10"
      >
        {/* Ambient orbs */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm mb-4">
            <Zap className="h-3 w-3" aria-hidden="true" />
            Powered by MiniMax AI
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="text-3xl font-bold tracking-tight lg:text-4xl leading-tight"
          >
            Create Viral Videos{" "}
            <span className="text-white/90">in Minutes</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, type: "spring", stiffness: 200 }}
            className="mt-3.5 text-base text-white/75 max-w-md leading-relaxed"
          >
            Auto-generate stunning videos for Instagram, LinkedIn, and YouTube with AI that understands what works.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, type: "spring", stiffness: 200 }}
            className="mt-7"
          >
            <Link href="/create">
              <button className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-violet-600 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-xl hover:bg-white/95 active:scale-100">
                <Plus className="h-5 w-5" aria-hidden="true" />
                Create New Video
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {statCards.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants} className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", stat.color)}>
                <stat.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.desc}</p>
              </div>
            </div>
            <p className="text-sm font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-heading">Quick Actions</h2>
          <Link href="/create/studio" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
            All studios
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <motion.div
                whileHover={{ y: -4, scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={cn(
                  "action-card border",
                  action.color, action.hoverBg
                )}
              >
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border", action.color)}>
                  <action.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-center leading-snug">{action.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Recent Projects & Upcoming */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Projects */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          className="lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-heading">Recent Projects</h2>
            <Link href="/library" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View all
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-gradient-to-br from-zinc-50 to-zinc-50/50 p-10 text-center">
                <Video className="mx-auto h-10 w-10 text-zinc-300 mb-3" aria-hidden="true" />
                <p className="font-semibold text-foreground mb-1">No projects yet</p>
                <p className="text-sm text-muted-foreground">Create your first video to get started</p>
                <Link href="/create" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New Project
                </Link>
              </div>
            ) : (
              projects.map((project, i) => {
                const plat = getPlatformBadge(project.platform);
                const status = getStatusBadge(project.status);
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 + i * 0.06, type: "spring", stiffness: 260, damping: 22 }}
                  >
                    <Link href={`/projects/${project.id}`} className="project-card">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm leading-snug truncate">{project.name}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            <span className="text-xs text-muted-foreground">{formatDate(project.created_at)}</span>
                          </div>
                        </div>
                        <span className={cn("badge shrink-0 border", status.bg, status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <span className={cn("badge border text-xs", plat.bg, plat.color)}>
                        {plat.label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.section>

        {/* Upcoming */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-heading">Upcoming</h2>
            <Link href="/calendar" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              Calendar
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-zinc-50/70 to-zinc-50/30 p-8 text-center">
                <Calendar className="mx-auto h-9 w-9 text-zinc-300 mb-2.5" aria-hidden="true" />
                <p className="font-semibold text-foreground text-sm">No upcoming posts</p>
                <p className="text-xs text-muted-foreground mt-1">Schedule your next viral moment</p>
              </div>
            ) : (
              upcomingEvents.map((event, i) => (
                <motion.div
                  key={event.title + event.event_date}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.07, type: "spring", stiffness: 260, damping: 22 }}
                  className="event-item"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/15">
                    <Calendar className="h-[18px] w-[18px]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(event.event_date).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                      {event.platform && <span className="ml-1.5 text-muted-foreground/70">· {event.platform}</span>}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
