"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarEvent, Platform } from "@/types";

const platformColors: Record<string, string> = {
  instagram_reels: "bg-pink-500",
  linkedin: "bg-blue-500",
  youtube_shorts: "bg-red-500",
  youtube_long: "bg-red-600",
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newEvent, setNewEvent] = useState<{ title: string; event_date: string; platform: Platform; status: string }>({ title: "", event_date: "", platform: "instagram_reels", status: "scheduled" });

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/calendar");
      if (!res.ok) throw new Error("Failed to load calendar");
      const data = await res.json();
      setEvents(data);
    } catch {
      setError("Failed to load calendar events");
    }
    setLoading(false);
  }

  const mountedRef = useRef(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/calendar");
        if (!res.ok) throw new Error("Failed to load calendar");
        const data = await res.json();
        if (mountedRef.current) setEvents(data);
      } catch {
        if (mountedRef.current) setError("Failed to load calendar events");
      }
      if (mountedRef.current) setLoading(false);
    })();
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    if (!error) return;
    errorTimerRef.current = setTimeout(() => {
      if (errorTimerRef.current) {
        setError("");
        errorTimerRef.current = null;
      }
    }, 6000);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [error]);

  async function addEvent() {
    if (!newEvent.title || !newEvent.event_date) return;
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      if (!res.ok) throw new Error("Failed to add event");
      const data = await res.json();
      setEvents((prev) => [...prev, { ...newEvent, id: data.id, project_id: 0, created_at: new Date().toISOString() }]);
      setShowForm(false);
      setNewEvent({ title: "", event_date: "", platform: "instagram_reels", status: "scheduled" });
    } catch {
      setError("Failed to add event");
    }
  }

  const filteredEvents = useMemo(() => {
    if (selectedFilter === "all") return events;
    return events.filter((e) => e.status === selectedFilter);
  }, [events, selectedFilter]);

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

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
          <button type="button" onClick={loadEvents} className="rounded-md bg-destructive/20 px-2 py-1 text-xs font-medium hover:bg-destructive/30">
            Retry
          </button>
        </motion.div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Plan and schedule your content</p>
        </div>
        <button type="button" className="btn-gradient" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Schedule Post
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex gap-2">
            <input
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Event title..."
              className="input flex-1"
            />
            <input
              type="date"
              value={newEvent.event_date}
              onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
              className="input"
            />
            <select
              value={newEvent.platform}
              onChange={(e) => setNewEvent({ ...newEvent, platform: e.target.value as Platform })}
              className="input"
            >
              <option value="instagram_reels">Reels</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube_shorts">Shorts</option>
              <option value="youtube_long">YouTube</option>
            </select>
            <button type="button" onClick={addEvent} className="btn-gradient">Add</button>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2">
        {["All", "Scheduled", "Draft", "Generating"].map((f) => (
          <button
            type="button"
            key={f}
            onClick={() => setSelectedFilter(f.toLowerCase())}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              selectedFilter === f.toLowerCase()
                ? "bg-primary text-white"
                : "border border-border hover:bg-muted"
            )}
            aria-pressed={selectedFilter === f.toLowerCase()}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        {weekDays.map((day, i) => {
          const dateStr = day.toISOString().split("T")[0];
          const dayEvents = filteredEvents.filter((e) => e.event_date?.startsWith(dateStr));
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 22 }}
              className="card p-3 min-h-[200px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className="text-xs text-muted-foreground">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    className={cn(
                      "w-full rounded-lg p-2 text-left text-xs text-white transition-colors hover:opacity-90",
                      platformColors[event.platform] || "bg-gray-500"
                    )}
                    aria-label={`View ${event.title}`}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}