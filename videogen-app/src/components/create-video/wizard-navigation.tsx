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
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
          step === 1
            ? "text-muted-foreground cursor-not-allowed"
            : "text-foreground hover:bg-muted"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      {showGenerate && onGenerate ? (
        <button
          onClick={onGenerate}
          disabled={generating || !canAdvance}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all",
            generating || !canAdvance
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "btn-gradient hover:scale-105"
          )}
        >
          {generating ? (
            <>
              <div className="spinner spinner-white h-4 w-4" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate Script
            </>
          )}
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all",
            !canAdvance
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "btn-gradient hover:scale-105"
          )}
        >
          {step === totalSteps ? "Finish" : "Next"}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
