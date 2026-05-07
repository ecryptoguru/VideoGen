"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Video, ArrowRight, X, Sparkles } from "lucide-react";

interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
}

interface Template {
  id: number;
  name: string;
  category: string;
  desc: string;
  platform: string;
  format: string;
  fields: TemplateField[];
  defaultTopic: string;
}

const templates: Template[] = [
  {
    id: 1,
    name: "Product Showcase",
    category: "Marketing",
    desc: "Highlight your product features with dynamic shots",
    platform: "youtube_shorts",
    format: "Product Demo",
    fields: [
      { key: "productName", label: "Product Name", placeholder: "e.g. SparkleClean Pro" },
      { key: "mainFeature", label: "Main Feature", placeholder: "e.g. 3x faster cleaning" },
      { key: "audience", label: "Target Audience", placeholder: "e.g. busy professionals" },
    ],
    defaultTopic: "Product demo showcasing key features and benefits",
  },
  {
    id: 2,
    name: "Daily Tip",
    category: "Education",
    desc: "Share quick tips with text overlays and B-roll",
    platform: "instagram_reels",
    format: "Tutorial",
    fields: [
      { key: "tip", label: "The Tip", placeholder: "e.g. Use ice cubes to remove furniture dents" },
      { key: "niche", label: "Niche/Topic", placeholder: "e.g. Home cleaning hacks" },
    ],
    defaultTopic: "Quick tip tutorial with visual demonstration",
  },
  {
    id: 3,
    name: "Customer Testimonial",
    category: "Social Proof",
    desc: "Feature customer wins with before/after",
    platform: "linkedin",
    format: "Before/After",
    fields: [
      { key: "customerName", label: "Customer Name", placeholder: "e.g. Sarah Johnson" },
      { key: "problem", label: "Problem Solved", placeholder: "e.g. struggled with acne for 5 years" },
      { key: "result", label: "Result", placeholder: "e.g. clear skin in 30 days" },
    ],
    defaultTopic: "Customer success story and transformation",
  },
  {
    id: 4,
    name: "Feature Announcement",
    category: "Product",
    desc: "Launch new features with excitement",
    platform: "youtube_shorts",
    format: "Myth vs Fact",
    fields: [
      { key: "featureName", label: "Feature Name", placeholder: "e.g. AI Auto-Edit" },
      { key: "benefit", label: "Key Benefit", placeholder: "e.g. save 5 hours per video" },
    ],
    defaultTopic: "New feature launch announcement with demo",
  },
  {
    id: 5,
    name: "Tutorial Walkthrough",
    category: "Education",
    desc: "Step-by-step product tutorial",
    platform: "youtube_long",
    format: "Tutorial",
    fields: [
      { key: "toolName", label: "Tool/Product", placeholder: "e.g. VideoGen Studio" },
      { key: "task", label: "Task to Teach", placeholder: "e.g. create your first AI video" },
      { key: "skillLevel", label: "Skill Level", placeholder: "e.g. beginner" },
    ],
    defaultTopic: "Step-by-step tutorial walkthrough for beginners",
  },
  {
    id: 6,
    name: "Event Promo",
    category: "Marketing",
    desc: "Promote webinars, launches, or events",
    platform: "instagram_reels",
    format: "Storytime",
    fields: [
      { key: "eventName", label: "Event Name", placeholder: "e.g. Marketing Masterclass" },
      { key: "date", label: "Date/Time", placeholder: "e.g. March 15, 2pm EST" },
      { key: "cta", label: "Call to Action", placeholder: "e.g. Register free at link in bio" },
    ],
    defaultTopic: "Event promotion with compelling hook and CTA",
  },
];

function getPlatformLabel(id: string) {
  const map: Record<string, string> = {
    instagram_reels: "Instagram Reels",
    linkedin: "LinkedIn",
    youtube_shorts: "YouTube Shorts",
    youtube_long: "YouTube Long",
  };
  return map[id] || id;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  function openEditor(template: Template) {
    setSelectedTemplate(template);
    setValues({});
  }

  function closeEditor() {
    setSelectedTemplate(null);
    setValues({});
  }

  function useTemplate() {
    if (!selectedTemplate) return;
    const filledTopic = selectedTemplate.fields
      .map((f) => `${f.label}: ${values[f.key] || f.placeholder}`)
      .join(". ");
    const state = {
      step: 2,
      topic: filledTopic || selectedTemplate.defaultTopic,
      selectedPlatform: selectedTemplate.platform,
      selectedFormat: selectedTemplate.format,
      hooks: [],
      selectedHook: 0,
      script: "",
      projectId: null,
      scenes: [],
    };
    localStorage.setItem("video_wizard_state", JSON.stringify(state));
    router.push("/create");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Video Templates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pre-built MiniMax Video Agent templates with fill editor</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template, i) => (
          <motion.button
            type="button"
            key={template.id}
            onClick={() => openEditor(template)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 22 }}
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="card p-6 text-left"
            aria-label={`Use ${template.name} template`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Video className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold">{template.name}</h3>
            <span className="mt-1 inline-block rounded-md bg-muted px-2 py-0.5 text-xs">{template.category}</span>
            <p className="mt-2 text-sm text-muted-foreground">{template.desc}</p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Fill & Use <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={closeEditor}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedTemplate.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {getPlatformLabel(selectedTemplate.platform)} · {selectedTemplate.format}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-lg p-2 hover:bg-muted"
                  aria-label="Close editor"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedTemplate.fields.map((field) => (
                  <div key={field.key}>
                    <label htmlFor={`field-${field.key}`} className="label">
                      {field.label}
                    </label>
                    <input
                      id={`field-${field.key}`}
                      value={values[field.key] || ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="input"
                    />
                  </div>
                ))}

                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Preview topic:</p>
                  <p className="mt-1 text-sm">
                    {selectedTemplate.fields
                      .map((f) => `${f.label}: ${values[f.key] || f.placeholder}`)
                      .join(". ") || selectedTemplate.defaultTopic}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={useTemplate}
                  className="btn-gradient"
                >
                  <Sparkles className="h-4 w-4 inline mr-1" aria-hidden="true" />
                  Start with Template
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}