"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Music, AlertCircle } from "lucide-react";

const structureTags = ["[Intro]", "[Verse]", "[Chorus]", "[Bridge]", "[Outro]"];

export default function MusicStudio() {
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [instrumental, setInstrumental] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const mountedRef = useRef(true);
  const blobUrlRef = useRef("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  async function insertTag(tag: string) {
    setLyrics((prev) => prev + `\n${tag}\n`);
  }

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/minimax/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "music-2.6",
          prompt: prompt.trim(),
          ...(lyrics.trim() && !instrumental ? { lyrics: lyrics.trim() } : {}),
          instrumental,
          output_format: "hex",
        }),
      });
      const data = await res.json();
      console.log("Music API response:", data); // Debug log
      
      // Check for error in base_resp
      if (data.base_resp?.status_code !== 0) {
        throw new Error(data.base_resp.status_msg || "Music generation failed");
      }
      
      // Handle different response formats from MiniMax API
      // Official spec: data.audio when output_format is hex
      // Official spec: data.url when output_format is url
      const audioHex = data.audio || data.data?.audio || data.url || data.file_id;
      if (audioHex) {
        const hex = typeof audioHex === "string" ? audioHex : String(audioHex);
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        const blob = new Blob([new Uint8Array(bytes)], { type: "audio/mp3" });
        const newUrl = URL.createObjectURL(blob);
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = newUrl;
        setAudioUrl(newUrl);
      } else if (data.url) {
        // Handle URL-based response
        setAudioUrl(data.url);
      } else if (data.base_resp?.status_msg) {
        throw new Error(data.base_resp.status_msg);
      } else {
        console.log("Music response structure:", JSON.stringify(data, null, 2));
        throw new Error("No music returned");
      }
    } catch {
      if (!mountedRef.current) return;
      setError("Failed to generate music. Please try again.");
    }
    if (!mountedRef.current) return;
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Music Studio
          <span className="gradient-text ml-2 text-xl">AI Composer</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate background music with MiniMax music-2.6
        </p>
      </div>

      <div className="space-y-5">
        {/* Instrumental toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div className="relative">
              <input
                type="checkbox"
                checked={instrumental}
                onChange={(e) => setInstrumental(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 rounded-full bg-muted peer-checked:bg-primary transition-colors duration-200" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm peer-checked:translate-x-4 transition-transform duration-200" />
            </div>
            <span className="text-sm font-medium text-foreground">Instrumental</span>
          </label>
        </div>

        {/* Prompt */}
        <div>
          <label htmlFor="music-prompt" className="label">Mood / Style Prompt</label>
          <textarea
            id="music-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Upbeat electronic pop for a SaaS product demo, vibrant and energetic..."
            className="input resize-none"
            rows={3}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Describe the mood, genre, instruments, and energy level
          </p>
        </div>

        {/* Lyrics */}
        {!instrumental && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <label htmlFor="lyrics-input" className="label">Lyrics</label>
            <div className="flex flex-wrap gap-1.5">
              {structureTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => insertTag(tag)}
                  className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-mono text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              id="lyrics-input"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="[Verse]\nYour lyrics here...\n[Chorus]\nHook here..."
              className="input resize-none font-mono text-xs"
              rows={6}
            />
          </motion.div>
        )}

        {/* Error */}
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

        {/* Generate */}
        <motion.button
          type="button"
          onClick={generate}
          disabled={loading || !prompt.trim()}
          whileHover={!loading && prompt.trim() ? { scale: 1.02 } : {}}
          whileTap={!loading && prompt.trim() ? { scale: 0.98 } : {}}
          className="btn-gradient w-full disabled:opacity-50"
        >
          {loading ? (
            <div className="spinner" aria-hidden="true" />
          ) : (
            <Music className="h-4 w-4" aria-hidden="true" />
          )}
          {loading ? "Generating..." : "Generate Music"}
        </motion.button>

        {/* Audio result */}
        {audioUrl && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-white p-4 shadow-card"
          >
            <audio controls src={audioUrl} className="w-full" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
