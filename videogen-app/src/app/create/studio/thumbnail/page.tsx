"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Download,
  Sparkles,
  Type as TypeIcon,
  Film,
  Layers,
  Wand2,
  Trash2,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

const aspectRatios = [
  { label: "16:9", value: "16:9", w: 1280, h: 720, platform: "YouTube / Bilibili" },
  { label: "1:1", value: "1:1", w: 1024, h: 1024, platform: "Instagram Feed / Facebook" },
  { label: "9:16", value: "9:16", w: 720, h: 1280, platform: "Shorts / Reels / TikTok" },
  { label: "4:5", value: "4:5", w: 1080, h: 1350, platform: "Instagram Feed / Pinterest" },
];

const bgPresets = [
  { name: "Solid Dark", style: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", emoji: "🌑" },
  { name: "Gradient Warm", style: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", emoji: "🌅" },
  { name: "Gradient Cool", style: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", emoji: "🌊" },
  { name: "Gradient Sunset", style: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", emoji: "🌇" },
  { name: "Earth Tone", style: "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)", emoji: "🍂" },
  { name: "Teal Mint", style: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)", emoji: "🌿" },
  { name: "Purple Haze", style: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", emoji: "💜" },
  { name: "Fire", style: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)", emoji: "🔥" },
  { name: "Neon Night", style: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)", emoji: "🌃" },
  { name: "Cinematic Blue", style: "linear-gradient(135deg, #1a1a1a 0%, #2d3436 100%)", emoji: "🎬" },
  { name: "Soft Peach", style: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", emoji: "🌸" },
  { name: "Deep Space", style: "linear-gradient(135deg, #000428 0%, #004e92 100%)", emoji: "🚀" },
];

const thumbStylePresets = [
  { id: "bold-title", label: "Bold Title", promptSuffix: "Bold typography title card, strong contrast, minimal background, readable title text prominently displayed", emoji: "✦" },
  { id: "emotional", label: "Emotional", promptSuffix: "Emotional close-up portrait, dramatic lighting from side, shallow depth of field, cinematic mood, high-impact facial expression", emoji: "💫" },
  { id: "product-focus", label: "Product Focus", promptSuffix: "Product-centered composition, clean studio lighting, soft shadow, professional commercial photography style, product in sharp focus", emoji: "📦" },
  { id: "action-text", label: "Action Text", promptSuffix: "Dynamic action scene frozen in motion, bold text overlay with strong visual hierarchy, high energy composition", emoji: "⚡" },
  { id: "minimalist", label: "Minimalist", promptSuffix: "Minimalist clean composition, single subject, negative space, muted color palette, understated elegance, professional aesthetic", emoji: "◻️" },
  { id: "vibrant-life", label: "Vibrant Life", promptSuffix: "Vibrant colorful scene with natural light, energetic mood, saturated colors, lifestyle photography, inspiring atmosphere", emoji: "🌈" },
];

interface ThumbnailVariant {
  id: string;
  label: string;
  promptSuffix: string;
  result: string | null;
  loading: boolean;
}

function extractFrame(videoUrl: string, time: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    const cleanup = () => {
      video.pause();
      video.src = "";
      video.load();
    };
    video.addEventListener("loadeddata", () => {
      video.currentTime = time;
    });
    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        return reject(new Error("Canvas not supported"));
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      cleanup();
      resolve(canvas.toDataURL("image/png"));
    });
    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Failed to load video"));
    });
    video.addEventListener("abort", () => {
      cleanup();
    });
    video.load();
  });
}

