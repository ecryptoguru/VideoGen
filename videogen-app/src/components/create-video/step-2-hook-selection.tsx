"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Hook {
  text: string;
  score: number;
  type: string;
}

interface Step2HookSelectionProps {
  hooks: Hook[];
  selectedHook: number;
  onHookSelect: (index: number) => void;
  generating: boolean;
  onGenerate: () => void;
}

export function Step2HookSelection({
  hooks,
  selectedHook,
  onHookSelect,
  generating,
  onGenerate,
}: Step2HookSelectionProps) {
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Pick Your Hook</h2>
      </div>

      <div className="space-y-3">
        {hooks.length === 0 && !generating && (
          <motion.button
            type="button"
            onClick={onGenerate}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="btn-gradient w-full text-base py-3.5"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Generate Hooks with AI
          </motion.button>
        )}
        {generating && hooks.length === 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 shadow-card">
            <div className="spinner spinner-dark" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">Generating hooks with M2.7...</span>
          </div>
        )}
        {hooks.map((hook, i) => (
          <motion.button
            type="button"
            key={i}
            onClick={() => onHookSelect(i)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={cn(
              "w-full rounded-xl border-2 p-4 text-left transition-all",
              selectedHook === i
                ? "border-primary bg-primary/4 shadow-sm"
                : "border-border hover:border-primary/30"
            )}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <p className="font-medium text-sm leading-snug flex-1">{hook.text}</p>
              <div className="flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2 py-1">
                <span className="text-sm font-bold text-primary">{hook.score}</span>
                <span className="text-xs text-primary/70">/10</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">{hook.type}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
