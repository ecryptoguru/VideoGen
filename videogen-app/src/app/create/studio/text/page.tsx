"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TextStudio() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (trimmed.length > 4000) {
      setError("Message exceeds 4000 characters");
      return;
    }
    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    try {
      const res = await fetch("/api/minimax/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: trimmed }],
          system: "You are a viral video scriptwriter. Create engaging, platform-optimized scripts.",
        }),
      });
      const data = await res.json();
      console.log("Text API response:", data); // Debug log
      
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      
      // Handle different response formats from MiniMax API
      let content = "";
      if (Array.isArray(data.content)) {
        // MiniMax API returns content as an array of blocks
        const textBlock = data.content.find((block: { type?: string; text?: string }) => block.type === "text");
        if (textBlock?.text) {
          content = textBlock.text;
        } else if (data.content[0]?.text) {
          content = data.content[0].text;
        } else if (typeof data.content[0] === "string") {
          content = data.content[0];
        } else {
          // Try to parse if it's a JSON string
          try {
            const parsed = JSON.parse(JSON.stringify(data.content));
            const textBlock = Array.isArray(parsed) ? parsed.find((b: { type?: string; text?: string }) => b.type === "text") : null;
            content = textBlock?.text || JSON.stringify(data.content);
          } catch {
            content = JSON.stringify(data.content);
          }
        }
      } else if (data.content?.[0]?.text) {
        content = data.content[0].text;
      } else if (data.choices?.[0]?.message?.content) {
        content = data.choices[0].message.content;
      } else if (data.message?.content) {
        content = data.message.content;
      } else if (data.text) {
        content = data.text;
      } else if (data.output) {
        content = data.output;
      }
      
      if (!content) {
        throw new Error("Empty response from API");
      }
      setMessages((prev) => {
        const next = [...prev, { role: "assistant", content }];
        return next.length > 50 ? next.slice(-50) : next;
      });
    } catch {
      if (!mountedRef.current) return;
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't generate a response. Please check your API key in Settings and try again." }]);
    }
    if (!mountedRef.current) return;
    setLoading(false);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Text Studio</h1>
        <p className="text-sm text-muted-foreground">Generate scripts, hooks, and copy with MiniMax M2.7</p>
      </div>

      <div className="flex h-[500px] flex-col rounded-2xl border border-border bg-white shadow-card">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Sparkles className="h-12 w-12 text-primary/30" aria-hidden="true" />
              <p className="mt-2">Start a conversation with M2.7</p>
              <p className="mt-1 text-xs">Try: &quot;Write a 15-second hook for a productivity app&quot;</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          {error && (
            <div className="mb-2 flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              {error}
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Write a viral hook for my SaaS product..."
                className={cn(
                  "w-full resize-none rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors",
                  input.length > 4000 ? "border-destructive focus:ring-2 focus:ring-destructive" : "border-border focus:ring-2 focus:ring-primary"
                )}
                rows={1}
                style={{ minHeight: "42px", maxHeight: "120px" }}
              />
              <span className={cn("absolute bottom-1 right-2 text-[10px]", input.length > 4000 ? "text-destructive" : "text-muted-foreground")}>
                {input.length}/4000
              </span>
            </div>
            <button type="button"
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className="btn-gradient disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
