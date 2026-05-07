"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Captions,
  Loader2,
  AlertCircle,
  Download,
  Plus,
  Trash2,
  Clock,
  Type,
  Play,
  Palette,
  Move,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CaptionStyle {
  fontSize: number;
  fontColor: string;
  bgColor: string;
  position: "bottom" | "middle" | "top";
  fontWeight: "normal" | "bold" | "black";
  textTransform: "none" | "uppercase";
  animation: AnimationType;
  fontFamily: string;
  letterSpacing: number;
  lineHeight: number;
  strokeWidth: number;
  strokeColor: string;
  shadowColor: string;
  shadowBlur: number;
  highlightColor: string;
  highlightBgColor: string;
}

type AnimationType = "none" | "fade" | "slide-up" | "slide-down" | "bounce" | "typewriter" | "pop" | "zoom";

interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style?: Partial<CaptionStyle>;
}

const defaultStyle: CaptionStyle = {
  fontSize: 24,
  fontColor: "#FFFFFF",
  bgColor: "rgba(0,0,0,0.6)",
  position: "bottom",
  fontWeight: "bold",
  textTransform: "none",
  animation: "slide-up",
  fontFamily: "Inter",
  letterSpacing: 0.5,
  lineHeight: 1.4,
  strokeWidth: 0,
  strokeColor: "#000000",
  shadowColor: "#000000",
  shadowBlur: 4,
  highlightColor: "#FACC15",
  highlightBgColor: "rgba(250,204,21,0.25)",
};

