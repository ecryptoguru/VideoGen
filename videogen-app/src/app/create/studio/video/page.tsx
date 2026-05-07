"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Wand2, Loader2, Camera, AlertCircle, Palette, Gauge, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

const cameraCommands = [
  "[Push in]", "[Pull out]", "[Pan left]", "[Pan right]",
  "[Tilt up]", "[Tilt down]", "[Zoom in]", "[Zoom out]",
  "[Truck left]", "[Truck right]", "[Pedestal up]", "[Pedestal down]",
  "[Shake]", "[Tracking shot]", "[Static shot]",
];

const models = [
  { label: "Hailuo-2.3", value: "MiniMax-Hailuo-2.3", supportsResolution: ["768P", "1080P"] as string[] },
  { label: "Hailuo-2.3-Fast", value: "MiniMax-Hailuo-2.3-Fast", supportsResolution: ["768P", "1080P"] as string[] },
  { label: "Hailuo-02", value: "MiniMax-Hailuo-02", supportsResolution: ["512P", "768P", "1080P"] as string[] },
  { label: "I2V-01", value: "I2V-01", supportsResolution: ["720P"] as string[] },
];

const colorGrades = [
  { id: "none", label: "Natural", emoji: "🎞️", promptMod: "", desc: "No color grading" },
  { id: "cinematic", label: "Cinematic", emoji: "🎬", promptMod: "Cinematic color grade: teal shadows, orange highlights, low saturation, subtle grain, film contrast", desc: "Teal-orange cinematic" },
  { id: "teal-orange", label: "Teal-Orange", emoji: "🌊", promptMod: "Vibrant teal and orange color palette, high contrast, boosted saturation, punchy highlights", desc: "Bold teal-orange" },
  { id: "cyberpunk", label: "Cyberpunk", emoji: "🤖", promptMod: "Neon cyberpunk atmosphere: blue-magenta color scheme, high contrast, crushed blacks, electric highlights", desc: "Neon cyberpunk" },
  { id: "vintage", label: "Vintage Film", emoji: "📽️", promptMod: "Vintage film look: warm yellow-orange tint, faded reds, soft blacks, slight haze, nostalgic mood", desc: "Faded vintage film" },
  { id: "japanese-fresh", label: "Japanese Fresh", emoji: "🌿", promptMod: "Japanese aesthetic: bright exposure, low contrast, teal-green tint, lifted shadows, clean palette", desc: "Bright Japanese" },
  { id: "morandi", label: "Morandi", emoji: "🎨", promptMod: "Morandi muted palette: desaturated colors, gray undertones, soft pastel tones, understated elegance", desc: "Soft muted tones" },
  { id: "high-contrast", label: "High Contrast", emoji: "⚫", promptMod: "High contrast dramatic lighting: deep blacks, punchy whites, vivid colors, strong shadow separation", desc: "Punchy contrast" },
];

const speedModes = [
  { id: "normal", label: "Normal", emoji: "▶️", value: 1.0 },
  { id: "slow-cinematic", label: "Slow Cinematic", emoji: "🐢", value: 0.5 },
  { id: "fast-action", label: "Fast Action", emoji: "⚡", value: 1.5 },
  { id: "dramatic", label: "Dramatic Pause", emoji: "🎭", value: 0.3 },
];

const transitionStyles = [
  { id: "hard-cut", label: "Hard Cut", emoji: "✂️", desc: "Direct cut, fastest pacing" },
  { id: "dissolve", label: "Cross Dissolve", emoji: "🌫️", desc: "Fade blend between shots" },
  { id: "whip-pan", label: "Whip Pan", emoji: "💨", desc: "Fast swipe motion blur" },
  { id: "match-cut", label: "Match Cut", emoji: "🔗", desc: "Visual continuity cut" },
];

const shotScales = [
  { id: "extreme-wide", label: "Extreme Wide", emoji: "🌍" },
  { id: "full", label: "Full Shot", emoji: "🚶" },
  { id: "medium", label: "Medium", emoji: "👤" },
  { id: "close-up", label: "Close-Up", emoji: "👁️" },
  { id: "extreme-closeup", label: "Extreme Close-Up", emoji: "🔍" },
];

