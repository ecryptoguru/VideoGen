"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Sparkles, Wand2, Play, Download, Calendar, AlertCircle, Loader2, Camera, Send, FileText } from "lucide-react";
import { cn, hexToUint8Array } from "@/lib/utils";
import { useFFmpeg } from "@/hooks/use-ffmpeg";
import { useVideoPoll, VideoTaskResult } from "@/hooks/use-video-poll";

const platforms = [
  { id: "instagram_reels", label: "Instagram Reels", ratio: "9:16", duration: "6s", color: "bg-pink-500" },
  { id: "linkedin", label: "LinkedIn", ratio: "1:1", duration: "10s", color: "bg-blue-600" },
  { id: "youtube_shorts", label: "YouTube Shorts", ratio: "9:16", duration: "6s", color: "bg-red-600" },
  { id: "youtube_long", label: "YouTube Long", ratio: "16:9", duration: "10s", color: "bg-red-700" },
] as const;

const formats = [
  "Day in the Life", "Myth vs Fact", "Before/After", "Tutorial", "Storytime", "POV", "React", "Product Demo"
];

interface WizardScene {
  id: number;
  dbId?: number;
  name: string;
  script: string;
  direction_notes: string;
  camera_command?: string;
  image_url?: string;
  video_url?: string;
  video_task_id?: string;
  status: "pending" | "generating" | "ready" | "failed";
}

interface GenerationProgress {
  [key: string]: "pending" | "generating" | "done" | "failed";
}

function getWizardInitialState() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("video_wizard_state");
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

