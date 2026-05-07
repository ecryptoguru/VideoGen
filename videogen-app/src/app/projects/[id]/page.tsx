"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Play,
  Pause,
  Download,
  Type,
  Camera,
  Music,
  Mic,
  Image as ImageIcon,
  Video,
  Loader2,
  AlertCircle,
  Wand2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFFmpeg } from "@/hooks/use-ffmpeg";

interface Scene {
  id: number;
  name: string;
  duration: string;
  status: "ready" | "generating" | "pending";
  color: string;
  image_url?: string;
  video_url?: string;
}

export default function ProjectEditor() {
  const params = useParams();
  const projectId = params.id as string;
  const [selectedScene, setSelectedScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [projectName, setProjectName] = useState("");
  const mountedRef = useRef(false);
  const { load, assembleVideo, cleanup, loading: ffmpegLoading, progress, resultUrl } = useFFmpeg();

  useEffect(() => {
    mountedRef.current = true;
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error("Failed to load project");
        const data = await res.json();
        if (!mountedRef.current) return;
        setError("");
        setProjectName(data.name || "Untitled Project");
        setScenes(data.scenes && data.scenes.length > 0 ? data.scenes : [
          { id: 1, name: "Scene 1: Hook", duration: "3s", status: "ready", color: "bg-violet-100" },
          { id: 2, name: "Scene 2: Problem", duration: "4s", status: "ready", color: "bg-pink-100" },
          { id: 3, name: "Scene 3: Solution", duration: "5s", status: "pending", color: "bg-orange-100" },
          { id: 4, name: "Scene 4: CTA", duration: "3s", status: "pending", color: "bg-amber-100" },
        ]);
      } catch {
        if (!mountedRef.current) return;
        setError("Failed to load project. Showing placeholder scenes.");
        setScenes([
          { id: 1, name: "Scene 1: Hook", duration: "3s", status: "ready", color: "bg-violet-100" },
          { id: 2, name: "Scene 2: Problem", duration: "4s", status: "ready", color: "bg-pink-100" },
          { id: 3, name: "Scene 3: Solution", duration: "5s", status: "pending", color: "bg-orange-100" },
          { id: 4, name: "Scene 4: CTA", duration: "3s", status: "pending", color: "bg-amber-100" },
        ]);
      }
      if (mountedRef.current) setLoading(false);
    }
    loadProject();
    return () => { mountedRef.current = false; };
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <div className="spinner spinner-dark mx-auto" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-64 space-y-2 overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Scenes</h3>
          {error && (
            <span className="flex items-center gap-1 text-xs text-destructive" title={error}>
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              API Error
            </span>
          )}
        </div>
        {scenes.map((scene, i) => (
          <button type="button"
            key={scene.id}
            onClick={() => setSelectedScene(i)}
            className={cn(
              "w-full rounded-xl border-2 p-3 text-left transition-all",
              selectedScene === i
                ? "border-primary bg-primary/5"
                : "border-transparent hover:bg-muted"
            )}
            aria-pressed={selectedScene === i}
          >
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-16 rounded-lg", scene.color)} aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium">{scene.name}</p>
                <p className="text-xs text-muted-foreground">{scene.duration}</p>
              </div>
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  scene.status === "ready" ? "bg-success" : scene.status === "generating" ? "bg-warning animate-pulse" : "bg-border"
                )}
                aria-hidden="true"
              />
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex-1 rounded-2xl border border-border bg-black p-4 shadow-card">
          <div className="flex h-full items-center justify-center rounded-xl bg-linear-to-br from-violet-900 to-pink-900">
            <div className="text-center text-white">
              {isPlaying ? (
                <button type="button"
                  onClick={() => setIsPlaying(false)}
                  className="rounded-full p-4 hover:bg-white/10"
                  aria-label="Pause preview"
                >
                  <Pause className="h-16 w-16" aria-hidden="true" />
                </button>
              ) : (
                <button type="button"
                  onClick={() => setIsPlaying(true)}
                  className="rounded-full p-4 hover:bg-white/10"
                  aria-label="Play preview"
                >
                  <Play className="h-16 w-16" aria-hidden="true" />
                </button>
              )}
              <p className="mt-4 text-sm opacity-60">
                {projectName} — Scene {selectedScene + 1} Preview
              </p>
            </div>
          </div>
        </div>

        <div className="h-20 rounded-2xl border border-border bg-white p-3 shadow-card">
          <div className="flex h-full items-center gap-1">
            {scenes.map((scene, i) => (
              <button type="button"
                key={scene.id}
                onClick={() => setSelectedScene(i)}
                className={cn(
                  "h-full flex-1 rounded-lg cursor-pointer transition-all",
                  scene.color,
                  selectedScene === i && "ring-2 ring-primary"
                )}
                aria-label={`Jump to ${scene.name}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="w-72 space-y-4 overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-card">
        <h3 className="font-semibold">Scene Controls</h3>

        <div>
          <label htmlFor="scene-script" className="label">
            <Type className="h-4 w-4 inline mr-1" aria-hidden="true" />
            Script
          </label>
          <textarea
            id="scene-script"
            className="input"
            rows={3}
            defaultValue="Your scene script goes here..."
          />
        </div>

        <div>
          <label className="label">
            <Camera className="h-4 w-4 inline mr-1" aria-hidden="true" />
            Camera Commands
          </label>
          <div className="flex flex-wrap gap-1">
            {["[Push in]", "[Pan left]", "[Zoom in]", "[Static shot]"].map((cmd) => (
              <span key={cmd} className="rounded-md bg-muted px-2 py-1 text-xs">
                {cmd}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <button type="button" className="btn-ghost w-full justify-start">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            Regenerate Image
          </button>
          <button type="button" className="btn-ghost w-full justify-start">
            <Video className="h-4 w-4" aria-hidden="true" />
            Regenerate Video
          </button>
          <button type="button" className="btn-ghost w-full justify-start">
            <Mic className="h-4 w-4" aria-hidden="true" />
            Regenerate Voice
          </button>
          <button type="button" className="btn-ghost w-full justify-start">
            <Music className="h-4 w-4" aria-hidden="true" />
            Change Music
          </button>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          {resultUrl && (
            <div className="space-y-2">
              <video src={resultUrl} controls className="w-full rounded-xl" />
              <a
                href={resultUrl}
                download={`${projectName.replace(/\s+/g, "_")}.mp4`}
                className="btn-gradient flex w-full items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download MP4
              </a>
            </div>
          )}
          {ffmpegLoading && (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  role="progressbar"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {progress < 5 ? "Loading FFmpeg..." : progress < 100 ? `Assembling video... ${progress}%` : "Done!"}
              </p>
            </div>
          )}
          {!resultUrl && (
            <button
              type="button"
              onClick={async () => {
                await load();
                const imageUrls = scenes.filter((s) => s.image_url).map((s) => s.image_url!);
                if (imageUrls.length === 0) {
                  if (mountedRef.current) setError("No scene images available. Generate images first.");
                  return;
                }
                await assembleVideo({ images: imageUrls, outputName: "final.mp4" });
              }}
              disabled={ffmpegLoading}
              className="btn-gradient w-full disabled:opacity-50"
            >
              {ffmpegLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="h-4 w-4" aria-hidden="true" />
              )}
              Export Final Video
            </button>
          )}
          {resultUrl && (
            <button type="button" onClick={cleanup} className="btn-ghost w-full justify-center gap-2">
              <Check className="h-4 w-4" aria-hidden="true" />
              Start New Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
}