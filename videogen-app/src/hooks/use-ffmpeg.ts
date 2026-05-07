"use client";

import { useRef, useCallback, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type FFmpegLog = { type: string; message: string };

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<FFmpegLog[]>([]);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const latestResultUrlRef = useRef("");

  const load = useCallback(async () => {
    if (ffmpegRef.current) return;
    setLoading(true);
    setError("");
    try {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message, type }) => {
        setLogs((prev) => [...prev.slice(-50), { type, message }]);
      });
      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      ffmpegRef.current = ffmpeg;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load FFmpeg");
    }
    setLoading(false);
  }, []);

  const assembleVideo = useCallback(
    async (options: {
      images: string[];
      audioUrl?: string;
      musicUrl?: string;
      outputName?: string;
      durationPerImage?: number;
    }) => {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg) {
        setError("FFmpeg not loaded. Call load() first.");
        return;
      }
      setLoading(true);
      setProgress(0);
      setError("");
      setResultUrl("");

      try {
        const {
          images,
          audioUrl,
          musicUrl,
          outputName = "output.mp4",
          durationPerImage = 3,
        } = options;

        if (images.length === 0) {
          throw new Error("At least one image is required");
        }

        // Write images
        for (let i = 0; i < images.length; i++) {
          const ext = images[i].split(".").pop()?.toLowerCase() || "jpg";
          const safeExt = ext === "png" ? "png" : "jpg";
          const fileName = `img_${String(i).padStart(3, "0")}.${safeExt}`;
          const fileData = await fetchFile(images[i]);
          await ffmpeg.writeFile(fileName, fileData);
        }

        // Write audio if provided
        let hasAudio = false;
        if (audioUrl) {
          const audioData = await fetchFile(audioUrl);
          await ffmpeg.writeFile("voice.mp3", audioData);
          hasAudio = true;
        }
        if (musicUrl) {
          const musicData = await fetchFile(musicUrl);
          await ffmpeg.writeFile("music.mp3", musicData);
        }

        // Create concat list for images
        const concatContent = images
          .map((_, i) => {
            const ext = images[i].split(".").pop()?.toLowerCase() || "jpg";
            const safeExt = ext === "png" ? "png" : "jpg";
            return `file img_${String(i).padStart(3, "0")}.${safeExt}\nduration ${durationPerImage}`;
          })
          .join("\n");
        await ffmpeg.writeFile("concat.txt", concatContent);

        // Build filter_complex
        const filters: string[] = [];

        // Video stream from images
        filters.push(
          `[0:v]fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v]`
        );

        // Audio mixing
        if (hasAudio && musicUrl) {
          filters.push(
            `[1:a]volume=1.0[va];[2:a]volume=0.25[ma];[va][ma]amix=inputs=2:duration=longest[aout]`
          );
        } else if (hasAudio) {
          filters.push(`[1:a]volume=1.0[aout]`);
        } else if (musicUrl) {
          filters.push(`[1:a]volume=0.25[aout]`);
        }

        const args = [
          "-f", "concat",
          "-safe", "0",
          "-i", "concat.txt",
        ];

        if (hasAudio) args.push("-i", "voice.mp3");
        if (musicUrl) args.push("-i", "music.mp3");

        args.push(
          "-filter_complex",
          filters.join(";"),
          "-map", "[v]",
        );

        if (hasAudio || musicUrl) {
          args.push("-map", "[aout]");
          args.push("-c:a", "aac", "-b:a", "192k");
        }

        args.push(
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "23",
          "-movflags", "+faststart",
          "-pix_fmt", "yuv420p",
          "-shortest",
          outputName
        );

        await ffmpeg.exec(args);

        const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
        const blob = new Blob([new Uint8Array(data)], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        if (latestResultUrlRef.current) {
          URL.revokeObjectURL(latestResultUrlRef.current);
        }
        latestResultUrlRef.current = url;
        setResultUrl(url);

        for (let i = 0; i < images.length; i++) {
          const ext = images[i].split(".").pop()?.toLowerCase() || "jpg";
          const safeExt = ext === "png" ? "png" : "jpg";
          const fileName = `img_${String(i).padStart(3, "0")}.${safeExt}`;
          try { await ffmpeg.deleteFile(fileName); } catch { /* ignore */ }
        }
        try { await ffmpeg.deleteFile("concat.txt"); } catch { /* ignore */ }
        if (hasAudio) {
          try { await ffmpeg.deleteFile("voice.mp3"); } catch { /* ignore */ }
        }
        if (musicUrl) {
          try { await ffmpeg.deleteFile("music.mp3"); } catch { /* ignore */ }
        }

        return url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Assembly failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const cleanup = useCallback(() => {
    if (latestResultUrlRef.current) {
      URL.revokeObjectURL(latestResultUrlRef.current);
      latestResultUrlRef.current = "";
      setResultUrl("");
    }
    if (ffmpegRef.current) {
      ffmpegRef.current.terminate();
      ffmpegRef.current = null;
    }
    setLogs([]);
    setProgress(0);
    setError("");
    setLoading(false);
  }, []);

  return { load, assembleVideo, cleanup, loading, progress, logs, error, resultUrl };
}
