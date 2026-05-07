"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Camera, Loader2, AlertCircle, Sparkles, Check, X, Copy,
  Hash, Type as TypeIcon, Image as ImageIcon, Calendar, MessageSquare,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
const CONTENT_TYPES = [
  { id: "reel", label: "Reels", emoji: "🎬", desc: "Short-form video, 15s–3min" },
  { id: "story", label: "Stories", emoji: "📱", desc: "24hr ephemeral content" },
  { id: "feed_single", label: "Feed (Single)", emoji: "🖼️", desc: "Single image post" },
  { id: "feed_carousel", label: "Feed (Carousel)", emoji: "🎠", desc: "Multi-image carousel" },
] as const;

const CTA_OPTIONS = [
  "Swipe up to learn more",
  "Save this post for later",
  "Double tap to like",
  "Tag someone who needs this",
  "Share with a friend",
  "Link in bio",
  "Tap the link in bio",
  "Shop now — link in bio",
  "Follow for more",
  "Comment 'YES' below",
  "Turn on post notifications",
];

const AUDIENCE_OPTIONS = [
  "Gen Z (18–24)",
  "Young Adults (25–34)",
  "Millennials (25–40)",
  "Parents (30–50)",
  "Professionals (25–45)",
  "Fitness & Wellness",
  "Beauty & Skincare",
  "Food & Lifestyle",
  "Tech & Gadgets",
  "Fashion & Style",
  "Business & Finance",
  "Travel & Adventure",
];

const HOOK_PHRASES = [
  "Here's what nobody tells you about",
  "The real reason I",
  "Stop scrolling —",
  "This changed everything when I",
  "三年后我才明白 (I only realized after 3 years)",
  "You'll wish you knew this sooner",
  "The truth about",
  "My secret to",
  "How I turned",
  "Why most people fail at",
];

interface InstagramMeta {
  caption: string;
  hashtags: string;
  hashtags_suggested: string;
  story_text: string;
  story_hashtags: string;
  reel_title: string;
  reel_description: string;
  cover_image_prompt: string;
  content_type: typeof CONTENT_TYPES[number]["id"];
  target_audience: string;
  call_to_action: string;
  scheduled_at: string | null;
}

const defaultMeta: InstagramMeta = {
  caption: "",
  hashtags: "",
  hashtags_suggested: "",
  story_text: "",
  story_hashtags: "",
  reel_title: "",
  reel_description: "",
  cover_image_prompt: "",
  content_type: "reel",
  target_audience: "",
  call_to_action: "",
  scheduled_at: null,
};

const TABS = [
  { id: "caption", label: "Caption", icon: MessageSquare },
  { id: "hashtags", label: "Hashtags", icon: Hash },
  { id: "reels", label: "Reels", icon: Camera },
  { id: "publish", label: "Publish", icon: Calendar },
];

function ScoreBar({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className={cn("h-1.5 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function InstagramPage() {
  return <InstagramPageWrapper />;
}

export function InstagramPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Loading...</div>
    </div>}>
      <InstagramPageContent />
    </Suspense>
  );
}

function InstagramPageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const [activeTab, setActiveTab] = useState("caption");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [captionMode, setCaptionMode] = useState<"write" | "generate">("write");
  const [copied, setCopied] = useState(false);
  const projectIdNum = projectId ? parseInt(projectId) : null;
  const mountedRef = useRef(false);

  const [meta, setMeta] = useState<InstagramMeta>(defaultMeta);
  const [instaScore, setInstaScore] = useState<{ total: number; character_count: number; hashtag_count: number; hook_score: number; reach_score: number } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!projectIdNum) { if (mountedRef.current) setLoading(false); return; }
    let cancelled = false;
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((proj) => {
        if (cancelled || !mountedRef.current) return;
        setMeta((prev) => ({
          ...prev,
          caption: proj.script ? `${proj.script.slice(0, 300)}...` : "",
        }));
      })
      .catch(() => {});

    fetch(`/api/projects/${projectId}/instagram`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !mountedRef.current || !data.project_id) return;
        setMeta({
          caption: data.caption || "",
          hashtags: data.hashtags || "",
          hashtags_suggested: data.hashtags_suggested || "",
          story_text: data.story_text || "",
          story_hashtags: data.story_hashtags || "",
          reel_title: data.reel_title || "",
          reel_description: data.reel_description || "",
          cover_image_prompt: data.cover_image_prompt || "",
          content_type: data.content_type || "reel",
          target_audience: data.target_audience || "",
          call_to_action: data.call_to_action || "",
          scheduled_at: data.scheduled_at || null,
        });
      })
      .catch(() => {})
      .finally(() => { if (mountedRef.current && !cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [projectIdNum, projectId]);

  const computeScoreRef = useRef<() => void>(() => {});

  const computeScore = useCallback(() => {
    const hashCount = (meta.hashtags.match(/#/g) || []).length;
    const hookScore = /^(swipe up|save this|tap the link|check out|link in bio|link in comments|follow for more|double tap|comment)/i.test(meta.caption) ? 100 : 50;
    const charScore = meta.caption.length >= 125 && meta.caption.length <= 2200 ? 100 : Math.max(0, Math.min(100, (meta.caption.length / 2200) * 100));
    const ctaPatterns = /^(swipe up|save this|tap the link|check out|link in bio|follow for more|double tap|comment|shop now|learn more|get yours)/i;
    const ctaScore = ctaPatterns.test(meta.caption) ? 100 : 0;
    const hashArr = meta.hashtags.split(",").map((h) => h.trim()).filter(Boolean);
    const reachScore = hashArr.some((h) => h.length > 15) ? 80 : 60;
    const total = Math.round(charScore * 0.25 + hashCount / 30 * 100 * 0.2 + hookScore * 0.2 + ctaScore * 0.15 + reachScore * 0.2);
    if (mountedRef.current) setInstaScore({ total: Math.min(100, total), character_count: meta.caption.length, hashtag_count: hashCount, hook_score: hookScore, reach_score: reachScore });
  }, [meta.caption, meta.hashtags]);

  useEffect(() => {
    computeScoreRef.current = () => computeScore();
  }, [computeScore]);

  useEffect(() => {
    const timer = setTimeout(() => computeScoreRef.current(), 300);
    return () => clearTimeout(timer);
  }, [meta.caption, meta.hashtags]);

  const save = useCallback(async (updates?: Partial<InstagramMeta>) => {
    if (!projectIdNum) return;
    setSaving(true);
    setError("");
    const merged = updates ? { ...meta, ...updates } : meta;
    try {
      await fetch(`/api/projects/${projectId}/instagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectIdNum, ...merged }),
      });
      if (updates) setMeta((prev) => ({ ...prev, ...updates }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  }, [projectIdNum, meta, projectId]);

  const generateCaption = async () => {
    if (!meta.caption && !projectIdNum) return;
    setAiLoading(true);
    setError("");
    try {
      const topic = meta.caption || (await fetch(`/api/projects/${projectId}`).then((r) => r.json()).then((p) => p.topic)) || "";
      const res = await fetch("/api/seo/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform: "instagram" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const caption = data.caption || data.description || data.title || "";
      const hashtags = data.hashtags || data.tags || "";
      setMeta((prev) => ({ ...prev, caption, hashtags }));
      computeScore();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate caption");
    }
    setAiLoading(false);
  };

  const generateHashtags = async () => {
    if (!meta.caption && !projectIdNum) return;
    setAiLoading(true);
    setError("");
    try {
      const topic = meta.caption || (await fetch(`/api/projects/${projectId}`).then((r) => r.json()).then((p) => p.topic)) || "";
      const res = await fetch("/api/seo/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform: "instagram_hashtags" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const suggested = data.hashtags || data.tags || "";
      setMeta((prev) => ({ ...prev, hashtags_suggested: suggested }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate hashtags");
    }
    setAiLoading(false);
  };

  const generateReelContent = async () => {
    if (!meta.reel_title && !projectIdNum) return;
    setAiLoading(true);
    setError("");
    try {
      const topic = meta.reel_title || (await fetch(`/api/projects/${projectId}`).then((r) => r.json()).then((p) => p.topic)) || "";
      const res = await fetch("/api/seo/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform: "instagram_reels" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMeta((prev) => ({
        ...prev,
        reel_title: data.title || data.reel_title || prev.reel_title,
        reel_description: data.description || data.caption || prev.reel_description,
        cover_image_prompt: data.cover_image_prompt || data.thumbnail_text || prev.cover_image_prompt,
      }));
      computeScore();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate reel content");
    }
    setAiLoading(false);
  };

  const copyCaption = () => {
    const fullCaption = meta.caption + "\n\n" + meta.hashtags.split(",").map((h) => h.trim()).filter(Boolean).join(" ");
    navigator.clipboard.writeText(fullCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instagram Studio</h1>
          <p className="text-sm text-muted-foreground">Craft captions, hashtags, and reel content optimized for Instagram</p>
        </div>
        <div className="flex gap-2">
          {saving ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving...
            </span>
          ) : saved ? (
            <span className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" aria-hidden="true" /> Saved!
            </span>
          ) : null}
          <button onClick={() => save()} disabled={saving || !projectIdNum} className="btn-gradient disabled:opacity-50">
            Save All
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError("")} className="rounded-md bg-destructive/20 px-2 py-1 text-xs font-medium hover:bg-destructive/30">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "caption" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Content Type Selector */}
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Content Type</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {CONTENT_TYPES.map((ct) => (
                    <button
                      key={ct.id}
                      onClick={() => setMeta((prev) => ({ ...prev, content_type: ct.id }))}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                        meta.content_type === ct.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      )}
                    >
                      <span className="text-lg">{ct.emoji}</span>
                      <span className="font-medium">{ct.label}</span>
                      <span className="text-muted-foreground">{ct.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption */}
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold">Caption</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCaptionMode("write")}
                      className={cn("rounded-lg border px-2 py-1 text-xs", captionMode === "write" ? "border-primary bg-primary/10 text-primary" : "border-border")}
                    >Write</button>
                    <button
                      type="button"
                      onClick={() => setCaptionMode("generate")}
                      className={cn("rounded-lg border px-2 py-1 text-xs", captionMode === "generate" ? "border-primary bg-primary/10 text-primary" : "border-border")}
                    >AI Generate</button>
                  </div>
                </div>
                {captionMode === "generate" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Describe your content or we&apos;ll pull the topic from your project.</p>
                    <button type="button" onClick={generateCaption} disabled={aiLoading} className="btn-gradient disabled:opacity-50">
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                      Generate Caption + Hook
                    </button>
                  </div>
                ) : (
                  <textarea
                    value={meta.caption}
                    onChange={(e) => setMeta((prev) => ({ ...prev, caption: e.target.value }))}
                    placeholder="Write your caption here... Start with a hook — a question, bold statement, or 'here's what nobody tells you about...'"
                    className="w-full rounded-xl border border-border bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                    rows={8}
                  />
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{meta.caption.length}/2,200 characters</span>
                  <span>{meta.caption.length < 125 ? "Add more text for stronger reach" : meta.caption.length <= 2200 ? "Good length" : "Too long — trim for algorithm"}</span>
                </div>
              </div>

              {/* Hook + CTA */}
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <h3 className="text-sm font-semibold">Hook + Call to Action</h3>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Opening Hook</label>
                  <select
                    value={HOOK_PHRASES.find((h) => meta.caption.toLowerCase().startsWith(h.toLowerCase())) || ""}
                    onChange={(e) => {
                      const hook = e.target.value;
                      if (!hook) return;
                      const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                      const hookPattern = new RegExp(`^(${HOOK_PHRASES.map(escapeRegex).join("|")})`, "i");
                      const rest = meta.caption.replace(hookPattern, "").trim();
                      setMeta((prev) => ({ ...prev, caption: hook + " " + rest }));
                    }}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a hook phrase...</option>
                    {HOOK_PHRASES.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Call to Action</label>
                  <select
                    value={meta.call_to_action}
                    onChange={(e) => setMeta((prev) => ({ ...prev, call_to_action: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">None selected</option>
                    {CTA_OPTIONS.map((cta) => <option key={cta} value={cta}>{cta}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Target Audience</label>
                  <select
                    value={meta.target_audience}
                    onChange={(e) => setMeta((prev) => ({ ...prev, target_audience: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select audience...</option>
                    {AUDIENCE_OPTIONS.map((aud) => <option key={aud} value={aud}>{aud}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "hashtags" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Hashtags</h3>
                </div>
                <textarea
                  value={meta.hashtags}
                  onChange={(e) => setMeta((prev) => ({ ...prev, hashtags: e.target.value }))}
                  placeholder="#yourbrand #niche #industry #topic1 #topic2... (comma or newline separated)"
                  className="w-full rounded-xl border border-border bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                  rows={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{(meta.hashtags.match(/#/g) || []).length} hashtags</span>
                  <span>5–30 optimal. Mix broad + niche + branded.</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={generateHashtags} disabled={aiLoading} className="btn-gradient disabled:opacity-50">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                    AI Generate Hashtags
                  </button>
                </div>
              </div>

              {meta.hashtags_suggested && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold">Suggested Hashtags</h3>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    {meta.hashtags_suggested.split(/[,\n]/).map((h, i) => (
                      <span key={i} className={cn("mr-2 text-blue-600 cursor-pointer hover:text-blue-800", !h.trim() && "hidden")} onClick={() => {
                        const trimmed = h.trim().replace(/^#/, "");
                        if (!trimmed) return;
                        const current = meta.hashtags.split(/[,\n]/).map((x) => x.trim().replace(/^#/, "")).filter(Boolean);
                        if (!current.includes(trimmed)) {
                          setMeta((prev) => ({ ...prev, hashtags: (prev.hashtags ? prev.hashtags + ", " : "") + "#" + trimmed }));
                        }
                      }}>#{h.trim().replace(/^#/, "")}</span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMeta((prev) => ({ ...prev, hashtags: prev.hashtags_suggested }))}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
                  >Use All Suggested</button>
                </motion.div>
              )}

              {/* Hashtag Strategy Tips */}
              <div className="rounded-2xl border border-border bg-gradient-to-br from-pink-50 to-purple-50 p-4 space-y-2">
                <h3 className="text-sm font-semibold">Hashtag Strategy</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="font-medium text-pink-600">Broad (3–5)</p>
                    <p className="text-muted-foreground">#viral #fyp #explore #forYou #trending</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-purple-600">Niche (5–10)</p>
                    <p className="text-muted-foreground">#industry #topic #community keywords</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-blue-600">Branded (1–3)</p>
                    <p className="text-muted-foreground">#YourBrand #BrandTagline</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "reels" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <TypeIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Reel Title</h3>
                </div>
                <input
                  value={meta.reel_title}
                  onChange={(e) => setMeta((prev) => ({ ...prev, reel_title: e.target.value }))}
                  placeholder="Catchy, searchable title — max 100 chars"
                  className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={generateReelContent} disabled={aiLoading} className="btn-gradient disabled:opacity-50">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                    AI Generate Reel Content
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Reel Description</h3>
                </div>
                <textarea
                  value={meta.reel_description}
                  onChange={(e) => setMeta((prev) => ({ ...prev, reel_description: e.target.value }))}
                  placeholder="Description that shows in search and on the Reel page..."
                  className="w-full rounded-xl border border-border bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                  rows={4}
                />
              </div>

              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Cover Image Prompt</h3>
                </div>
                <textarea
                  value={meta.cover_image_prompt}
                  onChange={(e) => setMeta((prev) => ({ ...prev, cover_image_prompt: e.target.value }))}
                  placeholder="Describe the cover image you want generated for your Reel..."
                  className="w-full rounded-xl border border-border bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Use this prompt in Thumbnail Studio to generate the perfect Reel cover.</p>
              </div>

              {/* Story Text */}
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Story Text</h3>
                </div>
                <textarea
                  value={meta.story_text}
                  onChange={(e) => setMeta((prev) => ({ ...prev, story_text: e.target.value }))}
                  placeholder="Story sticker text or swipe up text..."
                  className="w-full rounded-xl border border-border bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
                <input
                  value={meta.story_hashtags}
                  onChange={(e) => setMeta((prev) => ({ ...prev, story_hashtags: e.target.value }))}
                  placeholder="Story hashtags (comma-separated)"
                  className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </motion.div>
          )}

          {activeTab === "publish" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Checklist */}
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <h3 className="text-sm font-semibold">Pre-Publish Checklist</h3>
                <div className="space-y-2">
                  {[
                    { label: "Caption written (125+ chars)", ok: meta.caption.length >= 125 },
                    { label: "Hashtags added (5–30)", ok: (meta.hashtags.match(/#/g) || []).length >= 5 },
                    { label: "Hook phrase at start", ok: HOOK_PHRASES.some((h) => meta.caption.toLowerCase().startsWith(h.toLowerCase())) },
                    { label: "CTA included", ok: !!meta.call_to_action },
                    { label: "Target audience set", ok: !!meta.target_audience },
                    { label: "Content type selected", ok: !!meta.content_type },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {item.ok ? <Check className="h-4 w-4 text-green-500" aria-hidden="true" /> : <X className="h-4 w-4 text-red-400" aria-hidden="true" />}
                      <span className={cn("text-sm", item.ok ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <h3 className="text-sm font-semibold">Caption Preview</h3>
                <div className="rounded-xl bg-gradient-to-br from-pink-50 to-orange-50 p-4 text-sm">
                  <p className="font-medium">{meta.caption || "Your caption will appear here..."}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {meta.hashtags.split(",").map((h) => h.trim()).filter(Boolean).slice(0, 5).join(" ")} {(meta.hashtags.split(",").length > 5 ? "..." : "")}
                  </p>
                </div>
                <button type="button" onClick={copyCaption} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
                  <Copy className="h-3 w-3" aria-hidden="true" />
                  {copied ? "Copied!" : "Copy Full Caption + Hashtags"}
                </button>
              </div>

              {/* Save button */}
              <button type="button" onClick={() => save()} disabled={saving} className="btn-gradient w-full disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                Save Instagram Metadata
              </button>
            </motion.div>
          )}
        </div>

        {/* Sidebar Score */}
        {activeTab !== "publish" && instaScore && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
              <h3 className="text-sm font-semibold">Instagram Score</h3>
              <div className="flex justify-center">
                <div className="relative h-24 w-24">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${instaScore.total * 2.51} 251`}
                      className={cn(instaScore.total >= 75 ? "text-green-500" : instaScore.total >= 50 ? "text-yellow-500" : "text-red-500")} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">{instaScore.total}</div>
                </div>
              </div>
              <div className="space-y-2">
                <ScoreBar label="Caption Length" score={instaScore.character_count} max={2200} />
                <ScoreBar label="Hashtag Count" score={instaScore.hashtag_count * (100 / 30)} />
                <ScoreBar label="Hook Strength" score={instaScore.hook_score} />
                <ScoreBar label="Reach Potential" score={instaScore.reach_score} />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-2">
              <h3 className="text-sm font-semibold">Platform Tips</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Reels: 3–30s is the sweet spot for completion rate</p>
                <p>• First 2 lines show before &ldquo;more&rdquo; — put the hook there</p>
                <p>• Use 1–2 line breaks to make text scannable</p>
                <p>• Stories with polls/questions get 3x more replies</p>
                <p>• Post when your audience is most active</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
