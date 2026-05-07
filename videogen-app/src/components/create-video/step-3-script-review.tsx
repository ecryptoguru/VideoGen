"use client";

import { motion } from "framer-motion";

interface Scene {
  id: number;
  name: string;
  script: string;
  direction_notes: string;
  camera_command: string;
}

interface Step3ScriptReviewProps {
  scenes: Scene[];
  onEdit: () => void;
}

export function Step3ScriptReview({ scenes, onEdit }: Step3ScriptReviewProps) {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Review Your Script</h2>
        <button
          onClick={onEdit}
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          Regenerate
        </button>
      </div>

      <div className="space-y-4">
        {scenes.map((scene, i) => (
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-border bg-white p-4 shadow-card"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {i + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">{scene.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{scene.script}</p>
              </div>
            </div>
            <div className="ml-11 space-y-2 text-xs">
              <div>
                <span className="font-medium text-muted-foreground">Direction:</span>
                <span className="ml-2 text-muted-foreground">{scene.direction_notes}</span>
              </div>
              {scene.camera_command && (
                <div>
                  <span className="font-medium text-muted-foreground">Camera:</span>
                  <span className="ml-2 text-muted-foreground">{scene.camera_command}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
