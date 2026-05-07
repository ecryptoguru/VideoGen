"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Image, Video, Music, FileText, Mic, AlertCircle,
  Sparkles, LayoutGrid, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Generation } from "@/types";

const typeIcons: Record<string, typeof Image> = {
  image: Image,
  video: Video,
  music: Music,
  text: FileText,
  tts: Mic,
  voice_clone: Mic,
};

const modalityConfig: Record<string, { color: string; bg: string; text: string; border: string }> = {
  image:     { color: "text-pink-600",    bg: "bg-pink-50",     text: "text-pink-600",    border: "border-pink-100" },
  video:     { color: "text-blue-600",    bg: "bg-blue-50",     text: "text-blue-600",    border: "border-blue-100" },
  music:     { color: "text-violet-600",  bg: "bg-violet-50",   text: "text-violet-600",  border: "border-violet-100" },
  text:      { color: "text-red-600",     bg: "bg-red-50",      text: "text-red-600",     border: "border-red-100" },
  tts:       { color: "text-orange-600", bg: "bg-orange-50",   text: "text-orange-600",  border: "border-orange-100" },
  voice_clone:{ color: "text-emerald-600",bg: "bg-emerald-50",  text: "text-emerald-600", border: "border-emerald-100" },
};

const filters = [
  { key: "all",    label: "All",     icon: LayoutGrid },
  { key: "image",  label: "Images",  icon: Image },
  { key: "video",  label: "Videos",  icon: Video },
  { key: "audio",  label: "Audio",   icon: Music },
  { key: "text",   label: "Text",    icon: FileText },
];

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

function LibrarySkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-7 w-36 rounded-lg" />
          <div className="skeleton h-4 w-52 rounded-md" />
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-8 w-16 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-white border border-border overflow-hidden">
            <div className="skeleton h-36 w-full rounded-none" />
            <div className="p-4 space-y-3">
              <div className="skeleton h-4 w-3/4 rounded-md" />
              <div className="skeleton h-3 w-1/2 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string; border: string }> = {
    ready:     { label: "Ready",     color: "text-success",       bg: "bg-success/10",    border: "border-success/20" },
    failed:    { label: "Failed",    color: "text-destructive",  bg: "bg-destructive/10", border: "border-destructive/20" },
    processing:{ label: "Processing", color: "text-warning",       bg: "bg-warning/10",    border: "border-warning/20" },
    pending:   { label: "Pending",   color: "text-muted-foreground", bg: "bg-muted",    border: "border-border" },
  };
  const s = config[status] || config.pending;
  return (
    <span className={cn("badge border text-xs font-medium", s.bg, s.color, s.border)}>
      {s.label}
    </span>
  );
}

export default function Library() {
  const [assets, setAssets] = useState<Generation[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/generations");
        if (!res.ok) throw new Error("Failed to load assets");
        const data = await res.json();
        if (!cancelled) setAssets(data);
      } catch {
        if (!cancelled) setError("Failed to load assets.");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  const filteredAssets = useMemo(() => {
    if (selectedFilter === "all") return assets;
    return assets.filter((a) => {
      if (selectedFilter === "audio") return a.modality === "music" || a.modality === "tts" || a.modality === "voice_clone";
      if (selectedFilter === "image") return a.modality === "image";
      if (selectedFilter === "video") return a.modality === "video";
      if (selectedFilter === "text")  return a.modality === "text";
      return false;
    });
  }, [assets, selectedFilter]);

  if (loading) {
    return <LibrarySkeleton />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError("");
              fetch("/api/generations").then((r) => r.json()).then((d) => { setAssets(d); setLoading(false); }).catch(() => { setError("Failed to load assets."); setLoading(false); });
            }}
            className="rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs font-medium hover:bg-destructive/20 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Asset Library
            <span className="gradient-text ml-1.5 text-lg">|</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {assets.length === 0 ? "No assets yet" : `${assets.length} asset${assets.length !== 1 ? "s" : ""} generated`}
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => {
            const active = selectedFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setSelectedFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "border border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/60"
                )}
                aria-pressed={active}
              >
                <f.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {filteredAssets.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-zinc-50/80 to-zinc-50/40 p-12 text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
              <Sparkles className="h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
            </div>
            <p className="font-semibold text-foreground mb-1">No {selectedFilter === "all" ? "" : selectedFilter} assets yet</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              {selectedFilter === "all"
                ? "Generate your first asset using one of our AI studios"
                : `Switch to a different filter or generate ${selectedFilter} assets`}
            </p>
            <Link
              href="/create/studio"
              className="inline-flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/20 transition-colors border border-primary/20"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Open Studio
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredAssets.map((asset, i) => {
              const Icon = typeIcons[asset.modality] || FileText;
              const cfg = modalityConfig[asset.modality] || modalityConfig.text;
              return (
                <motion.button
                  key={asset.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 260, damping: 22 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="group text-left rounded-2xl bg-white border border-border overflow-hidden card card-hover"
                  aria-label={`View asset ${asset.model || asset.prompt?.slice(0, 30)}`}
                >
                  {/* Asset preview area */}
                  <div className={cn("relative flex h-36 items-center justify-center overflow-hidden", cfg.bg)}>
                    <Icon className={cn("h-12 w-12 transition-transform duration-300 group-hover:scale-110", cfg.color)} aria-hidden="true" />
                    {/* Status overlay */}
                    {asset.status && (
                      <div className="absolute top-2.5 right-2.5">
                        <StatusBadge status={asset.status} />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
                  </div>

                  {/* Asset info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground leading-tight line-clamp-1 flex-1">
                        {asset.prompt?.slice(0, 48) || asset.model || "Untitled asset"}
                      </p>
                      <span className={cn("badge border shrink-0 text-xs capitalize", cfg.bg, cfg.color, cfg.border)}>
                        {asset.modality?.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{formatDate(asset.created_at)}</p>
                      {asset.model && (
                        <p className="text-xs text-muted-foreground/70 font-mono truncate max-w-[120px]">{asset.model}</p>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
