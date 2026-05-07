"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  MessageSquare,
  Image as ImageIcon,
  Video,
  Mic,
  Music,
  Fingerprint,
  Type,
  Frame,
} from "lucide-react";

const studios = [
  { name: "Text Studio", icon: MessageSquare, desc: "M2.7 chat, scripts, hooks", color: "from-violet-500 to-purple-600", href: "/create/studio/text" },
  { name: "Image Studio", icon: ImageIcon, desc: "image-01 generation", color: "from-pink-500 to-rose-500", href: "/create/studio/image" },
  { name: "Video Studio", icon: Video, desc: "T2V, I2V, camera commands", color: "from-orange-500 to-amber-500", href: "/create/studio/video" },
  { name: "Audio Studio", icon: Mic, desc: "TTS, voice settings", color: "from-emerald-500 to-teal-500", href: "/create/studio/audio" },
  { name: "Music Studio", icon: Music, desc: "music-2.6 generation", color: "from-cyan-500 to-sky-500", href: "/create/studio/music" },
  { name: "Voice Clone", icon: Fingerprint, desc: "Clone your voice", color: "from-indigo-500 to-blue-600", href: "/create/studio/voice-clone" },
  { name: "Caption Studio", icon: Type, desc: "Subtitle styles & burn", color: "from-fuchsia-500 to-pink-600", href: "/create/studio/caption" },
  { name: "Thumbnail Studio", icon: Frame, desc: "Thumbnail generation", color: "from-red-500 to-orange-600", href: "/create/studio/thumbnail" },
];

export default function StudioHub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Creative Studio</h1>
        <p className="text-sm text-muted-foreground">Pick a studio to create individual assets</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {studios.map((studio, i) => (
          <motion.div
            key={studio.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={studio.href}>
              <div className="group rounded-2xl bg-white p-6 shadow-card transition-all hover:shadow-card-hover">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${studio.color} text-white`}>
                  <studio.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold">{studio.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{studio.desc}</p>
                <div className="mt-4 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Open Studio →
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
