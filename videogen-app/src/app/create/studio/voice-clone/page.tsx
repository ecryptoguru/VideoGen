"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, AlertCircle, Download, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const voices = [
  { id: "male-1", label: "Male - Professional", gender: "male" },
  { id: "male-2", label: "Male - Casual", gender: "male" },
  { id: "female-1", label: "Female - Professional", gender: "female" },
  { id: "female-2", label: "Female - Energetic", gender: "female" },
  { id: "neutral-1", label: "Neutral - Narrator", gender: "neutral" },
];

export default function VoiceCloneStudio() {
  const [selectedVoice, setSelectedVoice] = useState("male-1");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedClones, setSavedClones] = useState<{ id: string; name: string; voice: string; date: string }[]>([]);
  const mountedRef = useRef(true);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const textValid = text.trim().length >= 5 && text.trim().length <= 5000;

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  async function generate() {
    if (!textValid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/minimax/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          voice_setting: { voice_id: selectedVoice, speed: 1.0, vol: 1.0, pitch: 0 },
          output_format: "hex",
        }),
      });
      const data = await res.json();
      console.log("Voice clone API response:", data); // Debug log

      // Check for error in base_resp
      if (data.base_resp?.status_code !== 0) {
        throw new Error(data.base_resp.status_msg || "Voice generation failed");
      }

      // Handle different response formats from MiniMax API
      // Official spec: data.audio when output_format is hex
      const audioHex = data.audio;
      if (audioHex) {
        const hex = typeof audioHex === "string" ? audioHex : String(audioHex);
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        const blob = new Blob([bytes], { type: "audio/mp3" });
        const newUrl = URL.createObjectURL(blob);
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = newUrl;
        setAudioUrl(newUrl);
      } else if (data.url) {
        // Handle URL-based response
        setAudioUrl(data.url);
      } else {
        console.log("Voice clone response structure:", JSON.stringify(data, null, 2));
        throw new Error("No audio returned");
      }
    } catch {
      if (!mountedRef.current) return;
      setError("Failed to generate audio. Check your API key and text.");
    }
    if (!mountedRef.current) return;
    setLoading(false);
  }

  function saveClone() {
    if (!audioUrl) return;
    const name = prompt("Name this voice:");
    if (!name) return;
    setSavedClones((prev) => [
      ...prev,
      { id: Date.now().toString(), name, voice: selectedVoice, date: new Date().toLocaleDateString() },
    ]);
    setAudioUrl(null);
    setText("");
  }

  function downloadAudio() {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `voice-clone-${Date.now()}.mp3`;
    a.click();
  }

  function deleteClone(id: string) {
    setSavedClones((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Voice Clone Studio
          <span className="gradient-text ml-2 text-xl">TTS</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate custom voiceovers with MiniMax TTS
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: controls */}
        <div className="space-y-5">
          {/* Voice Selection */}
          <div>
            <label className="label">Voice Selection</label>
            <div className="grid grid-cols-2 gap-2">
              {voices.map((v) => (
                <motion.button
                  key={v.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedVoice(v.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all",
                    selectedVoice === v.id
                      ? "border-primary bg-primary/4 text-primary shadow-sm"
                      : "border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{v.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Script */}
          <div>
            <label htmlFor="voice-text" className="label">Script</label>
            <textarea
              id="voice-text"
              value={text}
              onChange={(e) => { setText(e.target.value); setError(""); }}
              placeholder="Enter your script here to generate a voiceover..."
              className={cn(
                "input resize-none",
                text.length > 0 && !textValid ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
              )}
              rows={5}
              aria-invalid={text.length > 0 && !textValid}
              aria-describedby="voice-text-hint"
            />
            <p id="voice-text-hint" className="mt-1.5 text-xs text-muted-foreground">
              {text.length}/5000 {text.length > 0 && !textValid && <span className="text-destructive">(min 5 chars)</span>}
            </p>
          </div>

          <motion.button
            type="button"
            onClick={generate}
            disabled={loading || !textValid}
            whileHover={!loading && textValid ? { scale: 1.01 } : {}}
            whileTap={!loading && textValid ? { scale: 0.99 } : {}}
            className="btn-gradient w-full disabled:opacity-50"
          >
            {loading ? <div className="spinner" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
            {loading ? "Generating..." : "Generate Audio"}
          </motion.button>
        </div>

        {/* Right: preview + saved */}
        <div className="space-y-5">
          {/* Preview */}
          <div>
            <label className="label">Preview</label>
            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-border bg-linear-to-br from-zinc-50/80 to-zinc-50/40 p-5">
              {audioUrl ? (
                <div className="w-full space-y-3">
                  <audio controls src={audioUrl} className="w-full" />
                  <div className="flex gap-2.5">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={downloadAudio}
                      className="btn-ghost flex-1 text-sm"
                    >
                      <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
                      Download
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={saveClone}
                      className="btn-gradient flex-1 text-sm"
                    >
                      Save
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
                    <Mic className="h-7 w-7 text-muted-foreground/40" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-muted-foreground">Generated audio will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Saved Clones */}
          {savedClones.length > 0 && (
            <div>
              <label className="label">Saved Clones</label>
              <div className="space-y-2">
                {savedClones.map((clone) => (
                  <motion.div
                    key={clone.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between rounded-xl border border-border bg-white p-3.5 shadow-card"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{clone.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{clone.voice} · {clone.date}</p>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteClone(clone.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-2"
                      aria-label={`Delete ${clone.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
