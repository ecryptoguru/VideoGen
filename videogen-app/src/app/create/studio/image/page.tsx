"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Wand2, Image as ImageIcon, Loader2, AlertCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const aspectRatios = [
  { label: "1:1", value: "1:1", w: 1024, h: 1024 },
  { label: "16:9", value: "16:9", w: 1280, h: 720 },
  { label: "9:16", value: "9:16", w: 720, h: 1280 },
  { label: "4:3", value: "4:3", w: 1024, h: 768 },
  { label: "3:2", value: "3:2", w: 1024, h: 683 },
  { label: "21:9", value: "21:9", w: 1280, h: 549 },
];

export default function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("9:16");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const promptValid = prompt.trim().length >= 3 && prompt.trim().length <= 1500;

  async function generate() {
    if (!promptValid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/minimax/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspect_ratio: ratio,
          n: 1,
          response_format: "base64",
        }),
      });
      const data = await res.json();
      console.log("Image API response:", data); // Debug log
      
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      
      // Handle different response formats from MiniMax API
      // Official spec: data.image_base64 array when response_format is base64
      // Official spec: data.image_urls array when response_format is url
      if (data.base64?.[0]) {
        setResult(`data:image/png;base64,${data.base64[0]}`);
      } else if (data.data?.[0]?.image) {
        setResult(`data:image/png;base64,${data.data[0].image}`);
      } else if (data.image) {
        setResult(`data:image/png;base64,${data.image}`);
      } else if (data.url) {
        setResult(data.url);
      } else if (data.file_id) {
        // Handle file_id format
        setResult(`data:image/png;base64,${data.file_id}`);
      } else if (data.data?.image) {
        // MiniMax API returns data.image directly
        setResult(`data:image/png;base64,${data.data.image}`);
      } else if (data.data?.base64) {
        // MiniMax API returns data.base64 directly
        setResult(`data:image/png;base64,${data.data.base64}`);
      } else if (data.image_base64?.[0]) {
        // Official MiniMax spec: data.image_base64 array
        setResult(`data:image/png;base64,${data.image_base64[0]}`);
      } else if (data.data?.image_base64?.[0]) {
        // Fallback for nested format
        setResult(`data:image/png;base64,${data.data.image_base64[0]}`);
      } else if (data.image_urls?.[0]) {
        // Official MiniMax spec: data.image_urls array
        setResult(data.image_urls[0]);
      } else {
        console.log("Image response structure:", JSON.stringify(data, null, 2));
        throw new Error("No image returned");
      }
    } catch {
      if (!mountedRef.current) return;
      setError("Failed to generate image. Check your API key and prompt.");
    }
    if (!mountedRef.current) return;
    setLoading(false);
  }

  function downloadImage() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `videogen-image-${Date.now()}.png`;
    a.click();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Image Studio</h1>
        <p className="text-sm text-muted-foreground">Generate visuals with MiniMax image-01</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label htmlFor="image-prompt" className="mb-2 block text-sm font-medium">Prompt</label>
            <textarea
              id="image-prompt"
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setError(""); }}
              placeholder="A futuristic SaaS dashboard glowing with purple and pink gradients..."
              className={cn(
                "w-full rounded-xl border bg-white p-4 text-sm outline-none transition-colors",
                prompt.length > 0 && !promptValid ? "border-destructive focus:ring-2 focus:ring-destructive" : "border-border focus:ring-2 focus:ring-primary"
              )}
              rows={4}
              aria-invalid={prompt.length > 0 && !promptValid}
              aria-describedby="image-prompt-hint"
            />
            <p id="image-prompt-hint" className="mt-1 text-xs text-muted-foreground">
              {prompt.length}/1500 {prompt.length > 0 && !promptValid && "(minimum 3 chars)"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Aspect Ratio</label>
            <div className="flex flex-wrap gap-2">
              {aspectRatios.map((r) => (
                <button type="button"
                  key={r.value}
                  onClick={() => setRatio(r.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    ratio === r.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <button type="button"
            onClick={generate}
            disabled={loading || !promptValid}
            className="btn-gradient w-full disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4" aria-hidden="true" />}
            Generate Image
          </button>
        </div>

        <div className="flex items-center justify-center rounded-2xl border border-border bg-muted/30 p-4">
          {result ? (
            <div className="relative">
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={result}
                alt="AI generated image"
                className="max-h-[400px] rounded-xl object-contain"
              />
              <button type="button"
                onClick={downloadImage}
                className="absolute right-2 top-2 rounded-lg bg-white/90 p-2 shadow-sm hover:bg-white"
                aria-label="Download image"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="mx-auto h-12 w-12" aria-hidden="true" />
              <p className="mt-2 text-sm">Your generated image will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
