"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Palette, Type, MessageSquare, Image as ImageIcon, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "identity", label: "Identity", icon: Palette },
  { id: "voice", label: "Voice & Persona", icon: MessageSquare },
  { id: "visual", label: "Visual Assets", icon: ImageIcon },
  { id: "presets", label: "Platform Presets", icon: Type },
];

interface BrandKitData {
  brand_name: string;
  tagline: string;
  description: string;
  tone_of_voice: string;
  target_audience: string;
  key_messages: string;
  words_to_avoid: string;
  competitors: string;
  brand_story: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  language: string;
  voice_id: string;
}

const defaultKit: BrandKitData = {
  brand_name: "",
  tagline: "",
  description: "",
  tone_of_voice: "Professional",
  target_audience: "",
  key_messages: "",
  words_to_avoid: "",
  competitors: "",
  brand_story: "",
  primary_color: "#7C3AED",
  secondary_color: "#EC4899",
  accent_color: "#F97316",
  language: "English",
  voice_id: "",
};

export default function BrandKit() {
  const [activeTab, setActiveTab] = useState("identity");
  const [data, setData] = useState<BrandKitData>(defaultKit);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/brand-kit")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d && d.brand_name !== undefined) {
          setData((prev) => ({ ...prev, ...d }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  const updateField = useCallback(<K extends keyof BrandKitData>(key: K, value: BrandKitData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/brand-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brand Kit</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define your brand identity for consistent video generation</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
              <Check className="h-3 w-3" aria-hidden="true" /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-gradient text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </motion.div>
      )}

      <div className="flex gap-2 overflow-x-auto border-b border-border pb-1">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="space-y-6"
      >
        {activeTab === "identity" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label htmlFor="brand-name" className="label">Brand Name</label>
                <input
                  id="brand-name"
                  value={data.brand_name}
                  onChange={(e) => updateField("brand_name", e.target.value)}
                  placeholder="Your company name"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="brand-tagline" className="label">Tagline</label>
                <input
                  id="brand-tagline"
                  value={data.tagline}
                  onChange={(e) => updateField("tagline", e.target.value)}
                  placeholder="Your catchy tagline"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="brand-desc" className="label">Brand Description</label>
                <textarea
                  id="brand-desc"
                  value={data.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="What does your product do?"
                  className="input"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Brand Colors</label>
                <div className="flex flex-wrap gap-3">
                  {([
                    { key: "primary_color" as const, label: "Primary" },
                    { key: "secondary_color" as const, label: "Secondary" },
                    { key: "accent_color" as const, label: "Accent" },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <input
                        type="color"
                        value={data[key]}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="h-10 w-10 cursor-pointer rounded-xl border-2 border-border"
                        aria-label={`${label} color`}
                      />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{data[key]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="logo-upload" className="label">Logo Upload</label>
                <button
                  id="logo-upload"
                  onClick={() => alert("File upload coming soon — integrate with your storage provider.")}
                  className="flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50"
                >
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-2 text-sm text-muted-foreground">Drop logo here or click to upload</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "voice" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label htmlFor="language" className="label">Language</label>
                <select
                  id="language"
                  value={data.language}
                  onChange={(e) => updateField("language", e.target.value)}
                  className="input"
                >
                  <option value="English">English (US)</option>
                  <option value="English-Indian">English (Indian)</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>
              <div>
                <label htmlFor="voice-id" className="label">Voice ID</label>
                <input
                  id="voice-id"
                  value={data.voice_id}
                  onChange={(e) => updateField("voice_id", e.target.value)}
                  placeholder="English_expressive_narrator"
                  className="input"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Find voice IDs at /voices — or use: English_expressive_narrator, male-india-en
                </p>
              </div>
              <div>
                <label className="label">Tone of Voice</label>
                <div className="flex flex-wrap gap-2">
                  {["Playful", "Professional", "Edgy", "Friendly", "Authoritative"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateField("tone_of_voice", t)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        data.tone_of_voice === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="target-audience" className="label">Target Audience</label>
                <textarea
                  id="target-audience"
                  value={data.target_audience}
                  onChange={(e) => updateField("target_audience", e.target.value)}
                  placeholder="e.g., SaaS founders aged 25-40, technical but business-minded"
                  className="input"
                  rows={3}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="words-avoid" className="label">Words to Avoid</label>
                <input
                  id="words-avoid"
                  value={data.words_to_avoid}
                  onChange={(e) => updateField("words_to_avoid", e.target.value)}
                  placeholder="cheap, boring, complicated"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="competitors" className="label">Competitors</label>
                <input
                  id="competitors"
                  value={data.competitors}
                  onChange={(e) => updateField("competitors", e.target.value)}
                  placeholder="Competitor names for differentiation"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="brand-story" className="label">Brand Story</label>
                <textarea
                  id="brand-story"
                  value={data.brand_story}
                  onChange={(e) => updateField("brand_story", e.target.value)}
                  placeholder="Your origin story, mission, vision"
                  className="input"
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "visual" && (
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { label: "Brand Character / Mascot", desc: "Upload a face photo for character consistency" },
              { label: "Product Screenshots", desc: "5-10 key product screens" },
              { label: "Brand Photos", desc: "Team, office, event photos" },
            ].map((item) => (
              <div key={item.label}>
                <label className="label">{item.label}</label>
                <button
                  onClick={() => alert("File upload coming soon — integrate with your storage provider.")}
                  className="flex h-40 w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50"
                >
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "presets" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "Instagram Reels", platform: "instagram_reels", model: "Hailuo-2.3", res: "720P", dur: "6s" },
              { name: "LinkedIn", platform: "linkedin", model: "Hailuo-2.3", res: "1080P", dur: "10s" },
              { name: "YouTube Shorts", platform: "youtube_shorts", model: "Hailuo-2.3", res: "1080P", dur: "6s" },
              { name: "YouTube Long", platform: "youtube_long", model: "Hailuo-02", res: "1080P", dur: "10s" },
            ].map((preset) => (
              <div key={preset.platform} className="card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{preset.name}</h3>
                  <span className="badge bg-muted text-muted-foreground">{preset.platform}</span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>Model: {preset.model}</p>
                  <p>Resolution: {preset.res}</p>
                  <p>Duration: {preset.dur}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}