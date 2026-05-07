"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check, Loader2, AlertCircle, Sparkles, Calendar,
  BarChart2, Type, Image as ImageIcon, Clapperboard, Share2,
  Plus, Trash2, ChevronUp, ChevronDown, Copy, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SEOScore, ChapterTimestamp } from "@/types";

interface YouTubeMeta {
  title: string;
  description: string;
  tags: string;
  hashtags: string;
  category: string;
  language: string;
  privacy_status: "public" | "unlisted" | "private";
  thumbnail_text: string;
  thumbnail_overlay_json: string;
  chapters: ChapterTimestamp[];
  scheduled_at: string | null;
}

const CATEGORIES = [
  "Science & Technology", "Education", "Entertainment", "Gaming",
  "Music", "News & Politics", "People & Blogs", "Sports",
  "Film & Animation", "Autos & Vehicles", "Comedy", "Howto & Style",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
];

const TABS = [
  { id: "metadata", label: "Metadata", icon: Type },
  { id: "thumbnail", label: "Thumbnail", icon: ImageIcon },
  { id: "chapters", label: "Chapters", icon: Clapperboard },
  { id: "publish", label: "Publish", icon: Share2 },
];

const defaultMeta: YouTubeMeta = {
  title: "",
  description: "",
  tags: "",
  hashtags: "",
  category: "Science & Technology",
  language: "en",
  privacy_status: "private",
  thumbnail_text: "",
  thumbnail_overlay_json: "{}",
  chapters: [],
  scheduled_at: null,
};

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn("text-2xl font-bold", color)}>{score}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SEOBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className={cn("h-1.5 rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseTimestamp(str: string): number {
  const parts = str.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parseInt(str) || 0;
}

export default function SeoPage() {
  return <SeoPageWrapper />;
}

export function SeoPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Loading...</div>
    </div>}>
      <SeoPageContent />
    </Suspense>
  );
}

function SeoPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("project");

  const [activeTab, setActiveTab] = useState("metadata");
  const [meta, setMeta] = useState<YouTubeMeta>(defaultMeta);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [seoScore, setSeoScore] = useState<SEOScore | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [overlayText, setOverlayText] = useState({ headline: "", sub: "" });
  const [chapterNew, setChapterNew] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [tagInputVisible, setTagInputVisible] = useState(false);

  const projectIdNum = projectId ? parseInt(projectId) : null;

  const mountedRef = useRef(false);
  const computeScoreRef = useRef<() => void>(() => {});

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const computeScore = useCallback(async () => {
    if (!mountedRef.current) return;
    setScoreLoading(true);
    try {
      const tagsArr = meta.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const scoreData = await fetch("/api/seo/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meta.title,
          description: meta.description,
          tags: tagsArr,
          thumbnail_text: meta.thumbnail_text,
          chapters: meta.chapters,
        }),
      }).then((r) => r.json());
      if (mountedRef.current) setSeoScore(scoreData);
    } catch { /* ignore score errors */ }
    if (mountedRef.current) setScoreLoading(false);
  }, [meta.title, meta.description, meta.tags, meta.thumbnail_text, meta.chapters]);

  useEffect(() => {
    computeScoreRef.current = () => computeScore();
  }, [computeScore]);

  useEffect(() => {
    if (!projectIdNum) { if (mountedRef.current) setLoading(false); return; }
    let cancelled = false;
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((proj) => {
        if (cancelled || !mountedRef.current) return;
        let thumbnailUrls: string[] = [];
        try { thumbnailUrls = JSON.parse(proj.thumbnail_urls || "[]"); } catch { /* ignore */ }
        if (thumbnailUrls[0]) setThumbnailUrl(thumbnailUrls[0]);
        setMeta((prev) => ({
          ...prev,
          title: proj.topic ? `${proj.topic} — One thing that changed everything` : "",
          description: proj.script ? proj.script.slice(0, 500) + "\n\n..." : "",
        }));
      })
      .catch(() => {});

    fetch(`/api/projects/${projectId}/youtube`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !mountedRef.current || !data.project_id) return;
        let chapters: ChapterTimestamp[] = [];
        let tags: string[] = [];
        let hashtags: string[] = [];
        try { chapters = JSON.parse(data.chapters || "[]"); } catch { /* ignore */ }
        try { tags = JSON.parse(data.tags || "[]"); } catch { /* ignore */ }
        try { hashtags = JSON.parse(data.hashtags || "[]"); } catch { /* ignore */ }
        setMeta({
          title: data.title || "",
          description: data.description || "",
          tags: tags.join(", "),
          hashtags: hashtags.join(", "),
          category: data.category || "Science & Technology",
          language: data.language || "en",
          privacy_status: data.privacy_status || "private",
          thumbnail_text: data.thumbnail_text || "",
          thumbnail_overlay_json: data.thumbnail_overlay_json || "{}",
          chapters,
          scheduled_at: data.scheduled_at || null,
        });
        try {
          const ov = JSON.parse(data.thumbnail_overlay_json || "{}");
          setOverlayText({ headline: ov.headline || "", sub: ov.sub || "" });
        } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => { if (mountedRef.current && !cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [projectIdNum, projectId]);

  useEffect(() => {
    if (!meta.title && !meta.description) return;
    const timer = setTimeout(() => computeScoreRef.current(), 800);
    return () => clearTimeout(timer);
  }, [meta.title, meta.description, meta.tags, meta.thumbnail_text, meta.chapters]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const save = useCallback(async (updates?: Partial<YouTubeMeta>) => {
    if (!projectIdNum) return;
    setSaving(true);
    setError("");
    const merged = updates ? { ...meta, ...updates } : meta;
    const tagsArr = merged.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const hashtagsArr = merged.hashtags.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      await fetch(`/api/projects/${projectId}/youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectIdNum,
          title: merged.title,
          description: merged.description,
          tags: JSON.stringify(tagsArr),
          hashtags: JSON.stringify(hashtagsArr),
          category: merged.category,
          language: merged.language,
          privacy_status: merged.privacy_status,
          thumbnail_text: merged.thumbnail_text,
          thumbnail_overlay_json: JSON.stringify(overlayText),
          chapters: JSON.stringify(merged.chapters),
          scheduled_at: merged.scheduled_at,
        }),
      });
      if (updates) setMeta((prev) => ({ ...prev, ...updates }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  }, [projectIdNum, projectId, meta, overlayText]);

  const aiSuggest = useCallback(async () => {
    if (!meta.title && !projectIdNum) return;
    setAiLoading(true);
    setError("");
    try {
      const topic = meta.title || (await fetch(`/api/projects/${projectId}`).then((r) => r.json()).then((p) => p.topic)) || "";
      const res = await fetch("/api/seo/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const variants = data.title_variants || [];
      const tags = (data.tags || []).join(", ");
      const chapters: ChapterTimestamp[] = (data.chapters || []).map((c: { title: string; start: number }) => ({
        title: c.title,
        start_time: c.start || 0,
      }));

      setMeta((prev) => ({
        ...prev,
        title: variants[0] || prev.title,
        description: data.description_template || prev.description,
        tags: tags || prev.tags,
        thumbnail_text: data.thumbnail_text || prev.thumbnail_text,
        chapters: chapters.length > 0 ? chapters : prev.chapters,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI suggestion failed");
    }
    setAiLoading(false);
  }, [meta.title, projectIdNum, projectId]);

  const addTag = () => {
    if (!tagInput.trim()) return;
    const existing = meta.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (!existing.includes(tagInput.trim())) {
      setMeta((prev) => ({ ...prev, tags: [...existing, tagInput.trim()].join(", ") }));
    }
    setTagInput("");
    setTagInputVisible(false);
  };

  const removeTag = (tag: string) => {
    setMeta((prev) => ({
      ...prev,
      tags: prev.tags.split(",").map((t) => t.trim()).filter((t) => t !== tag).join(", "),
    }));
  };

  const addChapter = () => {
    if (!chapterNew.trim()) return;
    setMeta((prev) => ({
      ...prev,
      chapters: [
        ...prev.chapters,
        { title: chapterNew.trim(), start_time: prev.chapters.length > 0 ? (prev.chapters[prev.chapters.length - 1].start_time || 0) + 60 : 0 },
      ],
    }));
    setChapterNew("");
  };

  const removeChapter = (idx: number) => {
    setMeta((prev) => ({
      ...prev,
      chapters: prev.chapters.filter((_, i) => i !== idx),
    }));
  };

  const moveChapter = (idx: number, dir: -1 | 1) => {
    const next = [...meta.chapters];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setMeta((prev) => ({ ...prev, chapters: next }));
  };

  const updateChapterTime = (idx: number, time: string) => {
    setMeta((prev) => {
      const next = [...prev.chapters];
      next[idx] = { ...next[idx], start_time: parseTimestamp(time) };
      return { ...prev, chapters: next };
    });
  };

  const updateChapterTitle = (idx: number, title: string) => {
    setMeta((prev) => {
      const next = [...prev.chapters];
      next[idx] = { ...next[idx], title };
      return { ...prev, chapters: next };
    });
  };

  const copyDescription = () => {
    const lines = meta.chapters.map((c) => `${formatTimestamp(c.start_time)} — ${c.title}`).join("\n");
    const full = `${meta.description}\n\n⏱ Key Timestamps:\n${lines}\n\n${meta.hashtags.split(",").map((h) => h.trim()).filter(Boolean).map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`;
    navigator.clipboard.writeText(full);
  };

  const schedulePublish = async () => {
    if (!projectIdNum) return;
    if (!scheduleDate) { setError("Select a date to schedule"); return; }
    setSaving(true);
    try {
      const scheduled_at = `${scheduleDate}T${scheduleTime}:00`;
      await fetch(`/api/projects/${projectId}/youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectIdNum, scheduled_at }),
      });
      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectIdNum,
          title: meta.title || "Untitled Video",
          event_date: scheduled_at,
          status: "scheduled",
          platform: "youtube_long",
        }),
      });
      setMeta((prev) => ({ ...prev, scheduled_at }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to schedule. Please try again.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    </div>
  );
}

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">YouTube SEO Studio</h1>
          <p className="text-sm text-muted-foreground">Optimize metadata, thumbnails, chapters & publish planning</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}`)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            ← Back to Project
          </button>
          <button
            type="button"
            onClick={aiSuggest}
            disabled={aiLoading}
            className="btn-gradient flex items-center gap-2"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            AI Suggest
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="rounded px-2 py-0.5 hover:bg-destructive/20">
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Saved successfully</span>
        </div>
      )}

      <div className="flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "metadata" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card space-y-4">
              <div>
                <label htmlFor="yt-title" className="mb-2 block text-sm font-medium">
                  Title <span className="text-xs text-muted-foreground">(50-60 chars optimal)</span>
                </label>
                <div className="relative">
                  <input
                    id="yt-title"
                    value={meta.title}
                    onChange={(e) => setMeta((prev) => ({ ...prev, title: e.target.value }))}
                    onBlur={() => save()}
                    placeholder="The Secret Feature Nobody Uses in..."
                    className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    maxLength={100}
                  />
                  <span className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 text-xs",
                    meta.title.length > 70 ? "text-red-500" : meta.title.length > 50 ? "text-green-500" : "text-muted-foreground"
                  )}>
                    {meta.title.length}/60
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="yt-desc" className="mb-2 block text-sm font-medium">
                  Description <span className="text-xs text-muted-foreground">(first 150 chars = search snippet)</span>
                </label>
                <textarea
                  id="yt-desc"
                  value={meta.description}
                  onChange={(e) => setMeta((prev) => ({ ...prev, description: e.target.value }))}
                  onBlur={() => save()}
                  placeholder="Start with a hook, then describe what viewers will learn..."
                  className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  rows={8}
                />
                <div className="mt-1.5 rounded-lg border border-muted bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Search snippet preview:</p>
                  <p className="text-sm">{meta.description.slice(0, 150)}{meta.description.length > 150 ? "..." : ""}</p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {meta.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-primary/70" aria-label={`Remove tag ${tag}`}>
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  {!tagInputVisible && (
                    <button
                      type="button"
                      onClick={() => setTagInputVisible(true)}
                      className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" /> Add tag
                    </button>
                  )}
                </div>
                {tagInputVisible && (
                  <div className="flex gap-2">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      placeholder="Enter tag and press Enter"
                      className="flex-1 rounded-xl border border-border bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <button type="button" onClick={addTag} className="btn-gradient px-3">Add</button>
                    <button type="button" onClick={() => setTagInputVisible(false)} className="rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-muted">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="yt-hashtags" className="mb-2 block text-sm font-medium">Hashtags</label>
                <input
                  id="yt-hashtags"
                  value={meta.hashtags}
                  onChange={(e) => setMeta((prev) => ({ ...prev, hashtags: e.target.value }))}
                  onBlur={() => save()}
                  placeholder="SaaS, Productivity, Tech, Tutorial (comma separated)"
                  className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="yt-category" className="mb-2 block text-sm font-medium">Category</label>
                  <select
                    id="yt-category"
                    value={meta.category}
                    onChange={(e) => { setMeta((prev) => ({ ...prev, category: e.target.value })); save({ category: e.target.value }); }}
                    className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="yt-lang" className="mb-2 block text-sm font-medium">Language</label>
                  <select
                    id="yt-lang"
                    value={meta.language}
                    onChange={(e) => { setMeta((prev) => ({ ...prev, language: e.target.value })); save({ language: e.target.value }); }}
                    className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Privacy</label>
                <div className="flex gap-2">
                  {(["private", "unlisted", "public"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setMeta((prev) => ({ ...prev, privacy_status: p })); save({ privacy_status: p }); }}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors",
                        meta.privacy_status === p
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { save(); computeScore(); }}
                  disabled={saving}
                  className="btn-gradient flex-1"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                  Save Metadata
                </button>
                <button
                  type="button"
                  onClick={copyDescription}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy Description
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <BarChart2 className="h-4 w-4" aria-hidden="true" />
                SEO Score
                {scoreLoading && <Loader2 className="h-3 w-3 animate-spin ml-auto" aria-hidden="true" />}
              </h3>
              {seoScore ? (
                <div className="space-y-3">
                  <div className="flex justify-center gap-4">
                    <ScoreRing score={seoScore.overall} label="Overall" />
                  </div>
                  <div className="space-y-2">
                    <SEOBar label="Title" score={seoScore.title_score} />
                    <SEOBar label="Description" score={seoScore.description_score} />
                    <SEOBar label="Tags" score={seoScore.tag_score} />
                    <SEOBar label="Thumbnail" score={seoScore.thumbnail_score} />
                    <SEOBar label="Chapters" score={seoScore.chapter_score} />
                  </div>
                  {seoScore.suggestions.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground">Suggestions</p>
                      {seoScore.suggestions.slice(0, 4).map((s, i) => (
                        <div key={i} className={cn(
                          "rounded-lg border px-3 py-2 text-xs",
                          s.severity === "high" ? "border-red-500/30 bg-red-500/5" :
                          s.severity === "medium" ? "border-yellow-500/30 bg-yellow-500/5" :
                          "border-muted bg-muted/30"
                        )}>
                          <p className="font-medium">{s.message}</p>
                          <p className="mt-0.5 text-muted-foreground">{s.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Fill in metadata to see your SEO score
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "thumbnail" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card space-y-4">
            <h3 className="font-semibold">Thumbnail Text Overlay</h3>
            <div>
              <label htmlFor="thumb-headline" className="mb-2 block text-sm font-medium">Headline (3-5 words)</label>
              <input
                id="thumb-headline"
                value={overlayText.headline}
                onChange={(e) => setOverlayText((prev) => ({ ...prev, headline: e.target.value }))}
                onBlur={() => save({ thumbnail_text: overlayText.headline, thumbnail_overlay_json: JSON.stringify(overlayText) })}
                placeholder="STOP DOING THIS"
                className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                maxLength={30}
              />
            </div>
            <div>
              <label htmlFor="thumb-sub" className="mb-2 block text-sm font-medium">Sub-text / Emoji</label>
              <input
                id="thumb-sub"
                value={overlayText.sub}
                onChange={(e) => setOverlayText((prev) => ({ ...prev, sub: e.target.value }))}
                onBlur={() => save({ thumbnail_text: overlayText.headline, thumbnail_overlay_json: JSON.stringify(overlayText) })}
                placeholder="😱 3 sec left"
                className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                maxLength={20}
              />
            </div>
            <button
              type="button"
              onClick={() => save({ thumbnail_text: overlayText.headline, thumbnail_overlay_json: JSON.stringify(overlayText) })}
              className="btn-gradient w-full"
            >
              Save Thumbnail Text
            </button>
            <p className="text-xs text-muted-foreground">
              Tip: Use all-caps for the headline, keep sub-text to 2-3 words. Face + bold text = highest CTR.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <h3 className="mb-4 font-semibold">Preview</h3>
            {thumbnailUrl ? (
              <div className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnailUrl} alt="Thumbnail" className="w-full" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  {overlayText.headline && (
                    <p className="text-xl font-black uppercase text-white drop-shadow-lg">{overlayText.headline}</p>
                  )}
                  {overlayText.sub && (
                    <p className="text-sm font-bold text-white/90 mt-1">{overlayText.sub}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="mx-auto h-10 w-10" aria-hidden="true" />
                  <p className="mt-2 text-sm">No thumbnail available</p>
                  <p className="text-xs">Generate images in the wizard first</p>
                </div>
              </div>
            )}
            {thumbnailUrl && (
              <button
                type="button"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = thumbnailUrl;
                  a.download = `thumbnail-${projectId}.png`;
                  a.click();
                }}
                className="btn-gradient mt-4 w-full"
              >
                Download Thumbnail
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "chapters" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <h3 className="mb-4 font-semibold">Chapter Markers</h3>
              <div className="space-y-2">
                {meta.chapters.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No chapters yet — add your first one below</p>
                ) : (
                  meta.chapters.map((ch, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 rounded-xl border border-border p-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveChapter(idx, -1)}
                          disabled={idx === 0}
                          className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveChapter(idx, 1)}
                          disabled={idx === meta.chapters.length - 1}
                          className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="w-16 text-sm font-mono text-muted-foreground">
                        {formatTimestamp(ch.start_time)}
                      </div>
                      <input
                        value={ch.title}
                        onChange={(e) => updateChapterTitle(idx, e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-white px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        value={formatTimestamp(ch.start_time)}
                        onChange={(e) => updateChapterTime(idx, e.target.value)}
                        placeholder="0:00"
                        className="w-16 rounded-lg border border-border bg-white px-2 py-1 text-sm font-mono outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => removeChapter(idx)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Remove chapter"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={chapterNew}
                  onChange={(e) => setChapterNew(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChapter(); } }}
                  placeholder="Chapter title..."
                  className="flex-1 rounded-xl border border-border bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <button type="button" onClick={addChapter} className="btn-gradient px-4">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <h3 className="mb-3 font-semibold">Copy Chapter List</h3>
              <div className="space-y-1.5 rounded-xl border border-muted bg-muted/30 p-3 text-sm font-mono">
                {meta.chapters.length === 0 ? (
                  <p className="text-muted-foreground">No chapters to copy</p>
                ) : (
                  meta.chapters.map((ch, i) => (
                    <p key={i}>{formatTimestamp(ch.start_time)} — {ch.title}</p>
                  ))
                )}
              </div>
              {meta.chapters.length > 0 && (
                <button
                  type="button"
                  onClick={copyDescription}
                  className="mt-3 w-full rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  <Copy className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  Copy with Description
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <h3 className="mb-3 font-semibold">Auto-Generate from Scenes</h3>
              <p className="mb-3 text-xs text-muted-foreground">Create chapters based on scene scripts from the wizard</p>
              <button
                type="button"
                onClick={() => {
                  const scenes = window.prompt("Paste scene names separated by commas (or leave empty to use scene order):");
                  if (scenes !== null) {
                    const names = scenes.split(",").map((s) => s.trim()).filter(Boolean);
                    let offset = 0;
                    const autoChapters = names.map((name) => {
                      const ch = { title: name, start_time: offset };
                      offset += 60;
                      return ch;
                    });
                    setMeta((prev) => ({ ...prev, chapters: autoChapters }));
                    save({ chapters: autoChapters } as Partial<YouTubeMeta>);
                  }
                }}
                className="w-full rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                <Sparkles className="mr-2 inline h-4 w-4" aria-hidden="true" />
                Generate from Scenes
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "publish" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card space-y-4">
              <h3 className="font-semibold">Publish Checklist</h3>
              <div className="space-y-3">
                {[
                  { label: "Title set", ok: meta.title.length > 0 },
                  { label: "Description written", ok: meta.description.length > 100 },
                  { label: "Tags added", ok: meta.tags.split(",").filter(t => t.trim()).length >= 3 },
                  { label: "Thumbnail text set", ok: meta.thumbnail_text.length > 0 },
                  { label: "Chapters defined", ok: meta.chapters.length >= 3 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", item.ok ? "bg-green-500 text-white" : "border border-border")}>
                      {item.ok ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                    </div>
                    <span className={cn("text-sm", item.ok ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-card space-y-4">
              <h3 className="font-semibold">Final Metadata Preview</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Title</p>
                  <p className="font-medium">{meta.title || <span className="text-muted-foreground">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{meta.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Language</p>
                  <p className="font-medium">{LANGUAGES.find(l => l.code === meta.language)?.label || meta.language}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Privacy</p>
                  <p className="font-medium capitalize">{meta.privacy_status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tags</p>
                  <p className="font-medium">{meta.tags.split(",").filter(t => t.trim()).length > 0 ? meta.tags.split(",").map(t => t.trim()).filter(Boolean).join(", ") : <span className="text-muted-foreground">None</span>}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card space-y-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Schedule Publish
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="sched-date" className="mb-2 block text-sm font-medium">Date</label>
                  <input
                    id="sched-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="sched-time" className="mb-2 block text-sm font-medium">Time</label>
                  <input
                    id="sched-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={schedulePublish}
                disabled={saving || !scheduleDate}
                className="btn-gradient w-full disabled:opacity-50"
              >
                <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
                {saving ? "Scheduling..." : "Add to Calendar"}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Best times to post: 3-5 PM on weekdays (Western markets)
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <h3 className="mb-3 font-semibold">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={copyDescription}
                  className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy full description + chapters + hashtags
                </button>
                <button
                  type="button"
                  onClick={() => save()}
                  disabled={saving}
                  className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Save all metadata
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
