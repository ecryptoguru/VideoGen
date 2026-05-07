"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, Loader2, AlertCircle, Download, Save,
  Upload, FileAudio, Clock, Copy, FileText,
  Sparkles, ChevronDown, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Voice, Generation } from "@/types";
import {
  exportSRT, exportVTT, exportJSON, downloadFile,
  hexToAudioUrl, parseMiniMaxTimestamps, TranscriptSegment,
} from "@/lib/subtitle";

const TABS = [
  { id: "tts", label: "Text-to-Speech", icon: Mic },
  { id: "transcribe", label: "Transcription", icon: FileAudio },
  { id: "history", label: "History", icon: Clock },
];

export default function AudioStudio() {
  const [activeTab, setActiveTab] = useState("tts");
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("English_expressive_narrator");
  const [speed, setSpeed] = useState(1.0);
  const [vol, setVol] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [languageBoost, setLanguageBoost] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saved, setSaved] = useState(false);
  const [timestamps, setTimestamps] = useState<TranscriptSegment[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [subtitleOpen, setSubtitleOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mountedRef = useRef(false);

  const textValid = text.trim().length > 0 && text.trim().length <= 10000;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  function drawWaveform() {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const barWidth = rect.width / bufferLength;

    const drawBars = () => {
      if (!audioRef.current || audioRef.current.paused) {
        audioContext.close().catch(() => {});
        return;
      }
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, rect.width, rect.height);

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * rect.height;
        const hue = 260 + (i / bufferLength) * 60;
        ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
        ctx.fillRect(i * barWidth, rect.height - barHeight, barWidth - 1, barHeight);
      }
      rafRef.current = requestAnimationFrame(drawBars);
    };

    rafRef.current = requestAnimationFrame(drawBars);
  }

  useEffect(() => {
    fetch("/api/voices")
      .then((r) => r.json())
      .then((data) => setVoices(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      /* eslint-disable react-hooks/set-state-in-effect */
      setHistoryLoading(true);
      /* eslint-enable react-hooks/set-state-in-effect */
      fetch("/api/generations")
        .then((r) => r.json())
        .then((data) => {
          setGenerations(Array.isArray(data) ? data.filter((g: Generation) => g.modality === "tts" || g.modality === "music") : []);
          setHistoryLoading(false);
        })
        .catch(() => setHistoryLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (audioUrl && canvasRef.current && audioRef.current) {
      drawWaveform();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [audioUrl]);

  async function generate() {
    if (!textValid) return;
    setLoading(true);
    setError("");
    setAudioUrl("");
    setTimestamps([]);
    try {
      const res = await fetch("/api/minimax/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_setting: { voice_id: voiceId, speed, vol, pitch },
          ...(languageBoost ? { language_boost: languageBoost } : {}),
          timestamp: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

      let audioHex = "";
      if (data.audio_hex) audioHex = data.audio_hex;
      else if (data.data?.audio) audioHex = data.data.audio;

      if (audioHex) {
        const newUrl = hexToAudioUrl(audioHex);
        setAudioUrl(newUrl);
        if (data.data?.timestamps) {
          setTimestamps(parseMiniMaxTimestamps(text, data.data.timestamps));
        }
      } else if (data.base_resp?.status_code !== 0) {
        throw new Error(data.base_resp?.status_msg || "TTS generation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate audio");
    }
    setLoading(false);
  }

  async function saveToLibrary() {
    if (!audioUrl) return;
    try {
      await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modality: "tts",
          model: "speech-2.8-hd",
          prompt: text.slice(0, 200),
          params: JSON.stringify({ voice_id: voiceId, speed, vol, pitch }),
          output_url: audioUrl,
          status: "ready",
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save to library");
    }
  }

  function downloadAudio() {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `${saveName || "voiceover"}-${Date.now()}.mp3`;
    a.click();
  }

  function downloadSubtitles(format: "srt" | "vtt" | "json") {
    const segs = timestamps.length > 0 ? timestamps : [{ start: 0, end: 0, text }];
    const filename = `${saveName || "voiceover"}-${Date.now()}`;

    if (format === "srt") {
      downloadFile(exportSRT(segs), `${filename}.srt`, "text/srt");
    } else if (format === "vtt") {
      downloadFile(exportVTT(segs), `${filename}.vtt`, "text/vtt");
    } else {
      downloadFile(JSON.stringify(exportJSON(segs, { title: saveName, source: "MiniMax TTS" })), `${filename}.json`, "application/json");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(result);
      let hex = "";
      for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
      setUploadedFile(hex);
    };
    reader.readAsArrayBuffer(file);
  }

  async function transcribeAudio() {
    if (!uploadedFile) return;
    setTranscribeLoading(true);
    setError("");
    setTranscriptText("");
    setTranscriptSegments([]);
    try {
      const res = await fetch("/api/minimax/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: uploadedFile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      if (data.data?.text) {
        setTranscriptText(data.data.text);
        if (data.data.timestamps) {
          setTranscriptSegments(parseMiniMaxTimestamps(data.data.text, data.data.timestamps));
        }
      } else if (data.task_id) {
        pollTranscription(data.task_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed — check audio format");
    }
    setTranscribeLoading(false);
  }

  async function pollTranscription(taskId: string) {
    if (!mountedRef.current) return;
    setTranscribeLoading(true);
    for (let i = 0; i < 30; i++) {
      if (!mountedRef.current) return;
      await new Promise((r) => setTimeout(r, 2000));
      if (!mountedRef.current) return;
      try {
        const res = await fetch(`/api/minimax/transcribe?task_id=${taskId}`);
        const data = await res.json();
        if (data.status === "Success" && data.data?.text) {
          if (!mountedRef.current) return;
          setTranscriptText(data.data.text);
          if (data.data.timestamps) {
            setTranscriptSegments(parseMiniMaxTimestamps(data.data.text, data.data.timestamps));
          }
          setTranscribeLoading(false);
          return;
        }
        if (data.status === "Failed") {
          if (!mountedRef.current) return;
          setError("Transcription task failed");
          setTranscribeLoading(false);
          return;
        }
      } catch {
        break;
      }
    }
    if (!mountedRef.current) return;
    setError("Transcription timed out");
    setTranscribeLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audio Studio</h1>
          <p className="text-sm text-muted-foreground">Text-to-speech, transcription & subtitles</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="audioTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "tts" && (
          <motion.div key="tts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label htmlFor="voice-select" className="mb-2 block text-sm font-medium">Voice</label>
                  <select
                    id="voice-select"
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="English_expressive_narrator">English - Expressive Narrator</option>
                    <option value="English_professional_narrator">English - Professional Narrator</option>
                    <option value="English_casual">English - Casual</option>
                    <option value="male-india-en">English - Indian Male</option>
                    <option value="Hindi-male narration">Hindi - Male Narration</option>
                    {voices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name || v.voice_id} {v.is_default ? "(Default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="lang-boost" className="mb-2 block text-sm font-medium">Language Boost</label>
                  <select
                    id="lang-boost"
                    value={languageBoost}
                    onChange={(e) => setLanguageBoost(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Auto-detect</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Speed: {speed}x</label>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Volume: {vol}</label>
                    <input type="range" min="0.1" max="2.0" step="0.1" value={vol} onChange={(e) => setVol(parseFloat(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Pitch: {pitch}</label>
                    <input type="range" min="-10" max="10" step="1" value={pitch} onChange={(e) => setPitch(parseInt(e.target.value))} className="w-full" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="script-textarea" className="mb-2 block text-sm font-medium">Script</label>
                  <textarea
                    id="script-textarea"
                    value={text}
                    onChange={(e) => { setText(e.target.value); setError(""); }}
                    placeholder="Welcome to our revolutionary SaaS platform..."
                    className={cn(
                      "w-full rounded-xl border bg-white p-4 text-sm outline-none transition-colors",
                      text.length > 0 && !textValid ? "border-destructive focus:ring-2 focus:ring-destructive" : "border-border focus:ring-2 focus:ring-primary"
                    )}
                    rows={5}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{text.length}/10000</p>
                </div>
                <button type="button" onClick={generate} disabled={loading || !textValid} className="btn-gradient w-full disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                  Generate Voiceover
                </button>
              </div>
            </div>

            {audioUrl && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <canvas ref={canvasRef} className="h-20 w-full rounded-xl bg-muted" />
                <audio ref={audioRef} src={audioUrl} controls className="w-full" />
                <div className="flex flex-wrap gap-2">
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Name this..."
                    className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary min-w-[120px]"
                  />
                  <button type="button" onClick={downloadAudio} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                    <Download className="h-4 w-4 inline" aria-hidden="true" /> MP3
                  </button>
                  {timestamps.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSubtitleOpen((v) => !v)}
                        className="rounded-lg border bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" /> Subtitles
                        <ChevronDown className={cn("h-3 w-3 transition-transform", subtitleOpen && "rotate-180")} aria-hidden="true" />
                      </button>
                      {subtitleOpen && (
                        <div className="absolute bottom-full mb-1 left-0 flex flex-col rounded-lg border bg-white shadow-lg overflow-hidden z-10 min-w-[140px]">
                          <button type="button" onClick={() => { downloadSubtitles("srt"); setSubtitleOpen(false); }} className="px-4 py-2 text-sm hover:bg-muted text-left">Download SRT</button>
                          <button type="button" onClick={() => { downloadSubtitles("vtt"); setSubtitleOpen(false); }} className="px-4 py-2 text-sm hover:bg-muted text-left">Download VTT</button>
                          <button type="button" onClick={() => { downloadSubtitles("json"); setSubtitleOpen(false); }} className="px-4 py-2 text-sm hover:bg-muted text-left">Download JSON</button>
                        </div>
                      )}
                    </div>
                  )}
                  <button type="button" onClick={saveToLibrary} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                    {saved ? <Check className="h-4 w-4 inline text-green-500" aria-hidden="true" /> : <Save className="h-4 w-4 inline" aria-hidden="true" />}
                    {saved ? "Saved!" : "Save"}
                  </button>
                </div>
                {timestamps.length > 0 && (
                  <div className="rounded-xl border border-border bg-white p-4 space-y-2 max-h-48 overflow-y-auto">
                    <p className="text-xs font-medium text-muted-foreground">Timestamped Transcript</p>
                    {timestamps.map((seg, i) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="text-muted-foreground shrink-0 font-mono">{seg.start.toFixed(1)}s</span>
                        <span className="text-foreground">{seg.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === "transcribe" && (
          <motion.div key="transcribe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold">Speech-to-Text Transcription</h3>
                  <p className="text-sm text-muted-foreground">Upload audio to convert speech to text with timestamps</p>
                </div>
              </div>
              <div className="border-2 border-dashed rounded-xl p-6 text-center">
                <input type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="hidden" id="audio-upload" />
                <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <FileAudio className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                  {uploadedFileName ? (
                    <p className="text-sm font-medium">{uploadedFileName}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Click to upload audio</p>
                      <p className="text-xs text-muted-foreground">MP3, WAV, M4A, OGG, FLAC, MP4, MOV, WebM</p>
                    </>
                  )}
                </label>
              </div>
              <button
                type="button"
                onClick={transcribeAudio}
                disabled={transcribeLoading || !uploadedFile}
                className="btn-gradient w-full disabled:opacity-50"
              >
                {transcribeLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                {transcribeLoading ? "Transcribing..." : "Transcribe Audio"}
              </button>
            </div>

            {transcriptText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Transcript</h3>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => navigator.clipboard.writeText(transcriptText)} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted">
                      <Copy className="h-3 w-3 inline mr-1" aria-hidden="true" /> Copy
                    </button>
                    {transcriptSegments.length > 0 && (
                      <button type="button" onClick={() => downloadFile(exportSRT(transcriptSegments), "transcript.srt", "text/srt")} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted">
                        <FileText className="h-3 w-3 inline mr-1" aria-hidden="true" /> SRT
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transcriptSegments.length > 0 ? (
                    transcriptSegments.map((seg, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="text-muted-foreground shrink-0 font-mono text-xs pt-0.5">{seg.start.toFixed(1)}s</span>
                        <span className="text-foreground leading-relaxed">{seg.text}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{transcriptText}</p>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Audio Generations</h3>
              <span className="text-xs text-muted-foreground">{generations.length} items</span>
            </div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              </div>
            ) : generations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border">
                <Clock className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                <p className="mt-3 font-medium">No audio generations yet</p>
                <p className="text-sm text-muted-foreground">Generate voiceovers to see them here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {generations.map((gen) => (
                  <div key={gen.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Mic className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{gen.prompt || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">{gen.model} · {new Date(gen.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={cn(
                      "rounded-lg px-2 py-0.5 text-xs font-medium",
                      gen.status === "ready" ? "bg-success/10 text-success" : gen.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                    )}>
                      {gen.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}