export default function ThumbnailStudio() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [videoUrl, setVideoUrl] = useState("");
  const [extractedFrame, setExtractedFrame] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [selectedBg, setSelectedBg] = useState<string>("");
  const [customBg, setCustomBg] = useState<string>("");
  const [variants, setVariants] = useState<ThumbnailVariant[]>([
    {
      id: "preset-1",
      label: "Preset 1",
      promptSuffix: thumbStylePresets[0].promptSuffix,
      result: null,
      loading: false,
    },
    {
      id: "preset-2",
      label: "Preset 2",
      promptSuffix: thumbStylePresets[1].promptSuffix,
      result: null,
      loading: false,
    },
    {
      id: "preset-3",
      label: "Preset 3",
      promptSuffix: thumbStylePresets[2].promptSuffix,
      result: null,
      loading: false,
    },
  ]);

  const titleValid = title.trim().length >= 3 && title.trim().length <= 100;

  // Auto-dismiss errors
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  async function extractFromVideo() {
    if (!videoUrl) {
      setError("Enter a video URL first");
      return;
    }
    setExtracting(true);
    setError("");
    try {
      const frame = await extractFrame(videoUrl, 1);
      if (!mountedRef.current) return;
      setExtractedFrame(frame);
    } catch {
      if (!mountedRef.current) return;
      setError("Failed to extract frame. Ensure the video URL supports CORS.");
    }
    if (!mountedRef.current) return;
    setExtracting(false);
  }

  async function generateVariant(variant: ThumbnailVariant) {
    if (!titleValid) return;
    setVariants((prev) => prev.map((v) => v.id === variant.id ? { ...v, loading: true } : v));
    setError("");
    try {
      const prompt = extractedFrame
        ? `Thumbnail for: "${title}". ${subtitle ? `Subtitle: "${subtitle}".` : ""} ${variant.promptSuffix}. Use this scene composition: [subject from extracted frame].`
        : `Thumbnail for: "${title}". ${subtitle ? `Subtitle: "${subtitle}".` : ""} ${variant.promptSuffix}`;
      const res = await fetch("/api/minimax/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspect_ratio: ratio,
          n: 1,
          response_format: "base64",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      let imageData: string | null = null;
      if (data.base64?.[0]) {
        imageData = `data:image/png;base64,${data.base64[0]}`;
      } else if (data.data?.[0]?.image) {
        imageData = `data:image/png;base64,${data.data[0].image}`;
      }
      if (!imageData) throw new Error("No image returned");
      if (!mountedRef.current) return;
      setVariants((prev) => prev.map((v) => v.id === variant.id ? { ...v, result: imageData, loading: false } : v));
    } catch {
      if (!mountedRef.current) return;
      setError(`Failed to generate ${variant.label}. Check your API key.`);
      setVariants((prev) => prev.map((v) => v.id === variant.id ? { ...v, loading: false } : v));
    }
  }

  async function generateAll() {
    if (!titleValid) return;
    const pending = variants.filter((v) => !v.result);
    await Promise.all(pending.map((v) => generateVariant(v)));
  }

  function downloadImage(dataUrl: string, name: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = name;
    a.click();
  }

  function clearResults() {
    setVariants((prev) => prev.map((v) => ({ ...v, result: null, loading: false })));
    setExtractedFrame(null);
    setSelectedBg("");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thumbnail Studio</h1>
          <p className="text-sm text-muted-foreground">Generate thumbnails with style presets and gradient backgrounds</p>
        </div>
        <div className="flex gap-2">
          {variants.some((v) => v.result) && (
            <button
              type="button"
              onClick={clearResults}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError("")} className="rounded-md bg-destructive/20 px-2 py-1 text-xs font-medium hover:bg-destructive/30">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Controls */}
        <div className="space-y-4 lg:col-span-1">
          <div>
            <label htmlFor="thumb-title" className="mb-2 block text-sm font-medium">Title</label>
            <input
              id="thumb-title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="Your video title..."
              className={cn(
                "w-full rounded-xl border bg-white p-3 text-sm outline-none transition-colors",
                title.length > 0 && !titleValid ? "border-destructive focus:ring-2 focus:ring-destructive" : "border-border focus:ring-2 focus:ring-primary"
              )}
              aria-invalid={title.length > 0 && !titleValid}
              aria-describedby="thumb-title-hint"
            />
            <p id="thumb-title-hint" className="mt-1 text-xs text-muted-foreground">
              {title.length}/100 {title.length > 0 && !titleValid && "(minimum 3 chars)"}
            </p>
          </div>

          <div>
            <label htmlFor="thumb-subtitle" className="mb-2 block text-sm font-medium">Subtitle (optional)</label>
            <input
              id="thumb-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Supporting text or hook..."
              className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Aspect Ratio</label>
            <div className="flex flex-wrap gap-2">
              {aspectRatios.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setRatio(r.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors flex flex-col items-start",
                    ratio === r.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <span>{r.label}</span>
                  <span className="text-[10px] text-muted-foreground">{r.platform}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Presets */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Background</h3>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {bgPresets.map((bg) => (
                <button
                  key={bg.name}
                  type="button"
                  onClick={() => setSelectedBg(bg.style)}
                  className={cn(
                    "h-10 w-full rounded-lg border-2 transition-all",
                    selectedBg === bg.style ? "border-primary scale-105" : "border-border hover:scale-102"
                  )}
                  style={{ background: bg.style }}
                  title={bg.name}
                  aria-label={bg.name}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="color"
                value={customBg || "#1a1a2e"}
                onChange={(e) => { setCustomBg(e.target.value); setSelectedBg(""); }}
                className="h-10 w-10 cursor-pointer rounded border border-border"
              />
              <input
                value={customBg}
                onChange={(e) => { setCustomBg(e.target.value); setSelectedBg(e.target.value); }}
                placeholder="Or paste gradient CSS..."
                className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
              {selectedBg && (
                <button
                  type="button"
                  onClick={() => setSelectedBg("")}
                  className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Style Presets */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Style Presets</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {thumbStylePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setVariants((prev) => prev.map((v) => ({
                      ...v,
                      label: preset.label,
                      promptSuffix: preset.promptSuffix,
                    })));
                  }}
                  className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 text-xs hover:bg-muted transition-colors"
                >
                  <span>{preset.emoji}</span>
                  <span className="text-[10px] leading-tight text-center">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Frame Extraction */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Film className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Frame Extraction</h3>
            </div>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Paste video URL..."
              className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary mb-2"
            />
            <button
              type="button"
              onClick={extractFromVideo}
              disabled={extracting || !videoUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Film className="h-4 w-4" aria-hidden="true" />}
              Extract Frame at 1s
            </button>
            {extractedFrame && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 relative"
              >
                <p className="text-xs text-muted-foreground mb-1">Extracted frame:</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={extractedFrame} alt="Extracted frame" className="rounded-xl w-full object-cover" />
                <button
                  type="button"
                  onClick={() => downloadImage(extractedFrame, `frame-${Date.now()}.png`)}
                  className="absolute right-2 top-6 rounded-lg bg-white/90 p-2 shadow-sm hover:bg-white"
                  aria-label="Download frame"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </div>

          <button
            type="button"
            onClick={generateAll}
            disabled={!titleValid || variants.some((v) => v.loading)}
            className="btn-gradient w-full disabled:opacity-50"
          >
            <Layers className="h-4 w-4 inline mr-1" aria-hidden="true" />
            Generate All 3 Variants
          </button>
        </div>

        {/* Right: Variants Grid */}
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Variants</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {variants.map((variant) => (
              <div key={variant.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{variant.label}</span>
                  {variant.result && (
                    <button
                      type="button"
                      onClick={() => downloadImage(variant.result!, `thumbnail-${variant.id}-${Date.now()}.png`)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                      aria-label={`Download ${variant.label}`}
                    >
                      <Download className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="relative aspect-video rounded-2xl border border-border bg-muted/30 overflow-hidden">
                  {variant.result ? (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={variant.result}
                      alt={variant.label}
                      className="h-full w-full object-cover"
                    />
                  ) : variant.loading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" aria-hidden="true" />
                      <p className="mt-1 text-xs">Click generate</p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => generateVariant(variant)}
                  disabled={variant.loading || !titleValid}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted disabled:opacity-50"
                >
                  {variant.loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                  )}
                  {variant.loading ? "Generating..." : variant.result ? "Regenerate" : "Generate"}
                </button>
              </div>
            ))}
          </div>

          {/* Text Preview */}
          <div className="mt-6 rounded-xl border border-border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TypeIcon className="h-4 w-4 text-primary" aria-hidden="true" />
              Text Preview
            </div>
            <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
              <p className="text-lg font-bold">{title || "Your Title"}</p>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              {extractedFrame && (
                <p className="text-xs text-success">Frame extracted — will guide AI composition</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