export default function CreateVideo() {
  const savedState = getWizardInitialState();
  const init = (key: string, defaultValue: unknown) => {
    return savedState?.[key] ?? defaultValue;
  };

  const [step, setStep] = useState(init("step", 1));
  const [topic, setTopic] = useState(init("topic", ""));
  const [selectedPlatform, setSelectedPlatform] = useState(init("selectedPlatform", ""));
  const [selectedFormat, setSelectedFormat] = useState(init("selectedFormat", ""));
  const [hooks, setHooks] = useState<{ text: string; score: number; type: string }[]>(init("hooks", []));
  const [selectedHook, setSelectedHook] = useState(init("selectedHook", 0));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [script, setScript] = useState(init("script", ""));
  const [projectId, setProjectId] = useState<number | null>(init("projectId", null));
  const [scenes, setScenes] = useState<WizardScene[]>(
    (init("scenes", []) as WizardScene[]).map((s: WizardScene) => ({ ...s, status: "pending" as const }))
  );
  const [brandKit, setBrandKit] = useState<Record<string, string> | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({});
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState("");

  const { load, assembleVideo, cleanup, loading: ffmpegLoading, progress: ffmpegProgress, resultUrl } = useFFmpeg();
  const abortControllerRef = useRef<AbortController | null>(null);
  const {
    startPolling,
    stopPolling,
    getTaskBySceneId,
  } = useVideoPoll();
  const blobUrlsRef = useRef<string[]>([]);
  const audioUrlRef = useRef("");
  const musicUrlRef = useRef("");

  const revokeBlobUrls = () => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
  };

  const createBlobUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    blobUrlsRef.current.push(url);
    return url;
  };

  const totalSteps = 4;
  const topicValid = topic.trim().length >= 3 && topic.trim().length <= 200;
  const canAdvance = step === 1 ? topicValid && selectedPlatform !== "" : true;

  useEffect(() => {
    fetch("/api/brand-kit").then((r) => r.json()).then((data) => {
      setBrandKit(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    const state = { step, topic, selectedPlatform, selectedFormat, selectedHook, script, scenes, projectId, hooks };
    localStorage.setItem("video_wizard_state", JSON.stringify(state));
  }, [step, topic, selectedPlatform, selectedFormat, selectedHook, script, scenes, projectId, hooks]);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (musicUrlRef.current) URL.revokeObjectURL(musicUrlRef.current);
      revokeBlobUrls();
      if (abortControllerRef.current) abortControllerRef.current.abort();
      stopPolling("");
      cleanup();
      setGenerationProgress({});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = useCallback(() => {
    setError("");
    if (step < totalSteps && canAdvance) setStep((s: number) => s + 1);
  }, [step, canAdvance, setError, setStep]);

  const handleBack = useCallback(() => {
    setError("");
    if (step > 1) setStep((s: number) => s - 1);
  }, [step, setError, setStep]);

  const getVoiceId = useCallback(() => {
    if (brandKit?.voice_id) return brandKit.voice_id;
    return "English_expressive_narrator";
  }, [brandKit]);

  async function generateHooks() {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setGenerating(true);
    setError("");
    try {
      const brandContext = brandKit ? `
Brand: ${brandKit.brand_name || ""}
Tone: ${brandKit.tone_of_voice || "professional"}
Audience: ${brandKit.target_audience || "SaaS founders"}
Key messages: ${brandKit.key_messages || ""}
      ` : "";

      const res = await fetch("/api/minimax/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Generate 3 viral video hook options for: "${topic}". Platform: ${selectedPlatform}. Format: ${selectedFormat || "general"}. ${brandContext}

Return ONLY a JSON object with this exact structure:
{
  "hooks": [
    { "text": "hook text here", "score": 8, "type": "Curiosity|Challenge|FOMO" },
    ...
  ]
}`
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || data.choices?.[0]?.message?.content || "";
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Invalid response format");
      }
      if (parsed.hooks && Array.isArray(parsed.hooks)) {
        setHooks(parsed.hooks);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError("Failed to generate hooks. Using defaults.");
      setHooks([
        { text: `Did you know most founders struggle with ${topic.toLowerCase()}?`, score: 9, type: "Curiosity" },
        { text: `Stop scrolling if you want to master ${topic.toLowerCase()}.`, score: 8, type: "Challenge" },
        { text: `In 30 seconds, you'll learn the #1 secret about ${topic.toLowerCase()}.`, score: 7, type: "FOMO" },
      ]);
    }
    setGenerating(false);
  }

  async function saveScenesToDb(sceneList: WizardScene[], projId: number) {
    const results = await Promise.allSettled(
      sceneList.map((scene, idx) =>
        fetch("/api/scenes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projId,
            order_index: idx,
            script: scene.script,
            direction_notes: scene.direction_notes,
            camera_commands: scene.camera_command || "",
            status: "pending",
            prompt_optimizer: 1,
            prompt_optimizer_mode: "fast",
          }),
        }).then(r => r.json())
      )
    );
    const ids: number[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.id) {
        ids.push(result.value.id);
      }
    }
    return ids;
  }

  async function generateScript() {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setGenerating(true);
    setError("");
    try {
      const brandContext = brandKit ? `
Brand: ${brandKit.brand_name || ""}
Tone: ${brandKit.tone_of_voice || "professional"}
Audience: ${brandKit.target_audience || ""}
Key messages: ${brandKit.key_messages || ""}
Words to avoid: ${brandKit.words_to_avoid || ""}
Language: ${brandKit.language || "English"}
      ` : "";

      const hookText = hooks[selectedHook]?.text || "";
      const res = await fetch("/api/minimax/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Write a viral video script about: ${topic}. Platform: ${selectedPlatform}. Format: ${selectedFormat || "general"}. Hook: ${hookText}. ${brandContext}

Break into 3 scenes. For each scene provide: script text, direction notes for the video generation, and a camera command (e.g., [Push in], [Pan left], [Static shot]).

Return ONLY a JSON object with this exact structure:
{
  "scenes": [
    { "name": "Scene 1: Hook", "script": "...", "direction_notes": "...", "camera_command": "..." },
    { "name": "Scene 2: Problem/Solution", "script": "...", "direction_notes": "...", "camera_command": "..." },
    { "name": "Scene 3: CTA", "script": "...", "direction_notes": "...", "camera_command": "..." }
  ]
}`
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || data.choices?.[0]?.message?.content || "";
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Invalid response format");
      }
      if (parsed.scenes && Array.isArray(parsed.scenes)) {
        const sceneList: WizardScene[] = parsed.scenes.map((s: Record<string, string>, i: number) => ({
          id: i,
          name: s.name || `Scene ${i + 1}`,
          script: s.script || "",
          direction_notes: s.direction_notes || "",
          camera_command: s.camera_command || "",
          status: "pending" as const,
        }));
        setScript(JSON.stringify(parsed.scenes, null, 2));
        setScenes(sceneList);

        const proj = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            name: topic.slice(0, 50),
            platform: selectedPlatform,
            topic,
            script: JSON.stringify(parsed.scenes),
            status: "generating",
            video_mode: "i2v",
            video_model: "MiniMax-Hailuo-2.3",
          }),
        });
        const projData = await proj.json();
        if (projData.id) {
          setProjectId(projData.id);
          const sceneIds = await saveScenesToDb(sceneList, projData.id);
          setScenes(prev => prev.map((s, i) => ({ ...s, dbId: sceneIds[i] || undefined })));
          await fetch(`/api/projects/${projData.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "generating" }),
          });
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError("Failed to generate script. Please check your API key in Settings.");
    }
    setGenerating(false);
  }

  async function generateAssets() {
    if (!projectId) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    setGenerating(true);
    setError("");
    setGenerationProgress({});

    try {
      const platform = platforms.find(p => p.id === selectedPlatform);

      // Generate images with concurrency limit
      setGenerationProgress(prev => ({ ...prev, images: "generating" }));
      const imageResults = await Promise.allSettled(
        scenes.map(async (scene) => {
          setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: "generating" as const } : s));
          try {
            const res = await fetch("/api/minimax/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal,
              body: JSON.stringify({
                prompt: scene.direction_notes.slice(0, 1500),
                aspect_ratio: platform?.ratio || "16:9",
                n: 1,
              }),
            });
            const data = await res.json();
            const imageUrls = data.data?.image_urls;
            const imageBase64 = data.data?.image_base64;
            const imageUrl = imageUrls?.[0] || (imageBase64?.[0] ? `data:image/png;base64,${imageBase64[0]}` : null);
            if (imageUrl) {
              setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, image_url: imageUrl, status: "ready" as const } : s));
              if (scene.dbId) {
                await fetch("/api/scenes", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: scene.dbId, image_url: imageUrl, status: "ready" }),
                });
              }
              return { sceneId: scene.id, url: imageUrl, success: true };
            }
            throw new Error("No image returned");
} catch {
            setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: "failed" as const } : s));
            if (scene.dbId) {
              await fetch("/api/scenes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: scene.dbId, status: "failed" }),
              });
            }
            return { sceneId: scene.id, success: false };
          }
        })
      );
      const imageSuccessCount = imageResults.filter(r => r.status === "fulfilled" && r.value.success).length;
      setGenerationProgress(prev => ({ ...prev, images: imageSuccessCount > 0 ? "done" : "failed" }));

      // Generate video clips with concurrency limit
      setGenerationProgress(prev => ({ ...prev, videos: "generating" }));
      const videoResults = await Promise.allSettled(
        scenes.map(async (scene) => {
          setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: "generating" as const } : s));
          try {
            const fullPrompt = scene.camera_command
              ? `${scene.direction_notes} ${scene.camera_command}`
              : scene.direction_notes;

            const res = await fetch("/api/minimax/video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal,
              body: JSON.stringify({
                model: "MiniMax-Hailuo-2.3",
                prompt: fullPrompt.slice(0, 2000),
                first_frame_image: scene.image_url,
                duration: platform?.id === "youtube_long" ? 10 : 6,
                resolution: "768P",
              }),
            });
            const data = await res.json();
            if (!data.task_id) throw new Error("No task_id returned");
            const taskId = data.task_id;

            setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, video_task_id: taskId, status: "generating" as const } : s));
            if (scene.dbId) {
              await fetch("/api/scenes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: scene.dbId, video_task_id: taskId, status: "generating" }),
              });
            }

            return new Promise<{ sceneId: number; taskId: string; success: boolean }>((resolve) => {
              startPolling(taskId, scene.id, async (result: VideoTaskResult) => {
                if (result.status === "Success" && result.download_url) {
                  setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, video_url: result.download_url, status: "ready" as const } : s));
                  if (scene.dbId) {
                    await fetch("/api/scenes", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: scene.dbId, video_url: result.download_url, status: "ready" }),
                    });
                  }
                  resolve({ sceneId: scene.id, taskId, success: true });
                } else {
                  setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: "failed" as const } : s));
                  if (scene.dbId) {
                    await fetch("/api/scenes", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: scene.dbId, status: "failed" }),
                    });
                  }
                  resolve({ sceneId: scene.id, taskId, success: false });
                }
              }, (status) => {
                if (status !== "Processing" && status !== "Queueing" && status !== "Preparing") {
                  setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: status === "Success" ? "ready" : "failed" as const } : s));
                }
              });
            });
          } catch {
            setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: "failed" as const } : s));
            return { sceneId: scene.id, taskId: "", success: false };
          }
        })
      );
      const videoSuccessCount = videoResults.filter(r => r.status === "fulfilled" && r.value.success).length;
      setGenerationProgress(prev => ({ ...prev, videos: videoSuccessCount > 0 ? "done" : "failed" }));

      // Generate voiceover
      setGenerationProgress(prev => ({ ...prev, voiceover: "generating" }));
      const fullScript = scenes.map(s => s.script).join("\n\n");
      const useAsyncTts = fullScript.length > 10000;

      if (useAsyncTts) {
        try {
          const taskRes = await fetch("/api/minimax/tts_async", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal,
            body: JSON.stringify({
              model: "speech-2.8-hd",
              text: fullScript,
              voice_setting: { voice_id: getVoiceId(), speed: 1.0, vol: 1.0, pitch: 0 },
              ...(brandKit?.language ? { language_boost: brandKit.language } : {}),
            }),
          });
          const taskData = await taskRes.json();
          if (taskData.task_id) {
            const maxAttempts = 60;
            for (let i = 0; i < maxAttempts; i++) {
              if (signal.aborted) break;
              await new Promise(r => setTimeout(r, 5000));
              const pollRes = await fetch(`/api/minimax/tts_async?task_id=${taskData.task_id}`);
              const pollData = await pollRes.json();
              if (pollData.status === "Success" && pollData.file_id) {
                const retrieveRes = await fetch(`/api/minimax/file_retrieve?file_id=${pollData.file_id}`);
                const retrieveData = await retrieveRes.json();
                  const audioHex = retrieveData.data?.audio;
                  if (audioHex) {
                    const blob = new Blob([new Uint8Array(hexToUint8Array(audioHex))], { type: "audio/mp3" });
                    const url = createBlobUrl(blob);
                    setAudioUrl(url);
                    audioUrlRef.current = url;
                    setGenerationProgress(prev => ({ ...prev, voiceover: "done" }));
                    break;
                  }
              }
              if (pollData.status === "Failed" || pollData.status === "Expired") {
                throw new Error(pollData.base_resp?.status_msg || "Async TTS failed or expired");
              }
              if (i === maxAttempts - 1) {
                if (!signal.aborted) setGenerationProgress(prev => ({ ...prev, voiceover: "failed" }));
              }
            }
            if (signal.aborted) return;
            setGenerationProgress(prev => ({ ...prev, voiceover: "failed" }));
          }
        } catch {
          setGenerationProgress(prev => ({ ...prev, voiceover: "failed" }));
        }
      } else {
        try {
          const res = await fetch("/api/minimax/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal,
            body: JSON.stringify({
              text: fullScript.slice(0, 10000),
              voice_setting: { voice_id: getVoiceId(), speed: 1.0, vol: 1.0, pitch: 0 },
              output_format: "hex",
              ...(brandKit?.language ? { language_boost: brandKit.language } : {}),
            }),
          });
          const data = await res.json();
          const audioHex = data.data?.audio;
          if (audioHex) {
            const blob = new Blob([new Uint8Array(hexToUint8Array(audioHex))], { type: "audio/mp3" });
            const prevAudio = audioUrlRef.current;
            const newUrl = createBlobUrl(blob);
            setAudioUrl(newUrl);
            audioUrlRef.current = newUrl;
            if (prevAudio) URL.revokeObjectURL(prevAudio);
            setGenerationProgress(prev => ({ ...prev, voiceover: "done" }));
          }
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return;
          setGenerationProgress(prev => ({ ...prev, voiceover: "failed" }));
        }
      }

      // Generate background music
      setGenerationProgress(prev => ({ ...prev, music: "generating" }));
      try {
        const res = await fetch("/api/minimax/music", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            prompt: `Upbeat background music for a ${selectedPlatform} video about ${topic}`,
            is_instrumental: true,
            output_format: "hex",
          }),
        });
        const data = await res.json();
        const musicAudio = data.data?.audio;
        const musicStatus = data.data?.status;
        if (musicStatus === 2 && musicAudio) {
          const blob = new Blob([new Uint8Array(hexToUint8Array(musicAudio))], { type: "audio/mp3" });
          const url = createBlobUrl(blob);
          setMusicUrl(url);
          musicUrlRef.current = url;
          setGenerationProgress(prev => ({ ...prev, music: "done" }));
        } else if (data.data?.download_url) {
          const musicRes = await fetch(data.data.download_url);
          if (musicRes.ok) {
            const musicBlob = await musicRes.blob();
            const prevMusic = musicUrlRef.current;
            const newUrl = createBlobUrl(musicBlob);
            setMusicUrl(newUrl);
            musicUrlRef.current = newUrl;
            if (prevMusic) URL.revokeObjectURL(prevMusic);
            setGenerationProgress(prev => ({ ...prev, music: "done" }));
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setGenerationProgress(prev => ({ ...prev, music: "failed" }));
      }

      const allDone = Object.values(generationProgress).every(v => v === "done" || v === "failed");
      if (!signal.aborted) {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({ status: allDone ? "ready" : "generating" }),
        });
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError("Some assets failed to generate. You can retry individually.");
    }
    setGenerating(false);
  }

  function resetWizard() {
    localStorage.removeItem("video_wizard_state");
    stopPolling("");
    setStep(1);
    setTopic("");
    setSelectedPlatform("");
    setSelectedFormat("");
    setHooks([]);
    setSelectedHook(0);
    setScript("");
    setScenes([]);
    setProjectId(null);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    if (musicUrlRef.current) URL.revokeObjectURL(musicUrlRef.current);
    audioUrlRef.current = "";
    musicUrlRef.current = "";
    setAudioUrl("");
    setMusicUrl("");
    setGenerationProgress({});
    setError("");
    cleanup();
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            New Video
            <span className="gradient-text ml-2 text-xl">Wizard</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered video creation in 4 steps</p>
        </div>
        <div className="flex items-center gap-2" role="progressbar" aria-valuenow={step} aria-valuemax={totalSteps}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div
              key={i}
              animate={i + 1 <= step ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i + 1 <= step ? "w-8 gradient-primary" : "w-6 bg-border"
              )}
            />
          ))}
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
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
                onChange={(e) => setTopic(e.target.value)}
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
                    role="radio"
                    aria-checked={selectedPlatform === p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-all card",
                      selectedPlatform === p.id
                        ? "border-primary bg-primary/[0.04] shadow-sm"
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
                    onClick={() => setSelectedFormat(selectedFormat === f ? "" : f)}
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
        )}

        {step === 2 && (
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
                  onClick={generateHooks}
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
                  onClick={() => setSelectedHook(i)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={cn(
                    "w-full rounded-xl border-2 p-4 text-left transition-all",
                    selectedHook === i
                      ? "border-primary bg-primary/[0.04] shadow-sm"
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
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className={cn(
                      "badge text-xs",
                      hook.type === "Curiosity" ? "bg-violet-50 text-violet-600 border-violet-100" :
                      hook.type === "FOMO" ? "bg-orange-50 text-orange-600 border-orange-100" :
                      "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                      {hook.type} hook
                    </span>
                  </div>
                  <div className="w-full rounded-full bg-muted h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full gradient-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${hook.score * 10}%` }}
                      transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Script Preview */}
            <div className="rounded-xl border border-border bg-white p-4 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold">Script Preview</p>
              </div>
              {generating ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="spinner spinner-dark" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">Generating script with M2.7...</span>
                </div>
              ) : script ? (
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed font-mono bg-muted/50 rounded-lg p-3">{script}</pre>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {hooks[selectedHook] ? (
                    <>
                      <span className="font-semibold text-foreground">Hook: </span>{hooks[selectedHook].text}
                    </>
                  ) : (
                    "Click 'Generate Hooks' to get AI-generated hook options."
                  )}
                  <br /><br />
                  {scenes.length === 0 ? (
                    <>
                      <span className="font-semibold text-foreground">[Scene 1]</span> Introduce the problem with a relatable scenario.<br /><br />
                      <span className="font-semibold text-foreground">[Scene 2]</span> Show the solution in action.<br /><br />
                      <span className="font-semibold text-foreground">[Scene 3]</span> Share results and a strong call-to-action.
                    </>
                  ) : (
                    scenes.map((scene) => (
                      <span key={scene.id}>
                        <span className="font-semibold text-foreground">[{scene.name}]</span><br />{scene.script}<br /><br />
                      </span>
                    ))
                  )}
                </p>
              )}
            </div>

            {!script && hooks.length > 0 && (
              <motion.button
                type="button"
                onClick={generateScript}
                disabled={generating}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="btn-gradient w-full disabled:opacity-50"
              >
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                {generating ? "Generating Script..." : "Generate Script"}
              </motion.button>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Generate Assets</h2>
            </div>

            {generating ? (
              <div className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-card" aria-live="polite">
                <p className="text-sm font-medium">Generating your video assets...</p>
                <div className="space-y-3">
                  {["Images", "Video Clips", "Voiceover", "Background Music"].map((item) => {
                    const status = generationProgress[item.toLowerCase().replace(" ", "_")] || "pending";
                    return (
                      <div key={item} className="flex items-center gap-3">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          status === "done" ? "bg-success" : status === "generating" ? "bg-warning animate-pulse" : status === "failed" ? "bg-destructive" : "bg-border"
                        )} />
                        <span className="text-sm">{item}</span>
                        <span className={cn(
                          "ml-auto text-xs",
                          status === "done" ? "text-success" : status === "generating" ? "text-warning" : status === "failed" ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {status === "done" ? "Done" : status === "generating" ? "Generating..." : status === "failed" ? "Failed" : "Waiting"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {scenes.map((scene) => {
                  const videoTask = getTaskBySceneId(scene.id);
                  const statusCfg = {
                    ready: { color: "bg-success", text: "text-success", bg: "bg-success/10 border-success/20", label: "Ready" },
                    failed: { color: "bg-destructive", text: "text-destructive", bg: "bg-destructive/10 border-destructive/20", label: "Failed" },
                    generating: { color: "bg-warning animate-pulse", text: "text-warning", bg: "bg-warning/10 border-warning/20", label: "Generating" },
                    pending: { color: "bg-border", text: "text-muted-foreground", bg: "bg-muted border-border", label: "Pending" },
                  }[scene.status];
                  return (
                    <motion.div
                      key={scene.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 rounded-xl border border-border bg-white p-3 shadow-card"
                    >
                      {scene.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={scene.image_url} alt={scene.name} className="h-16 w-28 rounded-lg object-cover" />
                      ) : (
                        <div className={cn("h-16 w-28 rounded-lg flex items-center justify-center", scene.status === "ready" ? "bg-success/20" : scene.status === "failed" ? "bg-destructive/20" : "bg-violet-50")} aria-hidden="true">
                          <Camera className="h-5 w-5 text-violet-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{scene.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("badge border text-xs", statusCfg.bg, statusCfg.text)}>
                            {statusCfg.label}
                          </span>
                          {videoTask && (
                            <span className="text-xs text-muted-foreground">
                              {videoTask.status === "Processing" ? "Video processing..." : videoTask.status === "Success" ? "Video ready" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                        disabled={!script || scene.status === "generating"}
                        onClick={async () => {
                          setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: "generating", image_url: undefined, video_url: undefined } : s));
                          try {
                            const res = await fetch("/api/minimax/image", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                prompt: scene.direction_notes.slice(0, 1500),
                                aspect_ratio: platforms.find(p => p.id === selectedPlatform)?.ratio || "16:9",
                                n: 1,
                              }),
                            });
                            const data = await res.json();
                            const imageUrls = data.data?.image_urls;
                            const imageBase64 = data.data?.image_base64;
                            const imageUrl = imageUrls?.[0] || (imageBase64?.[0] ? `data:image/png;base64,${imageBase64[0]}` : null);
                            if (imageUrl) {
                              setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, image_url: imageUrl, status: "ready" } : s));
                            }
                          } catch {
                            setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: "failed" } : s));
                          }
                        }}
                      >
                        Regenerate
                      </motion.button>
                    </motion.div>
                  );
                })}
                <motion.button
                  type="button"
                  onClick={generateAssets}
                  disabled={generating || scenes.length === 0}
                  whileHover={!generating && scenes.length > 0 ? { scale: 1.01 } : {}}
                  whileTap={!generating && scenes.length > 0 ? { scale: 0.99 } : {}}
                  className="btn-gradient w-full disabled:opacity-50"
                >
                  <Wand2 className="h-4 w-4" aria-hidden="true" />
                  {generating ? "Generating Assets..." : "Generate All Assets"}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="aspect-video rounded-2xl bg-linear-to-br from-violet-100 to-pink-100 flex items-center justify-center">
              {audioUrl ? (
                <audio controls src={audioUrl} className="w-full max-w-md" />
              ) : (
                <Play className="h-16 w-16 text-primary/60" aria-hidden="true" />
              )}
            </div>

            {musicUrl && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-white p-4">
                <p className="text-sm font-medium mb-2">Background Music</p>
                <audio controls src={musicUrl} className="w-full" />
              </motion.div>
            )}

            {ffmpegLoading && (
              <div className="space-y-2 rounded-2xl border border-border bg-white p-4 shadow-card">
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${ffmpegProgress}%` }}
                    aria-valuenow={ffmpegProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                  />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  {ffmpegProgress < 5 ? "Loading FFmpeg..." : ffmpegProgress < 100 ? `Assembling video... ${ffmpegProgress}%` : "Done!"}
                </p>
              </div>
            )}

            {resultUrl ? (
              <div className="space-y-3">
                <video src={resultUrl} controls className="w-full rounded-xl" />
                <div className="flex gap-3">
                  <a
                    href={resultUrl}
                    download="video.mp4"
                    className="btn-gradient flex-1 text-center"
                  >
                    <Download className="h-4 w-4 inline" aria-hidden="true" />
                    Download MP4
                  </a>
                  <button type="button" onClick={cleanup} className="flex items-center gap-2 rounded-xl border-2 border-border px-6 py-3 font-medium hover:bg-muted">
                    New Export
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn-gradient flex-1 disabled:opacity-50"
                  disabled={!projectId || ffmpegLoading}
                  onClick={async () => {
                    const hasVideos = scenes.some(s => s.video_url);
                    const hasImages = scenes.some(s => s.image_url);

                    if (!hasVideos && !hasImages) {
                      setError("Generate assets in Step 3 first.");
                      return;
                    }

                    await load();

                    if (hasVideos) {
                      const videoUrls = scenes.filter(s => s.video_url).map(s => s.video_url!);
                      await assembleVideo({ images: videoUrls, audioUrl: audioUrl || undefined, musicUrl: musicUrl || undefined, outputName: "video.mp4" });
                    } else {
                      const imageUrls = scenes.filter(s => s.image_url).map(s => s.image_url!);
                      await assembleVideo({ images: imageUrls, audioUrl: audioUrl || undefined, musicUrl: musicUrl || undefined, outputName: "video.mp4" });
                    }
                  }}
                >
                  {ffmpegLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                  Export MP4
                </button>
                <button
                  type="button"
                  onClick={() => setShowSchedule((s) => !s)}
                  disabled={!projectId}
                  className="flex items-center gap-2 rounded-xl border-2 border-border px-6 py-3 font-medium hover:bg-muted disabled:opacity-50"
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`/create/seo?project=${projectId}`, "_blank")}
                  disabled={!projectId}
                  className="flex items-center gap-2 rounded-xl border-2 border-border bg-primary/10 px-6 py-3 font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Optimize for YouTube
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`/create/instagram?project=${projectId}`, "_blank")}
                  disabled={!projectId}
                  className="flex items-center gap-2 rounded-xl border-2 border-border bg-pink-50 px-6 py-3 font-medium text-pink-600 hover:bg-pink-100 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Instagram Studio
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`/create/linkedin?project=${projectId}`, "_blank")}
                  disabled={!projectId}
                  className="flex items-center gap-2 rounded-xl border-2 border-border bg-blue-50 px-6 py-3 font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  LinkedIn Studio
                </button>
              </div>
            )}

            {showSchedule && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-white p-4 shadow-card space-y-3"
              >
                {scheduleSuccess && (
                  <div className="rounded-xl bg-success/10 px-3 py-2 text-sm text-success">
                    {scheduleSuccess}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="schedule-date" className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
                    <input
                      id="schedule-date"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="schedule-time" className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
                    <input
                      id="schedule-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={scheduling || !scheduleDate || !projectId}
                  onClick={async () => {
                    setScheduling(true);
                    try {
                      const eventDate = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
                      const res = await fetch("/api/calendar", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title: topic || "Scheduled Video",
                          event_date: eventDate,
                          platform: selectedPlatform,
                          status: "scheduled",
                          project_id: projectId,
                        }),
                      });
                      if (!res.ok) throw new Error("Failed to schedule");
                      setScheduleSuccess(`Scheduled for ${scheduleDate} at ${scheduleTime}`);
                      setScheduleDate("");
                    } catch {
                      setError("Failed to schedule event.");
                    }
                    setScheduling(false);
                  }}
                  className="btn-gradient w-full disabled:opacity-50 text-sm"
                >
                  {scheduling ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" aria-hidden="true" /> : <Calendar className="h-4 w-4 inline mr-1" aria-hidden="true" />}
                  Confirm Schedule
                </button>
              </motion.div>
            )}

            {scenes.some((s) => s.image_url) && (
              <div className="grid grid-cols-3 gap-3">
                {scenes.filter((s) => s.image_url).map((scene, i) => (
                  <button type="button" key={scene.id} className={cn("rounded-xl border-2 p-2 text-left transition-all hover:shadow-card", i === 0 ? "border-primary" : "border-border")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={scene.image_url} alt={scene.name} className="aspect-video rounded-lg object-cover w-full" />
                    <p className="mt-2 text-center text-xs font-medium">{scene.name}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-center">
              {projectId && (
                <p className="text-center text-sm text-muted-foreground">
                  Project saved. <Link href={`/projects/${projectId}`} className="text-primary hover:underline">Open in editor &rarr;</Link>
                </p>
              )}
              <button type="button" onClick={resetWizard} className="text-sm text-muted-foreground hover:text-primary underline">
                Start New Video
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between">
        <motion.button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          whileHover={step > 1 ? { x: -2 } : {}}
          whileTap={step > 1 ? { scale: 0.98 } : {}}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
            step === 1 ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-muted border border-transparent hover:border-border"
          )}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </motion.button>
        <motion.button
          type="button"
          onClick={handleNext}
          disabled={step === totalSteps || !canAdvance}
          whileHover={step < totalSteps && canAdvance ? { scale: 1.02 } : {}}
          whileTap={step < totalSteps && canAdvance ? { scale: 0.98 } : {}}
          className={cn(
            "btn-gradient disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          )}
        >
          {step === totalSteps ? "Done" : "Next"}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </motion.button>
      </div>
    </div>
  );
}