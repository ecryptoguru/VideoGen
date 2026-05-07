"use client";

import { motion } from "framer-motion";
import { Play, Download, Calendar, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardScene {
  id: number;
  name: string;
  status: "pending" | "generating" | "ready" | "failed";
  image_url?: string;
  video_url?: string;
}

interface GenerationProgress {
  [key: string]: "pending" | "generating" | "done" | "failed";
}

interface Step4AssetGenerationProps {
  scenes: WizardScene[];
  generationProgress: GenerationProgress;
  onGenerate: () => void;
  onDownload: () => void;
  onSchedule: () => void;
  generating: boolean;
}

export function Step4AssetGeneration({
  scenes,
  generationProgress,
  onGenerate,
  onDownload,
  onSchedule,
  generating,
}: Step4AssetGenerationProps) {
  const allDone = Object.values(generationProgress).every(v => v === "done" || v === "failed");

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Generate Assets</h2>
        {!generating && !allDone && (
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg btn-gradient text-sm font-medium"
          >
            <Play className="h-4 w-4" />
            Start Generation
          </button>
        )}
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries({
          images: "Images",
          videos: "Videos",
          voiceover: "Voiceover",
          music: "Music",
        }).map(([key, label]) => (
          <div
            key={key}
            className={cn(
              "rounded-lg border p-3 text-center",
              generationProgress[key] === "done" && "border-success bg-success/5",
              generationProgress[key] === "failed" && "border-destructive bg-destructive/5",
              generationProgress[key] === "generating" && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              {generationProgress[key] === "generating" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : generationProgress[key] === "done" ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : generationProgress[key] === "failed" ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-muted" />
              )}
              <span className="text-xs font-medium">{label}</span>
            </div>
            <span className="text-xs text-muted-foreground capitalize">
              {generationProgress[key] || "pending"}
            </span>
          </div>
        ))}
      </div>

      {/* Scene Preview */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Scenes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scenes.map((scene, i) => (
            <div
              key={scene.id}
              className={cn(
                "rounded-lg border p-3",
                scene.status === "ready" && "border-success bg-success/5",
                scene.status === "failed" && "border-destructive bg-destructive/5",
                scene.status === "generating" && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Scene {i + 1}</span>
                {scene.status === "generating" && (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                )}
                {scene.status === "ready" && (
                  <CheckCircle className="h-3 w-3 text-success" />
                )}
                {scene.status === "failed" && (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{scene.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      {allDone && (
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg btn-gradient font-medium"
          >
            <Download className="h-4 w-4" />
            Download Video
          </button>
          <button
            onClick={onSchedule}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted font-medium"
          >
            <Calendar className="h-4 w-4" />
            Schedule
          </button>
        </div>
      )}
    </motion.div>
  );
}
