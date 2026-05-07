"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrendItem, TrendPlatform, Competitor, ViralVideo } from "@/types";
import {
  InstagramIcon, LinkedInIcon, YouTubeIcon,
  TrendIcon, HashtagIcon, LightbulbIcon, LayoutIcon, TypeIcon, UsersIcon,
  EyeIcon, ThumbsUpIcon, MessageCircleIcon, BarChartIcon,
  PlusIcon, TrashIcon, EditIcon, AlertIcon, CheckIcon,
} from "@/components/icons/PlatformIcons";

function copyToClipboard(text: string): boolean {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    document.body.removeChild(ta);
    return false;
  }
}

const CATEGORIES: { id: string; label: string; icon: typeof HashtagIcon; desc: string }[] = [
  { id: "hashtag", label: "Hashtags", icon: HashtagIcon, desc: "Trending & emerging" },
  { id: "topic", label: "Topics", icon: LightbulbIcon, desc: "Content themes" },
  { id: "format", label: "Formats", icon: LayoutIcon, desc: "Video structures" },
  { id: "caption_style", label: "Hooks", icon: TypeIcon, desc: "Caption styles" },
];

const PLATFORMS: { id: TrendPlatform; label: string; icon: typeof InstagramIcon }[] = [
  { id: "instagram", label: "Instagram", icon: InstagramIcon },
  { id: "linkedin", label: "LinkedIn", icon: LinkedInIcon },
  { id: "youtube", label: "YouTube", icon: YouTubeIcon },
];