const fontFamilies = [
  { value: "Inter", label: "Inter (Sans)" },
  { value: "Bebas Neue", label: "Bebas Neue (Display)" },
  { value: "Oswald", label: "Oswald (Bold)" },
  { value: "Roboto Condensed", label: "Roboto Condensed" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Playfair Display", label: "Playfair Display (Serif)" },
  { value: "Source Han Sans", label: "Source Han Sans (CN)" },
  { value: "Alibaba PuHuiTi", label: "Alibaba PuHuiTi (CN)" },
  { value: "Noto Sans SC", label: "Noto Sans SC" },
];

const stylePresets: { name: string; emoji: string; style: Partial<CaptionStyle> }[] = [
  {
    name: "Variety Show",
    emoji: "🎬",
    style: { fontSize: 30, fontColor: "#FFFFFF", bgColor: "rgba(0,0,0,0.75)", fontWeight: "bold", animation: "bounce", fontFamily: "Bebas Neue", letterSpacing: 2, strokeWidth: 2, strokeColor: "#000000" },
  },
  {
    name: "Clean Minimal",
    emoji: "✨",
    style: { fontSize: 22, fontColor: "#FFFFFF", bgColor: "transparent", fontWeight: "normal", animation: "fade", fontFamily: "Inter", letterSpacing: 0, strokeWidth: 0 },
  },
  {
    name: "Cinematic",
    emoji: "🎥",
    style: { fontSize: 24, fontColor: "#E8D5B7", bgColor: "rgba(0,0,0,0.5)", fontWeight: "bold", animation: "slide-up", fontFamily: "Roboto Condensed", letterSpacing: 1, strokeWidth: 1, strokeColor: "#1a1a1a" },
  },
  {
    name: "Bold Impact",
    emoji: "💥",
    style: { fontSize: 32, fontColor: "#FFFFFF", bgColor: "rgba(220,38,38,0.85)", fontWeight: "black", animation: "zoom", fontFamily: "Oswald", letterSpacing: 3, strokeWidth: 3, strokeColor: "#000000" },
  },
  {
    name: "Cyberpunk",
    emoji: "🤖",
    style: { fontSize: 26, fontColor: "#00FFFF", bgColor: "rgba(0,0,0,0.6)", fontWeight: "bold", animation: "pop", fontFamily: "Montserrat", letterSpacing: 2, strokeWidth: 2, strokeColor: "#FF00FF", shadowColor: "#FF00FF", shadowBlur: 8 },
  },
  {
    name: "Vintage Film",
    emoji: "🎞️",
    style: { fontSize: 24, fontColor: "#F5E6C8", bgColor: "rgba(60,40,10,0.7)", fontWeight: "normal", animation: "fade", fontFamily: "Playfair Display", letterSpacing: 0, strokeWidth: 1, strokeColor: "#2d1a0a" },
  },
];

const fontSizes = [16, 20, 24, 28, 32, 36, 40, 48];
const fontColors = ["#FFFFFF", "#000000", "#FACC15", "#F97316", "#EF4444", "#22C55E", "#3B82F6", "#A855F7", "#EC4899"];
const bgColors = ["rgba(0,0,0,0.6)", "rgba(0,0,0,0.3)", "rgba(255,255,255,0.8)", "rgba(255,255,255,0.3)", "transparent"];
const animations: { value: AnimationType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
  { value: "bounce", label: "Bounce" },
  { value: "typewriter", label: "Typewriter" },
  { value: "pop", label: "Pop" },
  { value: "zoom", label: "Zoom" },
];

function getAnimationClass(animation: AnimationType) {
  switch (animation) {
    case "fade": return "animate-caption-fade";
    case "slide-up": return "animate-caption-slide-up";
    case "slide-down": return "animate-caption-slide-down";
    case "bounce": return "animate-caption-bounce";
    case "typewriter": return "animate-caption-typewriter";
    case "pop": return "animate-caption-pop";
    case "zoom": return "animate-caption-zoom";
    default: return "";
  }
}

function getPositionClass(position: CaptionStyle["position"]) {
  switch (position) {
    case "top": return "items-start pt-8";
    case "middle": return "items-center";
    case "bottom": return "items-end pb-8";
    default: return "items-end pb-8";
  }
}

export default function CaptionStudio() {
  const [script, setScript] = useState("");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [globalStyle, setGlobalStyle] = useState<CaptionStyle>(defaultStyle);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const scriptValid = script.trim().length >= 10;

  // Auto-dismiss errors
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  // Preview cycling
  useEffect(() => {
    if (!isPlaying || captions.length === 0) return;
    const interval = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % captions.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying, captions.length]);

  async function generateCaptions() {
    if (!scriptValid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/minimax/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are a caption generator. Break the text into short, readable caption segments. Return JSON array with {text, startTime, endTime} in seconds.",
            },
            { role: "user", content: script },
          ],
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      const content = data.content?.[0]?.text || data.choices?.[0]?.message?.content || "";
      let parsed: unknown;
      try { parsed = JSON.parse(content); } catch { throw new Error("Failed to parse caption response"); }
      const newCaps: Caption[] = [];
      const estimatedDuration = 120;
      if (Array.isArray(parsed)) {
        newCaps.push(...parsed.map((c: Record<string, unknown>, i: number) => ({
          id: String(i),
          text: String(c.text || c.caption || c.content || ""),
          startTime: Number(c.startTime ?? c.start ?? (i / parsed.length) * estimatedDuration),
          endTime: Number(c.endTime ?? c.end ?? ((i + 1) / parsed.length) * estimatedDuration),
          style: {},
        })));
      } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).captions)) {
        const caps = (parsed as Record<string, unknown>).captions as Record<string, unknown>[];
        newCaps.push(...caps.map((c: Record<string, unknown>, i: number) => ({
          id: String(i),
          text: String(c.text || c.caption || c.content || ""),
          startTime: Number(c.startTime ?? c.start ?? (i / caps.length) * estimatedDuration),
          endTime: Number(c.endTime ?? c.end ?? ((i + 1) / caps.length) * estimatedDuration),
          style: {},
        })));
      } else if (parsed && typeof parsed === "object" && "text" in parsed) {
        const txt = String((parsed as Record<string, unknown>).text);
        const sentences = txt.split(/[.!?]+/).filter(Boolean);
        const capDuration = estimatedDuration / Math.max(sentences.length, 1);
        newCaps.push(...sentences.map((s: string, i: number) => ({
          id: String(i),
          text: s.trim(),
          startTime: i * capDuration,
          endTime: (i + 1) * capDuration,
          style: {},
        })));
      }
      if (newCaps.length === 0) throw new Error("No captions generated");
      setCaptions(newCaps);
      if (newCaps.length > 0) setSelectedCaptionId(newCaps[0].id);
    } catch {
      setError("Failed to generate captions. Please try again or add manually.");
    }
    setLoading(false);
  }

  function addCaption() {
    const lastEnd = captions.length > 0 ? captions[captions.length - 1].endTime : 0;
    const newCap: Caption = {
      id: Date.now().toString(),
      text: "",
      startTime: lastEnd,
      endTime: lastEnd + 2,
      style: {},
    };
    setCaptions((prev) => [...prev, newCap]);
    setSelectedCaptionId(newCap.id);
  }

  function updateCaption(id: string, field: keyof Caption, value: unknown) {
    setCaptions((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function updateCaptionStyle(id: string, field: keyof CaptionStyle, value: unknown) {
    setCaptions((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, style: { ...c.style, [field]: value } } : c
      )
    );
  }

  function deleteCaption(id: string) {
    setCaptions((prev) => prev.filter((c) => c.id !== id));
    if (selectedCaptionId === id) setSelectedCaptionId(null);
  }

  function applyGlobalStyle() {
    setCaptions((prev) =>
      prev.map((c) => ({ ...c, style: { ...globalStyle } }))
    );
  }

  function getEffectiveStyle(caption: Caption): CaptionStyle {
    return { ...globalStyle, ...caption.style };
  }

  function downloadSRT() {
    if (captions.length === 0) return;
    let srt = "";
    captions.forEach((c, i) => {
      const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 1000);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };
      srt += `${i + 1}\n${formatTime(c.startTime)} --> ${formatTime(c.endTime)}\n${c.text}\n\n`;
    });
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `captions-${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadStyledJSON() {
    if (captions.length === 0) return;
    const payload = captions.map((c) => ({
      ...c,
      style: getEffectiveStyle(c),
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `captions-styled-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedCaption = captions.find((c) => c.id === selectedCaptionId);
  const previewCaption = captions[previewIndex];

  async function generateFromTTS() {
    if (!script.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/minimax/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script, voice_id: "English_expressive_narrator" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "TTS failed");
      const audioBase64 = data.data || "";
      if (!audioBase64) throw new Error("No audio returned");
      const scriptWords = script.trim().split(/\s+/);
      const numCaps = Math.min(scriptWords.length, 20);
      const avgWordSec = 0.4;
      const capDuration = (scriptWords.length * avgWordSec) / numCaps;
      const newCaps: Caption[] = [];
      for (let i = 0; i < numCaps; i++) {
        const wordStart = Math.floor((i / numCaps) * scriptWords.length);
        const wordEnd = Math.floor(((i + 1) / numCaps) * scriptWords.length);
        const text = scriptWords.slice(wordStart, wordEnd).join(" ");
        newCaps.push({
          id: String(i),
          text,
          startTime: parseFloat((i * capDuration).toFixed(2)),
          endTime: parseFloat(((i + 1) * capDuration).toFixed(2)),
          style: {},
        });
      }
      setCaptions(newCaps);
      if (newCaps.length > 0) setSelectedCaptionId(newCaps[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate captions from TTS");
    }
    setLoading(false);
  }

  function downloadASS() {
    if (captions.length === 0) return;
    const formatTime = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 100);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
    };
    let ass = "[Script Info]\nTitle: VideoGen Captions\nPlayResX: 1920\nPlayResY: 1080\n\n";
    ass += "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n";
    for (const preset of stylePresets) {
      const s = { ...globalStyle, ...preset.style };
      const fc = s.fontColor.replace("#", "&H") + "FF";
      const oc = s.strokeColor.replace("#", "&H") + "FF";
      const shc = s.shadowColor.replace("#", "&H") + "FF";
      ass += `Style: ${preset.name},${s.fontFamily},${s.fontSize},${fc},${fc},${oc},${shc},${s.fontWeight === "bold" || s.fontWeight === "black" ? -1 : 0},0,0,0,100,100,${s.letterSpacing},0,${s.bgColor === "transparent" ? 3 : 1},${s.strokeWidth},${s.shadowBlur},7,10,10,10,1\n`;
    }
    ass += "Style: Default,Inter,24,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,4,2,10,10,10,1\n\n";
    ass += "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n";
    for (const c of captions) {
      const style = getEffectiveStyle(c);
      const styleName = stylePresets.find((p) => p.style.fontFamily === style.fontFamily)?.name || "Default";
      const text = c.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      ass += `Dialogue: 0,${formatTime(c.startTime)},${formatTime(c.endTime)},${styleName},,0,0,0,,{\\pos(960,${style.position === "top" ? 100 : style.position === "middle" ? 540 : 980})}\n${text}\n`;
    }
    const blob = new Blob([ass], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `captions-${Date.now()}.ass`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caption Studio</h1>
          <p className="text-sm text-muted-foreground">Generate, style, and animate video captions</p>
        </div>
        <div className="flex gap-2">
          {captions.length > 0 && (
            <>
              <button
                type="button"
                onClick={downloadSRT}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Download className="inline h-3 w-3 mr-1" aria-hidden="true" />
                SRT
              </button>
              <button
                type="button"
                onClick={downloadStyledJSON}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Download className="inline h-3 w-3 mr-1" aria-hidden="true" />
                JSON
              </button>
              <button
                type="button"
                onClick={downloadASS}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Download className="inline h-3 w-3 mr-1" aria-hidden="true" />
                ASS
              </button>
            </>
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
        {/* Left: Script & Generation */}
        <div className="space-y-4 lg:col-span-1">
          <div>
            <label htmlFor="script-input" className="mb-2 block text-sm font-medium">Script</label>
            <textarea
              id="script-input"
              value={script}
              onChange={(e) => { setScript(e.target.value); setError(""); }}
              placeholder="Paste your video script here to auto-generate captions..."
              className={cn(
                "w-full rounded-xl border bg-white p-4 text-sm outline-none transition-colors",
                script.length > 0 && !scriptValid ? "border-destructive focus:ring-2 focus:ring-destructive" : "border-border focus:ring-2 focus:ring-primary"
              )}
              rows={6}
              aria-invalid={script.length > 0 && !scriptValid}
              aria-describedby="script-hint"
            />
            <p id="script-hint" className="mt-1 text-xs text-muted-foreground">
              {script.length > 0 && !scriptValid && "(minimum 10 chars)"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-generate"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="auto-generate" className="text-sm">Auto-generate from script</label>
          </div>

          <button
            type="button"
            onClick={generateCaptions}
            disabled={loading || !scriptValid}
            className="btn-gradient w-full disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Captions className="h-4 w-4" aria-hidden="true" />}
            Generate Captions
          </button>

          {scriptValid && (
            <button
              type="button"
              onClick={generateFromTTS}
              disabled={loading}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <Sparkles className="inline h-4 w-4 mr-1" aria-hidden="true" />
              Generate from TTS (AI Timing)
            </button>
          )}

          {/* Global Styles */}
          {captions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-card"
            >
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Global Style</h3>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Animation</label>
                <select
                  value={globalStyle.animation}
                  onChange={(e) => setGlobalStyle((s) => ({ ...s, animation: e.target.value as AnimationType }))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  {animations.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Position</label>
                <div className="flex gap-2">
                  {(["bottom", "middle", "top"] as const).map((pos) => (
                    <button
                      type="button"
                      key={pos}
                      onClick={() => setGlobalStyle((s) => ({ ...s, position: pos }))}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-xs capitalize transition-colors",
                        globalStyle.position === pos ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      )}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Font Size</label>
                <div className="flex flex-wrap gap-1">
                  {fontSizes.map((size) => (
                    <button
                      type="button"
                      key={size}
                      onClick={() => setGlobalStyle((s) => ({ ...s, fontSize: size }))}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs transition-colors",
                        globalStyle.fontSize === size ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      )}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Text Color</label>
                <div className="flex flex-wrap gap-2">
                  {fontColors.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setGlobalStyle((s) => ({ ...s, fontColor: color }))}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-transform",
                        globalStyle.fontColor === color ? "border-primary scale-110" : "border-border"
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Font color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Background</label>
                <div className="flex flex-wrap gap-2">
                  {bgColors.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setGlobalStyle((s) => ({ ...s, bgColor: color }))}
                      className={cn(
                        "h-8 w-12 rounded-lg border-2 transition-transform",
                        globalStyle.bgColor === color ? "border-primary scale-105" : "border-border"
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Background ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGlobalStyle((s) => ({ ...s, fontWeight: s.fontWeight === "bold" ? "normal" : "bold" }))}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs transition-colors",
                    globalStyle.fontWeight === "bold" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  )}
                >
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() => setGlobalStyle((s) => ({ ...s, textTransform: s.textTransform === "uppercase" ? "none" : "uppercase" }))}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs transition-colors",
                    globalStyle.textTransform === "uppercase" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  )}
                >
                  UPPER
                </button>
              </div>

              <button
                type="button"
                onClick={applyGlobalStyle}
                className="btn-gradient w-full text-xs"
              >
                <Sparkles className="h-3 w-3 inline mr-1" aria-hidden="true" />
                Apply to All
              </button>
            </motion.div>
          )}

          {/* Style Presets */}
          {captions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Style Presets</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {stylePresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setGlobalStyle((s) => ({ ...s, ...preset.style }))}
                    className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 text-xs hover:bg-muted transition-colors"
                    title={preset.name}
                  >
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="text-[10px] leading-tight text-center">{preset.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Advanced Style Controls */}
          {captions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3"
            >
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Advanced Style</h3>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Font Family</label>
                <select
                  value={globalStyle.fontFamily}
                  onChange={(e) => setGlobalStyle((s) => ({ ...s, fontFamily: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  {fontFamilies.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Letter Spacing</label>
                  <input
                    type="number"
                    value={globalStyle.letterSpacing}
                    onChange={(e) => setGlobalStyle((s) => ({ ...s, letterSpacing: parseFloat(e.target.value) || 0 }))}
                    step="0.1"
                    min="0"
                    max="10"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Line Height</label>
                  <input
                    type="number"
                    value={globalStyle.lineHeight}
                    onChange={(e) => setGlobalStyle((s) => ({ ...s, lineHeight: parseFloat(e.target.value) || 1 }))}
                    step="0.1"
                    min="1"
                    max="3"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Text Stroke</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={globalStyle.strokeWidth}
                    onChange={(e) => setGlobalStyle((s) => ({ ...s, strokeWidth: parseFloat(e.target.value) || 0 }))}
                    step="0.5"
                    min="0"
                    max="8"
                    className="w-16 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="px"
                  />
                  <input
                    type="color"
                    value={globalStyle.strokeColor}
                    onChange={(e) => setGlobalStyle((s) => ({ ...s, strokeColor: e.target.value }))}
                    className="h-10 w-10 cursor-pointer rounded border border-border"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Drop Shadow</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={globalStyle.shadowBlur}
                    onChange={(e) => setGlobalStyle((s) => ({ ...s, shadowBlur: parseFloat(e.target.value) || 0 }))}
                    step="1"
                    min="0"
                    max="20"
                    className="w-16 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="blur"
                  />
                  <input
                    type="color"
                    value={globalStyle.shadowColor}
                    onChange={(e) => setGlobalStyle((s) => ({ ...s, shadowColor: e.target.value }))}
                    className="h-10 w-10 cursor-pointer rounded border border-border"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Highlight Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={globalStyle.highlightColor}
                    onChange={(e) => setGlobalStyle((s) => ({ ...s, highlightColor: e.target.value }))}
                    className="h-10 w-10 cursor-pointer rounded border border-border"
                  />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={globalStyle.highlightBgColor !== ""}
                      onChange={(e) => setGlobalStyle((s) => ({ ...s, highlightBgColor: e.target.checked ? "rgba(250,204,21,0.25)" : "" }))}
                      className="h-3 w-3 rounded border-border"
                    />
                    <span>Highlight BG</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Middle: Caption List */}
        <div className="space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Captions ({captions.length})</label>
            <button
              type="button"
              onClick={addCaption}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <Plus className="inline h-3 w-3 mr-1" aria-hidden="true" />
              Add
            </button>
          </div>

          <div className="max-h-[500px] space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4">
            {captions.length === 0 ? (
              <div className="flex h-[200px] flex-col items-center justify-center text-muted-foreground">
                <Type className="h-8 w-8" aria-hidden="true" />
                <p className="mt-2 text-sm">No captions yet</p>
                <p className="text-xs">Generate from script or add manually</p>
              </div>
            ) : (
              captions.map((c) => {
                const isSelected = c.id === selectedCaptionId;
                const style = getEffectiveStyle(c);
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedCaptionId(c.id)}
                    className={cn(
                      "cursor-pointer rounded-lg border-2 p-3 transition-all",
                      isSelected ? "border-primary bg-white shadow-card" : "border-transparent bg-white hover:border-border"
                    )}
                  >
                    <div className="flex gap-2">
                      <div className="flex w-16 shrink-0 flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          <input
                            type="number"
                            value={c.startTime}
                            onChange={(e) => updateCaption(c.id, "startTime", parseFloat(e.target.value) || 0)}
                            step="0.1"
                            className="w-12 rounded border border-border px-1 py-0.5 text-xs"
                            aria-label="Start time"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          <input
                            type="number"
                            value={c.endTime}
                            onChange={(e) => updateCaption(c.id, "endTime", parseFloat(e.target.value) || 0)}
                            step="0.1"
                            className="w-12 rounded border border-border px-1 py-0.5 text-xs"
                            aria-label="End time"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <input
                        value={c.text}
                        onChange={(e) => updateCaption(c.id, "text", e.target.value)}
                        placeholder="Caption text..."
                        className="flex-1 rounded border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Caption text"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteCaption(c.id); }}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete caption"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {style.animation}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {style.position}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {style.fontSize}px
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Preview & Per-Caption Style */}
        <div className="space-y-4 lg:col-span-1">
          {/* Preview */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Preview</h3>
              <button
                type="button"
                onClick={() => { setIsPlaying((p) => !p); setPreviewIndex(0); }}
                disabled={captions.length === 0}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
              >
                <Play className="h-3 w-3" aria-hidden="true" />
                {isPlaying ? "Pause" : "Play"}
              </button>
            </div>
            <div className="relative aspect-9/16 overflow-hidden rounded-2xl border border-border bg-black">
              <div className="absolute inset-0 bg-linear-to-br from-violet-900/40 to-pink-900/40" />
              <div className={cn("absolute inset-0 flex flex-col px-4", getPositionClass(globalStyle.position))}>
                <AnimatePresence mode="wait">
                  {previewCaption && (
                    <motion.div
                      key={previewCaption.id + previewIndex + (isPlaying ? "play" : "pause")}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full text-center"
                    >
                       <span
                         className={cn(
                           "inline-block px-4 py-2",
                           getAnimationClass(getEffectiveStyle(previewCaption).animation)
                         )}
                         style={{
                           fontSize: `${getEffectiveStyle(previewCaption).fontSize}px`,
                           color: getEffectiveStyle(previewCaption).fontColor,
                           backgroundColor: getEffectiveStyle(previewCaption).bgColor,
                           fontWeight: getEffectiveStyle(previewCaption).fontWeight,
                           textTransform: getEffectiveStyle(previewCaption).textTransform,
                           fontFamily: getEffectiveStyle(previewCaption).fontFamily,
                           letterSpacing: `${getEffectiveStyle(previewCaption).letterSpacing}px`,
                           lineHeight: getEffectiveStyle(previewCaption).lineHeight,
                           WebkitTextStroke: getEffectiveStyle(previewCaption).strokeWidth ? `${getEffectiveStyle(previewCaption).strokeWidth}px ${getEffectiveStyle(previewCaption).strokeColor}` : undefined,
                           textShadow: getEffectiveStyle(previewCaption).shadowBlur > 0
                             ? `0 0 ${getEffectiveStyle(previewCaption).shadowBlur}px ${getEffectiveStyle(previewCaption).shadowColor}`
                             : undefined,
                         }}
                       >
                         {previewCaption.text || "Preview text"}
                       </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-[10px] text-white">
                {previewCaption ? `${previewIndex + 1} / ${captions.length}` : "No captions"}
              </div>
            </div>
          </div>

          {/* Per-Caption Style Editor */}
          {selectedCaption && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-card"
            >
              <div className="flex items-center gap-2">
                <Move className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Override Style</h3>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Animation</label>
                <select
                  value={selectedCaption.style?.animation || globalStyle.animation}
                  onChange={(e) => updateCaptionStyle(selectedCaption.id, "animation", e.target.value as AnimationType)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  {animations.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Position</label>
                <div className="flex gap-2">
                  {(["bottom", "middle", "top"] as const).map((pos) => (
                    <button
                      type="button"
                      key={pos}
                      onClick={() => updateCaptionStyle(selectedCaption.id, "position", pos)}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-xs capitalize transition-colors",
                        (selectedCaption.style?.position || globalStyle.position) === pos ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      )}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Font Size</label>
                <div className="flex flex-wrap gap-1">
                  {fontSizes.map((size) => (
                    <button
                      type="button"
                      key={size}
                      onClick={() => updateCaptionStyle(selectedCaption.id, "fontSize", size)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs transition-colors",
                        (selectedCaption.style?.fontSize || globalStyle.fontSize) === size ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      )}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateCaptionStyle(selectedCaption.id, "fontWeight", (selectedCaption.style?.fontWeight || globalStyle.fontWeight) === "bold" ? "normal" : "bold")}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs transition-colors",
                    (selectedCaption.style?.fontWeight || globalStyle.fontWeight) === "bold" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  )}
                >
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() => updateCaptionStyle(selectedCaption.id, "textTransform", (selectedCaption.style?.textTransform || globalStyle.textTransform) === "uppercase" ? "none" : "uppercase")}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs transition-colors",
                    (selectedCaption.style?.textTransform || globalStyle.textTransform) === "uppercase" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  )}
                >
                  UPPER
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes captionFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes captionSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes captionSlideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes captionBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes captionTypewriter {
          from { width: 0; overflow: hidden; white-space: nowrap; }
          to { width: 100%; }
        }
        @keyframes captionPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes captionZoom {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-caption-fade { animation: captionFade 0.5s ease-out; }
        .animate-caption-slide-up { animation: captionSlideUp 0.5s ease-out; }
        .animate-caption-slide-down { animation: captionSlideDown 0.5s ease-out; }
        .animate-caption-bounce { animation: captionBounce 0.6s ease-in-out; }
        .animate-caption-typewriter { animation: captionTypewriter 1s steps(20) forwards; display: inline-block; }
        .animate-caption-pop { animation: captionPop 0.4s ease-out; }
        .animate-caption-zoom { animation: captionZoom 0.4s ease-out; }
      `}</style>
    </div>
  );
}