export default function VideoStudio() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("MiniMax-Hailuo-2.3");
  const [selectedCommands, setSelectedCommands] = useState<string[]>([]);
  const [colorGrade, setColorGrade] = useState("none");
  const [speedMode, setSpeedMode] = useState("normal");
  const [transitionStyle, setTransitionStyle] = useState("hard-cut");
  const [shotScale, setShotScale] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const promptValid = prompt.trim().length >= 10 && prompt.trim().length <= 2000;

  function toggleCommand(cmd: string) {
    setSelectedCommands((prev) =>
      prev.includes(cmd) ? prev.filter((c) => c !== cmd) : [...prev, cmd]
    );
  }

  async function generate() {
    if (!promptValid) return;
    setLoading(true);
    setError("");
    try {
      const grade = colorGrades.find((g) => g.id === colorGrade);
      const gradeMod = grade?.promptMod || "";
      const speedMod = speedMode !== "normal"
        ? ` Video speed effect: ${speedModes.find((s) => s.id === speedMode)?.label || "Normal"} motion.`
        : "";
      const shotMod = `[${shotScale.replace("-", " ")} shot]`;
      const fullPrompt = `${prompt.trim()} ${shotMod}${selectedCommands.map((c) => ` ${c}`).join("")}${gradeMod ? ` ${gradeMod}` : ""}${speedMod}`;

      const res = await fetch("/api/minimax/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt: fullPrompt,
          duration: 6,
          resolution: "768P",
        }),
      });
      const data = await res.json();
      console.log("Video API response:", data); // Debug log
      
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      
      // Check for error in base_resp
      if (data.base_resp?.status_code !== 0) {
        throw new Error(data.base_resp.status_msg || "Video generation failed");
      }
      
      // Handle different response formats from MiniMax API
      // Official spec: task_id is at root level, not nested under data
      const taskId = data.task_id || data.id || data.data?.task_id;
      if (taskId) {
        setTaskId(taskId);
      } else {
        console.log("Video response structure:", JSON.stringify(data, null, 2));
        throw new Error("No task ID returned");
      }
    } catch {
      if (!mountedRef.current) return;
      setError("Failed to start video generation. Check your API key and prompt.");
    }
    if (!mountedRef.current) return;
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Video Studio</h1>
        <p className="text-sm text-muted-foreground">Generate videos with MiniMax Hailuo models</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Model</label>
          <div className="flex flex-wrap gap-2">
            {models.map((m) => (
              <button type="button"
                key={m.value}
                onClick={() => setSelectedModel(m.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  selectedModel === m.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="video-prompt" className="mb-2 block text-sm font-medium">Prompt</label>
          <textarea
            id="video-prompt"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setError(""); }}
            placeholder="A cinematic shot of a SaaS dashboard with users collaborating..."
            className={cn(
              "w-full rounded-xl border bg-white p-4 text-sm outline-none transition-colors",
              prompt.length > 0 && !promptValid ? "border-destructive focus:ring-2 focus:ring-destructive" : "border-border focus:ring-2 focus:ring-primary"
            )}
            rows={3}
            aria-invalid={prompt.length > 0 && !promptValid}
            aria-describedby="video-prompt-hint"
          />
          <p id="video-prompt-hint" className="mt-1 text-xs text-muted-foreground">
            {prompt.length}/2000 {prompt.length > 0 && !promptValid && "(minimum 10 chars)"}
          </p>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Camera className="h-4 w-4" aria-hidden="true" />
            Camera Commands
          </label>
          <div className="flex flex-wrap gap-2">
            {cameraCommands.map((cmd) => (
              <button type="button"
                key={cmd}
                onClick={() => toggleCommand(cmd)}
                className={cn(
                  "rounded-lg border px-2 py-1 text-xs transition-colors",
                  selectedCommands.includes(cmd)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30"
                )}
                aria-pressed={selectedCommands.includes(cmd)}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Color Grade */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Palette className="h-4 w-4" aria-hidden="true" />
            Color Grade
          </label>
          <div className="grid grid-cols-4 gap-2">
            {colorGrades.map((g) => (
              <button type="button"
                key={g.id}
                onClick={() => setColorGrade(g.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors",
                  colorGrade === g.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                )}
              >
                <span>{g.emoji}</span>
                <span className="font-medium">{g.label}</span>
                <span className="text-[10px] text-muted-foreground">{g.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Speed Mode */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Gauge className="h-4 w-4" aria-hidden="true" />
            Speed Mode
          </label>
          <div className="flex gap-2">
            {speedModes.map((s) => (
              <button type="button"
                key={s.id}
                onClick={() => setSpeedMode(s.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                  speedMode === s.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                )}
              >
                <span className="text-lg">{s.emoji}</span>
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground">{s.value}x</span>
              </button>
            ))}
          </div>
        </div>

        {/* Transition Style */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Scissors className="h-4 w-4" aria-hidden="true" />
            Transition Style
          </label>
          <div className="flex gap-2">
            {transitionStyles.map((t) => (
              <button type="button"
                key={t.id}
                onClick={() => setTransitionStyle(t.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                  transitionStyle === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                )}
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="font-medium">{t.label}</span>
                <span className="text-muted-foreground">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Shot Scale */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Camera className="h-4 w-4" aria-hidden="true" />
            Shot Scale
          </label>
          <div className="flex gap-2">
            {shotScales.map((s) => (
              <button type="button"
                key={s.id}
                onClick={() => setShotScale(s.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                  shotScale === s.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                )}
              >
                <span className="text-lg">{s.emoji}</span>
                <span className="font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button type="button"
          onClick={generate}
          disabled={loading || !promptValid}
          className="btn-gradient disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4" aria-hidden="true" />}
          Generate Video
        </button>

        {taskId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-border bg-muted/30 p-4"
          >
            <p className="text-sm font-medium">Task ID: <code className="rounded bg-muted px-1 py-0.5 text-xs">{taskId}</code></p>
            <p className="text-xs text-muted-foreground">Video is generating asynchronously. Check status in your projects.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
