"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WizardHeaderProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardHeader({ currentStep, totalSteps }: WizardHeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Video
          <span className="gradient-text ml-2 text-xl">Wizard</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-powered video creation in {totalSteps} steps</p>
      </div>
      <div className="flex items-center gap-2" role="progressbar" aria-valuenow={currentStep} aria-valuemax={totalSteps}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <motion.div
            key={i}
            animate={i + 1 <= currentStep ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i + 1 <= currentStep ? "w-8 gradient-primary" : "w-6 bg-border"
            )}
          />
        ))}
      </div>
    </div>
  );
}