function TrendCard({ trend, onUse, copied }: { trend: TrendItem; onUse?: (t: TrendItem) => void; copied?: boolean }) {
  const volumePct = Math.min((trend.volume_score / 10000) * 100, 100);
  const velocityPct = Math.min((trend.velocity_score / 8000) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">
            {trend.hashtag || trend.trend_text}
          </p>
          {trend.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{trend.description}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            trend.velocity_score >= 7000 ? "bg-success/10 text-success" :
            trend.velocity_score >= 5000 ? "bg-warning/10 text-warning" :
            "bg-muted text-muted-foreground"
          )}>
            {Math.round(trend.velocity_score / 100)}% viral
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="flex justify-between text-muted-foreground mb-1">
            <span>Volume</span>
            <span>{Math.round(trend.volume_score / 100)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${volumePct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-muted-foreground mb-1">
            <span>Velocity</span>
            <span>{Math.round(trend.velocity_score / 100)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${velocityPct}%` }} />
          </div>
        </div>
      </div>

      {trend.example_posts && (
        <div className="rounded-lg bg-muted/50 p-2 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Examples</p>
          {trend.example_posts.split("|").slice(0, 2).map((ex, i) => (
            <p key={i} className="text-xs text-muted-foreground italic">&ldquo;{ex}&rdquo;</p>
          ))}
        </div>
      )}

      {onUse && (
        <button
          type="button"
          onClick={() => onUse(trend)}
          className={cn(
            "w-full rounded-xl border px-3 py-1.5 text-xs font-medium transition-all flex items-center justify-center gap-1.5",
            copied
              ? "border-success/20 bg-success/10 text-success"
              : "border-border bg-muted/50 hover:bg-muted"
          )}
        >
          {copied ? (
            <>
              <CheckIcon className="h-3 w-3" aria-hidden="true" />
              Copied!
            </>
          ) : "Use This Trend"}
        </button>
      )}
    </motion.div>
  );
}

function CompetitorCard({ competitor, onEdit, onDelete }: { competitor: Competitor; onEdit: (c: Competitor) => void; onDelete: (id: number) => void }) {
  const PlatformIcon = PLATFORMS.find(p => p.id === competitor.platform)?.icon || UsersIcon;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            competitor.platform === "instagram" ? "bg-pink-100 text-pink-600" :
            competitor.platform === "linkedin" ? "bg-blue-100 text-blue-600" :
            "bg-red-100 text-red-600"
          )}>
            <PlatformIcon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-sm">{competitor.name}</p>
            {competitor.handle && (
              <p className="text-xs text-muted-foreground">@{competitor.handle}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => onEdit(competitor)} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Edit competitor">
            <EditIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => competitor.id && onDelete(competitor.id)} className="rounded-lg p-1.5 hover:bg-destructive/10" aria-label="Delete competitor">
            <TrashIcon className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
          </button>
        </div>
      </div>

      {competitor.niche && (
        <p className="mt-2 text-xs text-muted-foreground">{competitor.niche}</p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-sm font-bold">{competitor.followers >= 1000 ? `${(competitor.followers / 1000).toFixed(0)}K` : competitor.followers}</p>
          <p className="text-xs text-muted-foreground">Followers</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-sm font-bold">{competitor.avg_engagement}%</p>
          <p className="text-xs text-muted-foreground">Engagement</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-sm font-bold">{competitor.avg_views >= 1000 ? `${(competitor.avg_views / 1000).toFixed(0)}K` : competitor.avg_views}</p>
          <p className="text-xs text-muted-foreground">Avg Views</p>
        </div>
      </div>

      {competitor.content_themes && (
        <div className="mt-3 flex flex-wrap gap-1">
          {competitor.content_themes.split(",").slice(0, 3).map((theme, i) => (
            <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">{theme.trim()}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ViralVideoCard({ video }: { video: ViralVideo }) {
  const engagementColor = video.engagement_rate >= 5 ? "text-success" :
    video.engagement_rate >= 2 ? "text-warning" : "text-muted-foreground";

  return (
    <div className="card p-3">
      {video.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnail_url} alt={video.video_title} className="w-full aspect-video rounded-lg object-cover" />
      )}
      <div className="mt-2">
        <p className="text-sm font-medium line-clamp-2">{video.video_title}</p>
        {video.creator_name && (
          <p className="mt-1 text-xs text-muted-foreground">by {video.creator_name}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><EyeIcon className="h-3 w-3" />{video.views >= 1000 ? `${(video.views / 1000).toFixed(0)}K` : video.views}</span>
          <span className="flex items-center gap-1"><ThumbsUpIcon className="h-3 w-3" />{video.likes >= 1000 ? `${(video.likes / 1000).toFixed(1)}K` : video.likes}</span>
          <span className="flex items-center gap-1"><MessageCircleIcon className="h-3 w-3" />{video.comments >= 1000 ? `${(video.comments / 1000).toFixed(1)}K` : video.comments}</span>
          <span className={cn("flex items-center gap-1 font-medium", engagementColor)}>
            <BarChartIcon className="h-3 w-3" />{video.engagement_rate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function AddCompetitorModal({ onClose, onSave, initial }: { onClose: () => void; onSave: (c: Partial<Competitor>) => void; initial?: Competitor }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    platform: initial?.platform || "instagram",
    handle: initial?.handle || "",
    niche: initial?.niche || "",
    followers: initial?.followers || 0,
    avg_engagement: initial?.avg_engagement || 0,
    avg_views: initial?.avg_views || 0,
    posting_frequency: initial?.posting_frequency || "",
    content_themes: initial?.content_themes || "",
    description: initial?.description || "",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">{initial ? "Edit Competitor" : "Add Competitor"}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="comp-name" className="label">Name *</label>
            <input id="comp-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Competitor name" />
          </div>
          <div>
            <label htmlFor="comp-platform" className="label">Platform *</label>
            <select id="comp-platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as TrendPlatform })} className="input">
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div>
            <label htmlFor="comp-niche" className="label">Niche / Industry</label>
            <input id="comp-niche" type="text" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} className="input" placeholder="e.g., B2B SaaS" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="comp-followers" className="label">Followers</label>
              <input id="comp-followers" type="number" value={form.followers} onChange={(e) => setForm({ ...form, followers: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label htmlFor="comp-engagement" className="label">Engagement %</label>
              <input id="comp-engagement" type="number" step="0.1" value={form.avg_engagement} onChange={(e) => setForm({ ...form, avg_engagement: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label htmlFor="comp-views" className="label">Avg Views</label>
              <input id="comp-views" type="number" value={form.avg_views} onChange={(e) => setForm({ ...form, avg_views: Number(e.target.value) })} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="comp-themes" className="label">Content Themes</label>
            <input id="comp-themes" type="text" value={form.content_themes} onChange={(e) => setForm({ ...form, content_themes: e.target.value })} className="input" placeholder="Comma-separated" />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="button" onClick={() => onSave(form)} disabled={!form.name} className="btn-gradient flex-1 disabled:opacity-50">Save</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddViralVideoModal({ onClose, onSave }: { onClose: () => void; onSave: (v: Partial<ViralVideo>) => void }) {
  const [form, setForm] = useState<{ platform: TrendPlatform; video_title: string; video_url: string; thumbnail_url: string; creator_name: string; creator_handle: string; views: number; likes: number; comments: number; shares: number; notes: string }>({
    platform: "instagram",
    video_title: "",
    video_url: "",
    thumbnail_url: "",
    creator_name: "",
    creator_handle: "",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    notes: "",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">Add Viral Video</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="vv-platform" className="label">Platform *</label>
            <select id="vv-platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as TrendPlatform })} className="input">
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div>
            <label htmlFor="vv-title" className="label">Video Title *</label>
            <input id="vv-title" type="text" value={form.video_title} onChange={(e) => setForm({ ...form, video_title: e.target.value })} className="input" placeholder="Viral video title or hook" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label htmlFor="vv-views" className="label">Views</label>
              <input id="vv-views" type="number" value={form.views} onChange={(e) => setForm({ ...form, views: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label htmlFor="vv-likes" className="label">Likes</label>
              <input id="vv-likes" type="number" value={form.likes} onChange={(e) => setForm({ ...form, likes: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label htmlFor="vv-comments" className="label">Comments</label>
              <input id="vv-comments" type="number" value={form.comments} onChange={(e) => setForm({ ...form, comments: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label htmlFor="vv-shares" className="label">Shares</label>
              <input id="vv-shares" type="number" value={form.shares} onChange={(e) => setForm({ ...form, shares: Number(e.target.value) })} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="vv-creator" className="label">Creator Name</label>
            <input id="vv-creator" type="text" value={form.creator_name} onChange={(e) => setForm({ ...form, creator_name: e.target.value })} className="input" />
          </div>
          <div>
            <label htmlFor="vv-notes" className="label">Notes / Why it went viral</label>
            <textarea id="vv-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={2} placeholder="What made this video go viral?" />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="button" onClick={() => onSave(form)} disabled={!form.video_title} className="btn-gradient flex-1 disabled:opacity-50">Add Video</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TrendsPage() {
  const [platform, setPlatform] = useState<TrendPlatform>("instagram");
  const [category, setCategory] = useState("hashtag");
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [viralVideos, setViralVideos] = useState<ViralVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"trends" | "viral" | "competitors">("trends");
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | undefined>();
  const [showViralModal, setShowViralModal] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchTrends = useCallback(async (refresh = false) => {
    if (!refresh) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ platform, category });
      if (refresh) params.set("refresh", "true");
      const res = await fetch(`/api/trends?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTrends(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load trends. Please try again.");
      setTrends([]);
    }
    setLoading(false);
  }, [platform, category]);

  const fetchCompetitors = useCallback(async () => {
    try {
      const res = await fetch("/api/competitors");
      if (res.ok) {
        const data = await res.json();
        setCompetitors(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchViralVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/viral");
      if (res.ok) {
        const data = await res.json();
        setViralVideos(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    fetchTrends();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchTrends]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    fetchCompetitors();
    fetchViralVideos();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchCompetitors, fetchViralVideos]);

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    if (!error) return;
    errorTimerRef.current = setTimeout(() => {
      if (errorTimerRef.current) {
        setError("");
        errorTimerRef.current = null;
      }
    }, 5000);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrends(true);
    setRefreshing(false);
  };

  const handleSaveCompetitor = async (data: Partial<Competitor>) => {
    const method = editingCompetitor ? "PUT" : "POST";
    const body = editingCompetitor ? { id: editingCompetitor.id, ...data } : data;
    const res = await fetch("/api/competitors", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await fetchCompetitors();
      setShowCompetitorModal(false);
      setEditingCompetitor(undefined);
    }
  };

  const handleDeleteCompetitor = async (id: number) => {
    const res = await fetch(`/api/competitors?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleSaveViralVideo = async (data: Partial<ViralVideo>) => {
    const res = await fetch("/api/viral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await fetchViralVideos();
      setShowViralModal(false);
    }
  };

  const handleDeleteViralVideo = async (id: number) => {
    const res = await fetch(`/api/viral?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setViralVideos((prev) => prev.filter((v) => v.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trend & Competitive Research</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Discover trending content and track competitors</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-gradient flex items-center gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" />
          {refreshing ? "Refreshing..." : "Refresh Trends"}
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </motion.div>
      )}

      <div className="flex gap-2 border-b border-border">
        {([["trends", "Trends"], ["viral", "Viral Videos"], ["competitors", "Competitors"]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {activeTab === id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" transition={{ type: "spring", stiffness: 320, damping: 30 }} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "trends" && (
          <motion.div
            key="trends"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                      platform === p.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      category === cat.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="spinner spinner-dark" aria-hidden="true" />
              </div>
            ) : trends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border">
                <TrendIcon className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                <p className="mt-3 font-medium">No trends found</p>
                <p className="text-sm text-muted-foreground">Click &ldquo;Refresh Trends&rdquo; to discover trending content</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trends.map((trend) => (
                  <TrendCard key={trend.id} trend={trend} onUse={(t) => {
                    copyToClipboard(t.hashtag || t.trend_text);
                    if (trend.id) {
                      setCopiedId(trend.id);
                      setTimeout(() => setCopiedId(null), 1500);
                    }
                  }} copied={copiedId === trend.id} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "viral" && (
          <motion.div
            key="viral"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Top performing videos by engagement rate</p>
              <button type="button" onClick={() => setShowViralModal(true)} className="btn-gradient flex items-center gap-1.5 text-sm">
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Add Video
              </button>
            </div>

            {viralVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border">
                <TrendIcon className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                <p className="mt-3 font-medium">No viral videos tracked</p>
                <p className="text-sm text-muted-foreground">Add videos that performed well to study their patterns</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {viralVideos.map((video) => (
                  <div key={video.id} className="relative group">
                    <ViralVideoCard video={video} />
                    {video.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteViralVideo(video.id!)}
                        className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete video"
                      >
                        <TrashIcon className="h-3 w-3 text-white" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "competitors" && (
          <motion.div
            key="competitors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Track your competitors across platforms</p>
              <button
                type="button"
                onClick={() => { setEditingCompetitor(undefined); setShowCompetitorModal(true); }}
                className="btn-gradient flex items-center gap-1.5 text-sm"
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Add Competitor
              </button>
            </div>

            {competitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border">
                <UsersIcon className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                <p className="mt-3 font-medium">No competitors tracked</p>
                <p className="text-sm text-muted-foreground">Add competitors to monitor their content strategy</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {competitors.map((comp) => (
                  <CompetitorCard
                    key={comp.id}
                    competitor={comp}
                    onEdit={(c) => { setEditingCompetitor(c); setShowCompetitorModal(true); }}
                    onDelete={handleDeleteCompetitor}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompetitorModal && (
          <AddCompetitorModal
            initial={editingCompetitor}
            onClose={() => { setShowCompetitorModal(false); setEditingCompetitor(undefined); }}
            onSave={handleSaveCompetitor}
          />
        )}
        {showViralModal && (
          <AddViralVideoModal
            onClose={() => setShowViralModal(false)}
            onSave={handleSaveViralVideo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}