"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2, AlertCircle, Sparkles, Check, X, Copy,
  Hash, Type as TypeIcon, MessageSquare, Send,
  BookOpen, BarChart2, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkedInScore } from "@/lib/db-queries";

const CONTENT_FORMATS = [
  { id: "post", label: "Post", emoji: "📝", desc: "Text or image post" },
  { id: "carousel", label: "Carousel", emoji: "📊", desc: "Multi-slide document" },
  { id: "article", label: "Article", emoji: "📖", desc: "Long-form native article" },
  { id: "video", label: "Video", emoji: "🎬", desc: "Native video content" },
] as const;

const INDUSTRIES = [
  "Technology", "Finance & Banking", "Healthcare", "Education",
  "Marketing & Advertising", "Consulting", "Real Estate", "Manufacturing",
  "Retail & E-commerce", "Media & Entertainment", "Legal", "Non-profit",
  "Government", "Aerospace", "Energy", "Other",
];

const HOOK_PHRASES = [
  "Here's what nobody tells you about",
  "The real reason I",
  "Stop scrolling —",
  "This changed everything when I",
  "I was wrong about this for years.",
  "3 things I wish I knew before",
  "I almost turned down",
  "I turned down $",
  "We almost ran out of",
  "Tuesday, 9 PM.",
];

const CTA_OPTIONS = [
  "What would you add to this list?",
  "What's your experience with this?",
  "Drop your thoughts in the comments.",
  "DM me if you want to discuss further.",
  "Connect if you're building in this space.",
  "Save this post for later.",
  "Repost with your own take.",
  "Tag someone who needs to see this.",
];

const AUDIENCE_OPTIONS = [
  "Executives & Directors", "Middle Management", "Individual Contributors",
  "Entrepreneurs & Founders", "Freelancers & Consultants",
  "Recent Graduates", "Career Changers", "Tech Professionals",
  "Sales & Marketing", "Operations", "Finance", "HR & People",
];

interface LinkedInMeta {
  headline: string;
  caption: string;
  hashtags: string;
  hashtags_suggested: string;
  target_audience: string;
  call_to_action: string;
  content_format: typeof CONTENT_FORMATS[number]["id"];
  industry: string;
  scheduled_at: string | null;
}

const defaultMeta: LinkedInMeta = {
  headline: "",
  caption: "",
  hashtags: "",
  hashtags_suggested: "",
  target_audience: "",
  call_to_action: "",
  content_format: "post",
  industry: "",
  scheduled_at: null,
};

const TABS = [
  { id: "content", label: "Content", icon: MessageSquare },
  { id: "hashtags", label: "Hashtags", icon: Hash },
  { id: "optimize", label: "Optimize", icon: BarChart2 },
  { id: "publish", label: "Publish", icon: Send },
];

function ScoreBar({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 75 ? "bg-blue-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
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

export default function LinkedInPage() {
  return <LinkedInPageWrapper />;
}

export function LinkedInPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Loading...</div>
    </div>}>
      <LinkedInPageContent />
    </Suspense>
  );
}

function LinkedInPageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const [activeTab, setActiveTab] = useState("content");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const projectIdNum = projectId ? parseInt(projectId) : null;
  const mountedRef = useRef(false);

  const [meta, setMeta] = useState<LinkedInMeta>(defaultMeta);
  const [liScore, setLiScore] = useState<LinkedInScore | null>(null);

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
          headline: proj.topic ? `${proj.topic} — here's what nobody tells you` : "",
        }));
      })
      .catch(() => {});

    fetch(`/api/projects/${projectId}/linkedin`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !mountedRef.current || !data.project_id) return;
        setMeta({
          headline: data.headline || "",
          caption: data.caption || "",
          hashtags: data.hashtags || "",
          hashtags_suggested: data.hashtags_suggested || "",
          target_audience: data.target_audience || "",
          call_to_action: data.call_to_action || "",
          content_format: data.content_format || "post",
          industry: data.industry || "",
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
    const hookScore = HOOK_PHRASES.some((h) => meta.caption.toLowerCase().startsWith(h.toLowerCase())) ? 100 : 50;
    const charScore = meta.caption.length >= 150 && meta.caption.length <= 3000 ? 100 : Math.max(0, Math.min(100, (meta.caption.length / 3000) * 100));
    const ctaScore = CTA_OPTIONS.some((c) => meta.caption.includes(c)) ? 100 : 0;
    const total = Math.round(charScore * 0.3 + (hashCount / 5) * 100 * 0.25 + hookScore * 0.25 + ctaScore * 0.2);
    if (mountedRef.current) setLiScore({ total: Math.min(100, total), character_count: meta.caption.length, hashtag_count: hashCount, hook_score: hookScore });
  }, [meta.caption, meta.hashtags]);

  useEffect(() => {
    computeScoreRef.current = () => computeScore();
  }, [computeScore]);

  useEffect(() => {
    const timer = setTimeout(() => computeScoreRef.current(), 300);
    return () => clearTimeout(timer);
  }, [meta.caption, meta.hashtags]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const save = useCallback(async (updates?: Partial<LinkedInMeta>) => {
    if (!projectIdNum) return;
    setSaving(true);
    setError("");
    const merged = updates ? { ...meta, ...updates } : meta;
    try {
      await fetch(`/api/projects/${projectId}/linkedin`, {
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

  const schedulePublish = async () => {
    if (!projectIdNum || !scheduleDate) return;
    setSaving(true);
    try {
      const scheduled_at = `${scheduleDate}T${scheduleTime}:00`;
      await fetch(`/api/projects/${projectId}/linkedin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectIdNum, scheduled_at }),
      });
      setMeta((prev) => ({ ...prev, scheduled_at }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to schedule. Please try again.");
    }
    setSaving(false);
  };

  const generateCaption = async () => {
    if (!meta.caption && !projectIdNum) return;
    setAiLoading(true);
    setError("");
    try {
      const topic = meta.caption || (await fetch(`/api/projects/${projectId}`).then((r) => r.json()).then((p) => p.topic)) || "";
      const res = await fetch("/api/seo/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform: "linkedin" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMeta((prev) => ({
        ...prev,
        caption: data.caption || data.description || prev.caption,
        hashtags: data.hashtags || prev.hashtags,
      }));
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
        body: JSON.stringify({ topic, platform: "linkedin_hashtags" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMeta((prev) => ({ ...prev, hashtags_suggested: data.hashtags || data.tags || "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate hashtags");
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
          <h1 className="text-2xl font-bold">LinkedIn Studio</h1>
          <p className="text-sm text-muted-foreground">Craft professional content, carousels, and articles for LinkedIn</p>
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
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "content" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <TypeIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Content Format</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {CONTENT_FORMATS.map((cf) => (
                    <button
                      key={cf.id}
                      onClick={() => setMeta((prev) => ({ ...prev, content_format: cf.id }))}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                        meta.content_format === cf.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      )}
                    >
                      <span className="text-lg">{cf.emoji}</span>
                      <span className="font-medium">{cf.label}</span>
                      <span className="text-muted-foreground text-center">{cf.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <TypeIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Post Headline</h3>
                </div>
                <input
                  type="text"
                  value={meta.headline}
                  onChange={(e) => setMeta((prev) => ({ ...prev, headline: e.target.value }))}
                  placeholder="Short, punchy headline for your post..."
                  className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">This appears as the bold title above your post. Keep it under 10 words.</p>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold">Post Caption</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={generateCaption}
                      disabled={aiLoading}
                      className="btn-gradient disabled:opacity-50 flex items-center gap-1.5 text-xs"
                    >
                      {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />}
                      AI Generate
                    </button>
                  </div>
                </div>
                <textarea
                  value={meta.caption}
                  onChange={(e) => setMeta((prev) => ({ ...prev, caption: e.target.value }))}
                  placeholder="Start with a hook that stops the scroll. Then deliver value. End with a question or CTA that invites engagement..."
                  className="w-full rounded-xl border border-border bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                  rows={10}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{meta.caption.length}/3,000 characters</span>
                  <span>{meta.caption.length < 150 ? "Add more for better reach" : meta.caption.length <= 3000 ? "Good length" : "Too long — trim for algorithm"}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Opening Hook</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {HOOK_PHRASES.map((hook) => (
                    <button
                      key={hook}
                      onClick={() => {
                        const rest = meta.caption.replace(new RegExp(`^(${HOOK_PHRASES.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "i"), "").trim();
                        setMeta((prev) => ({ ...prev, caption: hook + " " + rest }));
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        meta.caption.toLowerCase().startsWith(hook.toLowerCase()) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      )}
                    >
                      {hook}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <h3 className="text-sm font-semibold">Post Settings</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Industry</label>
                    <select
                      value={meta.industry}
                      onChange={(e) => setMeta((prev) => ({ ...prev, industry: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
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
                  placeholder="#yourbrand #industry #topic (3-5 specific hashtags, comma or newline separated)"
                  className="w-full rounded-xl border border-border bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                  rows={4}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{(meta.hashtags.match(/#/g) || []).length} hashtags</span>
                  <span>3–5 specific hashtags. #industry over #business.</span>
                </div>
                <button type="button" onClick={generateHashtags} disabled={aiLoading} className="btn-gradient disabled:opacity-50 flex items-center gap-1.5">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                  AI Generate Hashtags
                </button>
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

              <div className="rounded-2xl border border-border bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-2">
                <h3 className="text-sm font-semibold">LinkedIn Hashtag Strategy</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="font-medium text-blue-600">Broad (1–2)</p>
                    <p className="text-muted-foreground">#LinkedIn #Business #Leadership</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-indigo-600">Niche (2–3)</p>
                    <p className="text-muted-foreground">#TechRecruiting #B2BSales #ProductManagement</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-purple-600">Branded (0–1)</p>
                    <p className="text-muted-foreground">#YourBrandTagline</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "optimize" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-4">
                <h3 className="text-sm font-semibold">Content Score</h3>
                {liScore && (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="relative h-24 w-24">
                        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={`${liScore.total * 2.51} 251`}
                            className={cn(liScore.total >= 75 ? "text-blue-500" : liScore.total >= 50 ? "text-yellow-500" : "text-red-500")} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">{liScore.total}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <ScoreBar label="Caption Length" score={liScore.character_count} max={3000} />
                      <ScoreBar label="Hashtag Count" score={liScore.hashtag_count * (100 / 5)} />
                      <ScoreBar label="Hook Strength" score={liScore.hook_score} />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <h3 className="text-sm font-semibold">LinkedIn Best Practices</h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>• Lead with a hook that earns the &ldquo;...see more&rdquo; click</p>
                  <p>• Use 150–300 words for optimal engagement</p>
                  <p>• Include 3–5 specific hashtags (no #Business!)</p>
                  <p>• No external links in post body — use &ldquo;link in comments&rdquo;</p>
                  <p>• End with a question to drive comments</p>
                  <p>• Post Tuesday–Thursday, 7–9 AM or 12–1 PM</p>
                  <p>• Respond to all comments in the first 60 minutes</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <h3 className="text-sm font-semibold">Content Format Tips</h3>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <p className="font-medium text-blue-700">📝 Post</p>
                    <p className="text-muted-foreground">Best for stories, opinions, and quick insights</p>
                  </div>
                  <div className="p-3 rounded-lg bg-indigo-50">
                    <p className="font-medium text-indigo-700">📊 Carousel</p>
                    <p className="text-muted-foreground">Upload as native PDF. Hook on slide 1, one insight per slide</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50">
                    <p className="font-medium text-purple-700">📖 Article</p>
                    <p className="text-muted-foreground">Evergreen thought leadership, optimized for LinkedIn search</p>
                  </div>
                  <div className="p-3 rounded-lg bg-pink-50">
                    <p className="font-medium text-pink-700">🎬 Video</p>
                    <p className="text-muted-foreground">Native video gets 3–5x more reach than links</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "publish" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <h3 className="text-sm font-semibold">Pre-Publish Checklist</h3>
                <div className="space-y-2">
                  {[
                    { label: "Caption written (150+ chars)", ok: meta.caption.length >= 150 },
                    { label: "Hook phrase at start", ok: HOOK_PHRASES.some((h) => meta.caption.toLowerCase().startsWith(h.toLowerCase())) },
                    { label: "Hashtags (3–5)", ok: (meta.hashtags.match(/#/g) || []).length >= 3 && (meta.hashtags.match(/#/g) || []).length <= 5 },
                    { label: "CTA included", ok: !!meta.call_to_action },
                    { label: "Target audience set", ok: !!meta.target_audience },
                    { label: "Content format selected", ok: !!meta.content_format },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {item.ok ? <Check className="h-4 w-4 text-green-500" aria-hidden="true" /> : <X className="h-4 w-4 text-red-400" aria-hidden="true" />}
                      <span className={cn("text-sm", item.ok ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <h3 className="text-sm font-semibold">Caption Preview</h3>
                <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-sm">
                  <p className="font-medium">{meta.caption || "Your caption will appear here..."}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {meta.hashtags.split(",").map((h) => h.trim()).filter(Boolean).slice(0, 5).join(" ")}
                  </p>
                </div>
                <button type="button" onClick={copyCaption} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
                  <Copy className="h-3 w-3" aria-hidden="true" />
                  {copied ? "Copied!" : "Copy Full Caption + Hashtags"}
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
                <h3 className="text-sm font-semibold">Schedule Post</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={schedulePublish}
                  disabled={saving || !scheduleDate}
                  className="btn-gradient w-full disabled:opacity-50 text-sm"
                >
                  <Calendar className="h-4 w-4 inline mr-1" aria-hidden="true" />
                  {saving ? "Scheduling..." : "Schedule Post"}
                </button>
                <p className="text-xs text-muted-foreground text-center">Best times: Tue–Thu, 7–9 AM or 12–1 PM</p>
              </div>

              <button type="button" onClick={() => save()} disabled={saving} className="btn-gradient w-full disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                Save LinkedIn Metadata
              </button>
            </motion.div>
          )}
        </div>

        {activeTab !== "publish" && liScore && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
              <h3 className="text-sm font-semibold">LinkedIn Score</h3>
              <div className="flex justify-center">
                <div className="relative h-24 w-24">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${liScore.total * 2.51} 251`}
                      className={cn(liScore.total >= 75 ? "text-blue-500" : liScore.total >= 50 ? "text-yellow-500" : "text-red-500")} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">{liScore.total}</div>
                </div>
              </div>
              <div className="space-y-2">
                <ScoreBar label="Caption Length" score={liScore.character_count} max={3000} />
                <ScoreBar label="Hashtags" score={liScore.hashtag_count * (100 / 5)} />
                <ScoreBar label="Hook" score={liScore.hook_score} />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-2">
              <h3 className="text-sm font-semibold">Platform Tips</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Carousels get 3x more reach than images</p>
                <p>• First 2 lines show before &ldquo;more&rdquo; — hook there</p>
                <p>• Comments drive more than likes</p>
                <p>• Saves signal quality to the algorithm</p>
                <p>• Respond to comments within 60 min</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
