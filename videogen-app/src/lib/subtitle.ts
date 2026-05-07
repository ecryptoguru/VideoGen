export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface TranscriptResult {
  text: string;
  segments: TranscriptSegment[];
  language?: string;
}

function formatTimestampSRT(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

function formatTimestampVTT(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

function splitLongLine(text: string, maxChars: number = 42): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxChars) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function exportSRT(
  segments: TranscriptSegment[],
  options: { maxCharsPerLine?: number; speakerLabel?: boolean } = {}
): string {
  const { maxCharsPerLine = 42, speakerLabel = false } = options;
  const lines: string[] = [];
  let cueIndex = 1;

  for (const seg of segments) {
    const duration = seg.end - seg.start;
    if (duration <= 0) continue;

    const subLines = splitLongLine(seg.text, maxCharsPerLine);
    for (const line of subLines) {
      const speakerPrefix = speakerLabel && seg.speaker ? `[${seg.speaker}] ` : "";
      lines.push(cueIndex.toString());
      lines.push(`${formatTimestampSRT(seg.start)} --> ${formatTimestampSRT(seg.end)}`);
      lines.push(speakerPrefix + line);
      lines.push("");
      cueIndex++;
    }
  }

  return lines.join("\n");
}

export function exportVTT(
  segments: TranscriptSegment[],
  options: { maxCharsPerLine?: number; speakerLabel?: boolean } = {}
): string {
  const { maxCharsPerLine = 42, speakerLabel = false } = options;
  const lines: string[] = ["WEBVTT", ""];
  let cueIndex = 1;

  for (const seg of segments) {
    const duration = seg.end - seg.start;
    if (duration <= 0) continue;

    const subLines = splitLongLine(seg.text, maxCharsPerLine);
    const speakerPrefix = speakerLabel && seg.speaker ? `${seg.speaker}: ` : "";

    if (subLines.length === 1) {
      lines.push(`${cueIndex}`);
      lines.push(`${formatTimestampVTT(seg.start)} --> ${formatTimestampVTT(seg.end)}`);
      lines.push(speakerPrefix + subLines[0]);
      lines.push("");
      cueIndex++;
    } else {
      for (let i = 0; i < subLines.length; i++) {
        const start = i === 0 ? seg.start : seg.start + (duration / subLines.length) * i;
        const end = i === subLines.length - 1 ? seg.end : start + duration / subLines.length;
        lines.push(`${cueIndex}`);
        lines.push(`${formatTimestampVTT(start)} --> ${formatTimestampVTT(end)}`);
        lines.push(speakerPrefix + subLines[i]);
        lines.push("");
        cueIndex++;
      }
    }
  }

  return lines.join("\n");
}

export function exportJSON(
  segments: TranscriptSegment[],
  metadata: {
    title?: string;
    source?: string;
    language?: string;
    duration?: number;
  } = {}
): TranscriptResult & { schema_version: string; metadata: typeof metadata } {
  return {
    schema_version: "1.0",
    metadata,
    text: segments.map((s) => s.text).join(" "),
    segments,
  };
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function hexToAudioUrl(hex: string, mimeType = "audio/mp3"): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function parseMiniMaxTimestamps(
  text: string,
  timestamps?: Array<{ start: number; end: number; text: string }>
): TranscriptSegment[] {
  if (timestamps && Array.isArray(timestamps)) {
    return timestamps.map((t) => ({
      start: t.start,
      end: t.end,
      text: t.text,
    }));
  }
  return [{ start: 0, end: 0, text }];
}