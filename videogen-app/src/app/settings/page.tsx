"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Key, Moon, Sun, Database, Trash2, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("minimax_api_key") || "";
    }
    return "";
  });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [darkMode]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  async function saveApiKey() {
    setSaving(true);
    setError("");
    try {
      localStorage.setItem("minimax_api_key", apiKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save API key");
    }
    setSaving(false);
  }

  function toggleDarkMode() {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  }

  function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "videogen-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function confirmDelete() {
    if (!window.confirm("This will delete your API key and all local preferences. This cannot be undone.")) return;
    localStorage.removeItem("minimax_api_key");
    localStorage.removeItem("brandKit");
    localStorage.removeItem("theme");
    localStorage.removeItem("video_wizard_state");
    setApiKey("");
    setDarkMode(false);
    document.documentElement.removeAttribute("data-theme");
    setShowDeleteConfirm(false);
    setDeleteSuccess(true);
    setTimeout(() => setDeleteSuccess(false), 3000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Settings
          <span className="gradient-text ml-2 text-xl">Preferences</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your app preferences and API keys</p>
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
      {deleteSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          All data deleted successfully.
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        {/* API Key */}
        <div className="card card-hover p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
              <Key className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">MiniMax API Key</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Stored locally in your browser</p>
            </div>
            {saved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 rounded-lg bg-success/10 border border-success/20 px-3 py-1.5 text-xs font-semibold text-success"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Saved
              </motion.span>
            )}
          </div>
          <div className="mt-4 flex gap-2.5">
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setError(""); }}
              placeholder="sk-... (MiniMax API key)"
              className="input flex-1"
              autoComplete="off"
            />
            <motion.button
              type="button"
              onClick={saveApiKey}
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              className="btn-gradient disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? (
                <div className="spinner" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Save
            </motion.button>
          </div>
        </div>

        {/* Theme */}
        <div className="card card-hover p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
                {darkMode ? <Moon className="h-5 w-5 text-primary" aria-hidden="true" /> : <Sun className="h-5 w-5 text-primary" aria-hidden="true" />}
              </div>
              <div>
                <h3 className="font-semibold">Appearance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Light or dark mode</p>
              </div>
            </div>
            <motion.button
              type="button"
              onClick={toggleDarkMode}
              role="switch"
              aria-checked={darkMode}
              aria-label="Toggle dark mode"
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative h-7 w-12 rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary",
                darkMode ? "bg-primary shadow-md" : "bg-muted border border-border"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-200",
                  darkMode ? "left-[22px] bg-white" : "left-0.5 bg-white"
                )}
              />
            </motion.button>
          </div>
        </div>

        {/* Data */}
        <div className="card card-hover p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/15">
              <Database className="h-5 w-5 text-destructive" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold">Data Management</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Export or delete your local data</p>
            </div>
          </div>
          <div className="mt-4">
            {showDeleteConfirm ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="text-sm text-destructive font-semibold">Are you sure? This will delete your API key and all local data. Cannot be undone.</p>
                </div>
                <div className="flex gap-2.5 pl-6">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-ghost text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    className="btn-destructive text-sm"
                  >
                    Yes, Delete All
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="flex gap-2.5">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={exportData}
                  className="btn-ghost text-sm"
                >
                  Export Settings
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete All Data
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
