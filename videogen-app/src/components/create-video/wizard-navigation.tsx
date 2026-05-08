"use client";

import { ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardNavigationProps {
  step: number;
  totalSteps: number;
  canAdvance: boolean;
  onNext: () => void;
  onBack: () => void;
  onGenerate?: () => void;
  showGenerate?: boolean;
  generating?: boolean;
}

export function WizardNavigation({
  step,
  totalSteps,
  canAdvance,
  onNext,
  onBack,
  onGenerate,
  showGenerate,
  generating,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-border">
      <button
        onClick={onBack}
        disabled={step === 1}
        aria-label="Go to previous step"
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          step === 1
            ? "text-muted-foreground cursor-not-allowed"
            : "text-foreground hover:bg-muted"
        )}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      {showGenerate && onGenerate ? (
        <button
          onClick={onGenerate}
          disabled={generating || !canAdvance}
          aria-label={generating ? "Generating script..." : "Generate script"}
          aria-busy={generating}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            generating || !canAdvance
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "btn-gradient hover:scale-105"
          )}
        >
          {generating ? (
            <>
              <div className="spinner spinner-white h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Generating...</span>
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              Generate Script
            </>
          )}
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={!canAdvance}
          aria-label={step === totalSteps ? "Finish and create project" : "Go to next step"}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            !canAdvance
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "btn-gradient hover:scale-105"
          )}
        >
          {step === totalSteps ? "Finish" : "Next"}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
