"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Star, Play, Trash2, AlertCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Voice } from "@/types";

export default function VoiceLibrary() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const mountedRef = useRef(false);

  async function loadVoices() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/voices");
      if (!res.ok) throw new Error("Failed to load voices");
      const data = await res.json();
      if (mountedRef.current) setVoices(data);
    } catch {
      if (mountedRef.current) setError("Failed to load voices.");
    }
    if (mountedRef.current) setLoading(false);
  }

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/voices");
        if (!res.ok) throw new Error("Failed to load voices");
        const data = await res.json();
        if (mountedRef.current) setVoices(data);
      } catch {
        if (mountedRef.current) setError("Failed to load voices.");
      }
      if (mountedRef.current) setLoading(false);
    })();
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  async function setDefault(id: number) {
    try {
      await fetch("/api/voices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "setDefault" }),
      });
      setVoices((prev) => prev.map((v) => ({ ...v, is_default: v.id === id ? 1 : 0 })));
    } catch {
      if (mountedRef.current) setError("Failed to set default voice");
    }
  }

  async function deleteVoice(id: number) {
    if (!confirm("Delete this voice?")) return;
    try {
      const res = await fetch("/api/voices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setVoices((prev) => prev.filter((v) => v.id !== id));
    } catch {
      if (mountedRef.current) setError("Failed to delete voice. Please try again.");
    }
  }

  const filteredVoices = useMemo(() => {
    return voices.filter((v) => {
      const matchesSearch = v.name?.toLowerCase().includes(search.toLowerCase()) || v.voice_id?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || v.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [voices, search, filter]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="spinner spinner-dark" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={loadVoices} className="rounded-md bg-destructive/20 px-2 py-1 text-xs font-medium hover:bg-destructive/30">
            Retry
          </button>
        </motion.div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage system voices and cloned voices</p>
        </div>
        <div className="flex gap-2">
          {["all", "system", "cloned"].map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm capitalize transition-colors",
                filter === f ? "bg-primary text-white" : "border border-border hover:bg-muted"
              )}
              aria-pressed={filter === f}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search voices..."
          className="input pl-9"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVoices.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No voices found. Create a voice clone in the Voice Clone Studio.
          </p>
        ) : (
          filteredVoices.map((voice, i) => (
            <motion.div
              key={voice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 22 }}
              className="card p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Mic className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{voice.name || voice.voice_id}</h3>
                    <span className={cn(
                      "badge border text-xs capitalize",
                      voice.type === "system" ? "bg-blue-100 text-blue-700 border-blue-100" : "bg-violet-100 text-violet-700 border-violet-100"
                    )}>
                      {voice.type}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDefault(voice.id)}
                  className={cn(
                    "rounded p-1.5 transition-colors",
                    voice.is_default ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                  )}
                  aria-label={voice.is_default ? "Default voice" : "Set as default"}
                  title={voice.is_default ? "Default voice" : "Set as default"}
                >
                  <Star className={cn("h-4 w-4", voice.is_default && "fill-current")} aria-hidden="true" />
                </button>
              </div>

              {voice.description && (
                <p className="mt-3 text-sm text-muted-foreground">{voice.description}</p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlayingId(playingId === voice.id ? null : voice.id)}
                  className="btn-ghost text-sm"
                >
                  <Play className="h-3 w-3" aria-hidden="true" />
                  {playingId === voice.id ? "Stop" : "Test"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteVoice(voice.id)}
                  className="ml-auto rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete voice"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}