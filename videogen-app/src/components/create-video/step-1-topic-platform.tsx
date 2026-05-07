"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const platforms = [
  { id: "instagram_reels", label: "Instagram Reels", ratio: "9:16", duration: "6s", color: "bg-pink-500" },
  { id: "linkedin", label: "LinkedIn", ratio: "1:1", duration: "10s", color: "bg-blue-600" },
  { id: "youtube_shorts", label: "YouTube Shorts", ratio: "9:16", duration: "6s", color: "bg-red-600" },
  { id: "youtube_long", label: "YouTube Long", ratio: "16:9", duration: "10s", color: "bg-red-700" },
] as const;

const formats = [
  "Day in the Life", "Myth vs Fact", "Before/After", "Tutorial", "Storytime", "POV", "React", "Product Demo"
];

interface Step1TopicPlatformProps {
  topic: string;
  onTopicChange: (value: string) => void;
  selectedPlatform: string;
  onPlatformChange: (value: string) => void;
  selectedFormat: string;
  onFormatChange: (value: string) => void;
}

export function Step1TopicPlatform({
  topic,
  onTopicChange,
  selectedPlatform,
  onPlatformChange,
  selectedFormat,
  onFormatChange,
}: Step1TopicPlatformProps) {
  const topicValid = topic.trim().length >= 3 && topic.trim().length <= 200;

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Topic */}
      <div>
        <label htmlFor="topic" className="mb-2 block text-sm font-semibold text-foreground">
          What&apos;s your topic?
        </label>
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="e.g., How our SaaS saves 10 hours per week — share your unique angle"
          className={cn(
            "input resize-none",
            !topicValid && topic.length > 0 ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
          )}
          rows={3}
          aria-invalid={!topicValid && topic.length > 0}
          aria-describedby="topic-hint"
        />
        <p id="topic-hint" className="mt-1.5 text-xs text-muted-foreground">
          {topic.length}/200 characters{" "}
          {topic.length > 0 && !topicValid && <span className="text-destructive">(min 3 chars)</span>}
        </p>
      </div>

      {/* Platform */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-foreground">
          Platform <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Platform">
          {platforms.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selectedPlatform === p.id}
              onClick={() => onPlatformChange(p.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-all card",
                selectedPlatform === p.id
                  ? "border-primary bg-primary/4 shadow-sm"
                  : "border-border hover:border-primary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("h-3.5 w-3.5 rounded-full", p.color)} aria-hidden="true" />
                <div>
                  <p className="font-semibold text-sm">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.ratio} · {p.duration}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
        {selectedPlatform === "" && (
          <p className="mt-2 text-xs text-destructive">Please select a platform</p>
        )}
      </div>

      {/* Format */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-foreground">Format (optional)</label>
        <div className="flex flex-wrap gap-2">
          {formats.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFormatChange(selectedFormat === f ? "" : f)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200",
                selectedFormat === f
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
