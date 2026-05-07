# Product Requirements Document (PRD)
# MiniMax Viral Video Generator

---

## 1. Product Overview

### 1.1 Product Name
**MiniMax Viral Video Generator**

### 1.2 One-Sentence Description
A bright, Canva-style creative studio web application that leverages the full MiniMax multimodal AI API suite to auto-generate stunning, platform-optimized viral videos for Instagram, LinkedIn, and YouTube — complete with a comprehensive Brand Kit, viral content intelligence, and a content calendar.

### 1.3 Target Users
- SaaS founders and marketers creating daily social media content
- Content creators and influencers producing short-form video at scale
- Social media managers handling multi-platform content for brands
- Solo entrepreneurs without video editing skills who need professional output

### 1.4 Core Value Proposition
Transform a single topic or idea into a fully produced, brand-consistent viral video in minutes — complete with script, visuals, voiceover, music, captions, and thumbnail — without touching a video editor or learning camera techniques.

---

## 2. Goals & Success Metrics

### 2.1 Primary Goals
1. Reduce video creation time from hours to under 5 minutes per video
2. Maintain brand consistency across all generated content
3. Maximize viral potential through AI-optimized hooks, pacing, and platform-specific formatting
4. Enable batch content creation for weekly/daily publishing schedules

### 2.2 Success Metrics
| Metric | Target |
|---|---|
| Time per video (topic → export) | < 5 minutes |
| Videos generated per user per week | > 7 |
| Brand consistency score | > 85% |
| Hook strength rating (AI score) | > 8/10 |
| User retention (weekly active) | > 60% |

---

## 3. Tech Stack

### 3.1 Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15 (App Router) | React framework with SSR, API routes |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | Latest | Accessible UI component primitives |
| Framer Motion | 11.x | Animations, page transitions, micro-interactions |
| Lucide React | Latest | Icon library |
| React Query (TanStack Query) | 5.x | Server state management, caching, polling |
| Zustand | 5.x | Client state management |
| FFmpeg.wasm | Latest | Client-side video/audio assembly |
| dexie.js | Latest | IndexedDB wrapper for asset caching |

### 3.2 Backend
| Technology | Version | Purpose |
|---|---|---|
| Next.js API Routes | 15 | Server-side API proxy for MiniMax |
| better-sqlite3 | Latest | SQLite database for projects, brand kit, history |
| Node.js | 20+ | Runtime |

### 3.3 External APIs
| Service | Endpoints | Purpose |
|---|---|---|
| MiniMax Text | `POST /anthropic/v1/messages` | Script generation (M2.7) |
| MiniMax Image | `POST /v1/image_generation` | Key visual generation (image-01) |
| MiniMax Video | `POST /v1/video_generation` | Video generation (Hailuo 2.3/02, S2V-01) |
| MiniMax Video Query | `GET /v1/query/video_generation` | Async status polling |
| MiniMax File Retrieve | `GET /v1/files/retrieve` | Download generated videos |
| MiniMax Video Agent | `POST /v1/video_agent` | Template-based video generation |
| MiniMax TTS | `POST /v1/t2a_v2` | Voiceover synthesis (speech-2.8-hd) |
| MiniMax TTS Async | `POST /v1/t2a_async_v2` | Long-form voiceover |
| MiniMax Music | `POST /v1/music_generation` | Background music (music-2.6) |
| MiniMax Lyrics | `POST /v1/lyrics_generation` | Auto-generate song lyrics |
| MiniMax Voice Clone | `POST /v1/voice_clone` | Clone custom voices |
| MiniMax File Upload | `POST /v1/files/upload` | Upload audio/images for cloning |

---

## 4. Feature Specification

### 4.1 Dashboard (`/`)
**Priority:** P0

#### Description
The landing page after login. Provides an at-a-glance overview of recent activity, quick actions, and upcoming scheduled content.

#### UI Elements
- **Hero Banner:** Animated gradient text "Create Viral Videos in Minutes" with floating video preview cards
- **Floating Action Button (FAB):** Large gradient `+ Create Video` button, bottom-right
- **Recent Projects Grid:** 3-column card grid showing last 6 projects with thumbnail, platform badge, status, date
- **Quick Stats Row:** Cards showing "Videos This Week", "Avg Hook Score", "Brand Consistency", "Next Scheduled Post"
- **Content Calendar Widget:** Mini 7-day upcoming view with platform-colored dots
- **Brand Kit Summary:** Compact panel showing logo, primary color, active voice

#### Acceptance Criteria
- [ ] Dashboard loads in < 2s
- [ ] Recent projects auto-refresh on new generation
- [ ] FAB pulses gently to draw attention
- [ ] Stats animate counting up on load

---

### 4.2 New Video Wizard (`/create`)
**Priority:** P0

#### Description
A 4-step guided wizard that transforms a topic into a complete viral video.

#### Step 1: Topic & Platform
- Topic input (textarea, 200 chars max)
- Platform preset selector: Instagram Reels, LinkedIn, YouTube Shorts, YouTube Long-form
- Viral format template picker (optional): "Day in the Life", "Myth vs Fact", "Before/After", "Tutorial", "Storytime", "POV", "React"
- Brand kit context panel (collapsible sidebar showing active brand name, colors, voice)
- "Generate Hooks" button → M2.7 generates 3 hook variants

#### Step 2: Hook & Script
- 3 hook variant cards with hook strength meter (1–10 score)
- User selects one hook or regenerates
- Full script auto-generated, broken into scenes
- Per-scene direction notes and camera commands
- Inline script editor with brand keyword highlighting
- "Regenerate Script", "Add Scene", "Remove Scene" buttons

#### Step 3: Generate Assets
- Live generation grid showing each scene
- Scene cards: image preview, video preview (once ready), status badge
- Parallel progress indicators for Image Gen, Video Gen, Audio Gen, Music Gen
- Per-scene regenerate buttons
- "Use Fast Preview" toggle (renders with Hailuo-2.3-Fast first)

#### Step 4: Preview & Export
- Full video player with timeline
- Caption/subtitle toggle
- Logo watermark toggle
- Volume controls for voiceover and BGM
- Thumbnail picker (3 variants)
- "Export MP4" button → triggers FFmpeg.wasm assembly
- "Schedule for Later" button → adds to content calendar
- "Duplicate & Edit" button

#### Acceptance Criteria
- [ ] Wizard maintains state across steps (user can navigate back)
- [ ] Step 3 shows real-time progress for each async job
- [ ] Step 4 preview plays within 3s of assembly completion
- [ ] Export produces valid MP4 matching platform resolution

---

### 4.3 Creative Studio Hub (`/create/studio`)
**Priority:** P0

#### Description
A hub page providing access to all individual creation studios for manual, granular control.

#### Studios
1. **Text Studio** — M2.7 chat interface with system presets, thinking blocks, streaming
2. **Image Studio** — image-01 generation with aspect ratios, subject reference, seed control
3. **Video Studio** — All 4 modes (T2V, I2V, First-Last-Frame, Subject-Reference) with Camera Command Builder
4. **Audio Studio** — TTS with voice picker, interjections, pause markers, pronunciation dict
5. **Music Studio** — music-2.6 with instrumental toggle, lyrics editor, structure tags
6. **Voice Clone Studio** — Record/upload → example audio → clone → test → save
7. **Caption Studio** — Live video caption overlay editor with styles and animations
8. **Thumbnail Studio** — Frame extraction + text overlay + variant generation

#### UI Pattern
- Gradient studio cards (one per studio) in a responsive grid
- Each card shows: icon, studio name, recent generation count, "Open Studio" button
- Recent generations preview strip below each card
- Breadcrumb: Studio Hub > [Individual Studio]

#### Acceptance Criteria
- [ ] Each studio operates independently without affecting other studios
- [ ] All MiniMax-specific controls are visible and functional
- [ ] Generated assets appear in the Asset Library immediately

---

### 4.4 Project Editor (`/projects/[id]`)
**Priority:** P0

#### Description
The main editing interface for a specific video project. Split-pane layout optimized for video creation.

#### Layout
- **Left Panel (25%):** Scene list with thumbnails, drag-and-drop reordering, scene add/delete
- **Center Panel (50%):** Large video preview with scrubber timeline, play/pause, fullscreen
- **Right Panel (25%):** Contextual controls for selected scene
  - Script editor
  - Camera Command Builder (animated command chips)
  - Prompt optimizer toggle + speed toggle
  - Regenerate buttons (image, video, both)
  - Scene settings (model, duration, resolution)
- **Bottom Bar:** Assembly controls — "Preview Assembly", "Burn Subtitles", "Add Logo", "Export Final"

#### Scene List Features
- Thumbnail preview of each scene's image/video
- Status badge: pending / generating / ready / failed
- Click to select, drag to reorder
- Right-click context menu: duplicate, delete, regenerate, move up/down

#### Timeline Features
- Visual timeline strip showing scene durations
- Click to jump to scene
- Zoom in/out on timeline
- Audio waveform overlay (voiceover + BGM)

#### Acceptance Criteria
- [ ] Scene reordering updates assembly order immediately
- [ ] Regenerating a single scene does not affect other scenes
- [ ] Video preview updates within 2s of selecting a new scene
- [ ] Assembly completes in < 30s for a 5-scene project

---

### 4.5 Brand Kit (`/brand-kit`)
**Priority:** P0

#### Description
A comprehensive brand management hub where users define their brand identity, voice, visual assets, and platform presets. All data feeds into AI generation prompts automatically.

#### Section 1: Brand Identity
- **Logo Upload:** Primary logo + variant (light/dark). PNG/SVG. Preview with transparency check.
- **Brand Colors:** Three color pickers (Primary, Secondary, Accent) with hex input, preset palettes, and contrast checker.
- **Typography:** Heading font picker (Google Fonts dropdown), body font picker, typography style selector (Playful, Corporate, Minimal, Bold, Handwritten).
- **Live Preview:** A mock social post showing how brand colors/fonts look applied.

#### Section 2: Brand Voice & Persona
- **Brand Name:** Text input, max 50 chars
- **Tagline:** Text input, max 100 chars
- **Brand Description:** Textarea, max 500 chars. "What does your product do?"
- **Tone of Voice:** Slider + preset chips (Playful, Professional, Edgy, Friendly, Authoritative, Empathetic)
- **Target Audience:** Textarea describing ideal customer (age, role, pain points)
- **Key Messages:** Tag input for 3–5 core messages that must appear in scripts
- **Words to Avoid:** Tag input for brand no-go words
- **Brand Story:** Rich text editor for origin story/mission
- **Competitors:** Tag input for differentiation context

#### Section 3: Visual Assets
- **Brand Character / Mascot:** Upload zone with guidelines (face photo, clear background, 300×300px min). Shows how it will be used in `subject_reference`.
- **Product Screenshots:** Multi-upload zone (5–10 images). Used for `first_frame_image` in product videos.
- **Brand Photos:** Multi-upload for team/office/event photos.
- **Icon Set:** Upload custom icon pack.
- **Style Guide PDF:** Upload brand guidelines document. Stored for M2.7 reference.

#### Section 4: Platform Presets
- Four preset cards (Reels, LinkedIn, YouTube Shorts, YouTube Long-form)
- Each card editable: video model, resolution, duration, camera style, music mood, TTS voice, caption style
- "Reset to Default" button per preset
- "Create Custom Preset" button

#### Auto-Injection Behavior
- When user creates any content, the app sends full brand context to M2.7
- Image prompts automatically include: "with brand color #7C3AED accent, [typography_style] aesthetic"
- `subject_reference` auto-injected if brand character uploaded
- TTS defaults to brand's cloned voice if set
- Music mood derived from brand tone slider

#### Acceptance Criteria
- [ ] All brand fields save immediately (no manual save button needed)
- [ ] Live preview updates in real-time as colors/fonts change
- [ ] Brand context is included in every M2.7 prompt
- [ ] Platform presets are selectable in the New Video Wizard

---

### 4.6 Asset Library (`/library`)
**Priority:** P1

#### Description
A gallery of all generated assets across all studios, filterable and searchable.

#### Features
- **Grid View:** Responsive masonry grid with asset thumbnails
- **Filters:** Modality (Text/Image/Video/Audio/Music), Platform, Date Range, Model, Status
- **Sort:** Newest, Oldest, Most Used, Platform
- **Folders:** User-created folders for organization (drag-and-drop)
- **Bulk Actions:** Select multiple → Download, Delete, Move to Folder
- **Asset Detail Modal:** Full preview, metadata (prompt, model, params, date), download button, "Use in New Project" button
- **Search:** Full-text search across prompts, project names, and tags

#### Acceptance Criteria
- [ ] Library loads first 50 assets in < 1s
- [ ] Filters apply without page reload
- [ ] Video assets play inline on hover (muted, 3s loop)

---

### 4.7 Content Calendar (`/calendar`)
**Priority:** P1

#### Description
A visual calendar for planning, scheduling, and tracking content publication.

#### Views
- **Month View:** Full month grid, each day shows scheduled video cards
- **Week View:** 7-column layout with time slots
- **List View:** Chronological list of upcoming and past content

#### Features
- **Color Coding:** Instagram (pink), LinkedIn (blue), YouTube (red)
- **Drag-and-Drop:** Move videos between dates
- **Quick Edit:** Click event → popover with status, title, platform, "Edit Project" link
- **Batch Generation:** Select a week → auto-fill with template-based daily videos
- **Status Pipeline:** Draft → Generating → Ready → Scheduled → Published
- **Daily Content Types:** Monday Tip, Tuesday Tutorial, Wednesday Story, Thursday Product, Friday Fun, Saturday Behind-the-Scenes, Sunday Recap

#### Acceptance Criteria
- [ ] Calendar renders 30 days in < 1s
- [ ] Drag-and-drop updates database immediately
- [ ] Status changes reflect in project editor

---

### 4.8 Voice Library (`/voices`)
**Priority:** P1

#### Description
Manage all voices: system voices, cloned voices, and custom voice settings.

#### Features
- **Voice Cards:** Grid of voice cards showing name, type badge (System/Cloned), waveform preview, "Test" play button
- **Set Default:** Star icon to set project-wide default voice
- **Voice Clone Wizard:** 4-step inline wizard (Record/Upload → Example Audio → Clone → Test & Save)
- **Voice Settings per Project:** Override default voice, adjust speed/vol/pitch, pick sound effects
- **Search & Filter:** Search by name, filter by type/language

#### Acceptance Criteria
- [ ] Voice preview plays within 1s of clicking "Test"
- [ ] Cloned voice is available in TTS dropdown immediately after creation
- [ ] Default voice auto-selected in new projects

---

### 4.9 Video Agent Templates (`/templates`)
**Priority:** P1

#### Description
Browse and use MiniMax's pre-built Video Agent templates for faster, consistent content creation.

#### Features
- **Template Gallery:** Masonry grid of template cards with preview thumbnail, template name, category badge
- **Categories:** Product Showcase, Daily Tip, Testimonial, Announcement, Tutorial, Event Promo
- **Template Preview:** Hover to see animated preview or description overlay
- **Fill Editor:** Click template → form with text fields and media upload slots as required by template
- **Generate:** Submit filled template → async generation with status tracking

#### Acceptance Criteria
- [ ] Templates load from hardcoded list or API fetch
- [ ] Fill editor validates required fields before submission
- [ ] Generated video appears in project list with "template" tag

---

### 4.10 Settings (`/settings`)
**Priority:** P1

#### Features
- **API Key:** Secure input with masking, validation test button
- **Default Preferences:** Default platform, default video model, default voice, language
- **Export Settings:** Default filename pattern, auto-burn subtitles, auto-add logo
- **Data Management:** Export all data (JSON), import data, delete all generations
- **Theme:** Toggle between Bright Creative (default) and Dark Mode
- **Notifications:** Enable/disable toast notifications for async completions

---

## 5. MiniMax API Integration Specification

### 5.1 Authentication Pattern
All MiniMax API calls proxied through Next.js API routes. Client never sees API key.

```
Client → Next.js API Route → MiniMax API
Headers: Authorization: Bearer {MINIMAX_API_KEY}
```

### 5.2 Text Generation (M2.7)
- **Model:** `MiniMax-M2.7`
- **Endpoint:** `POST https://api.minimax.io/anthropic/v1/messages`
- **System Prompt Template:**
  ```
  You are a viral video scriptwriter for [brand_name]. 
  Brand context: [brand_description]
  Tone: [tone_of_voice]
  Audience: [target_audience]
  Key messages: [key_messages]
  Words to avoid: [words_to_avoid]
  Platform: [platform] → [platform_specific_instructions]
  ```
- **Features Used:** Thinking blocks, streaming, tool use

### 5.3 Image Generation (image-01)
- **Endpoint:** `POST https://api.minimax.io/v1/image_generation`
- **Parameters:**
  - `model`: `"image-01"`
  - `prompt`: Up to 1500 chars, auto-injected with brand colors/style
  - `aspect_ratio`: `"1:1"`, `"16:9"`, `"4:3"`, `"3:2"`, `"2:3"`, `"3:4"`, `"9:16"`, `"21:9"`
  - `n`: 1–9
  - `response_format`: `"base64"` (preferred for caching)
  - `prompt_optimizer`: true/false
  - `subject_reference`: Array with `type: "character"`, `image_file` (if brand character active)

### 5.4 Video Generation (Hailuo 2.3 / 02 / S2V-01)
- **Endpoint:** `POST https://api.minimax.io/v1/video_generation`
- **Parameters (I2V):**
  - `model`: `"MiniMax-Hailuo-2.3"`, `"MiniMax-Hailuo-2.3-Fast"`, `"MiniMax-Hailuo-02"`, `"S2V-01"`
  - `prompt`: Up to 2000 chars with `[command]` syntax
  - `first_frame_image`: URL or base64 data URL
  - `last_frame_image`: (for Hailuo-02 first-last-frame mode)
  - `subject_reference`: (for S2V-01)
  - `duration`: `6` or `10`
  - `resolution`: `"720P"` or `"1080P"`
  - `prompt_optimizer`: true/false
  - `prompt_optimizer_mode`: `"fast"` or `"slow"`

### 5.5 Video Status & Download
- **Poll:** `GET https://api.minimax.io/v1/query/video_generation?task_id={id}` every 10s
- **States:** Preparing → Queueing → Processing → Success | Fail
- **Download:** `GET https://api.minimax.io/v1/files/retrieve?file_id={id}` → `download_url`
- **URL Expiry:** 24 hours → must download immediately and cache locally

### 5.6 TTS (speech-2.8-hd)
- **Endpoint:** `POST https://api-uw.minimax.io/v1/t2a_v2`
- **Parameters:**
  - `model`: `"speech-2.8-hd"` or `"speech-2.8-turbo"`
  - `text`: Up to 10,000 chars (paragraphs with `\n`, pause markers `<#x#>`)
  - `voice_setting`: `{ voice_id, speed, vol, pitch }`
  - `voice_modify`: `{ pitch, intensity, timbre, sound_effects }`
  - `audio_setting`: `{ sample_rate, bitrate, format, channel }`
  - `pronunciation_dict`: `{ tone: ["word/phonetic"] }`
  - `stream`: false
  - `timestamp`: true (for subtitle generation)

### 5.7 Async Long TTS
- **Endpoint:** `POST https://api.minimax.io/v1/t2a_async_v2`
- **Use When:** Text > 10,000 chars or batch processing
- **Workflow:** Upload text file → get `file_id` → create task → poll status → download

### 5.8 Music Generation (music-2.6)
- **Endpoint:** `POST https://api.minimax.io/v1/music_generation`
- **Parameters:**
  - `model`: `"music-2.6"`, `"music-cover"`, `"music-2.6-free"`
  - `prompt`: Style/mood description (1–2000 chars)
  - `lyrics`: With structure tags (`[Verse]`, `[Chorus]`, etc.)
  - `is_instrumental`: true/false
  - `lyrics_optimizer`: true/false
  - `output_format`: `"url"` or `"hex"`
  - `audio_setting`: `{ sample_rate, bitrate, format }`

### 5.9 Voice Clone
- **Upload Source:** `POST https://api.minimax.io/v1/files/upload` with `purpose: "voice_clone"`
- **Upload Example:** `POST https://api.minimax.io/v1/files/upload` with `purpose: "prompt_audio"`
- **Clone:** `POST https://api.minimax.io/v1/voice_clone` with `file_id`, `voice_id`, `clone_prompt`
- **Reuse:** Use returned `voice_id` in TTS requests

---

## 6. Viral Content Features

### 6.1 Viral Hook Generator
- **Trigger:** Step 2 of New Video Wizard
- **Behavior:** M2.7 generates 3 hook variants based on topic + platform + brand
- **Variants:**
  - A: Curiosity gap ("Did you know...")
  - B: Direct challenge ("Stop scrolling if...")
  - C: FOMO/urgency ("In 30 seconds you'll...")
- **Scoring:** M2.7 rates each 1–10 with reasoning
- **UI:** 3 cards with score badge, preview text, "Use This" button

### 6.2 Trending Format Templates
- **Formats:** "Day in the Life", "Before vs After", "Myth vs Fact", "Tutorial", "Storytime", "POV", "React", "Q&A", "Product Demo", "Customer Win"
- **Behavior:** Selecting a format pre-fills M2.7 system prompt with format-specific instructions
- **UI:** Horizontal scrollable chip list above topic input

### 6.3 Caption & Subtitle Studio
- **Auto-Captions:** Generated from TTS `timestamp` return data (sentence-level)
- **Styles:** Bold Boxed, Clean Minimal, Colorful Gradient, Typewriter, Bounce-In, Pop
- **Animations:** Fade, Slide-Up, Type-On, Pop, Bounce
- **Customization:** Font family, size, color, background opacity, position (top/middle/bottom)
- **Burn-In:** FFmpeg.wasm `drawtext` filter applied during assembly

### 6.4 Thumbnail Generator
- **Trigger:** Step 4 of New Video Wizard, after video assembly
- **Behavior:**
  1. Extract 5 best frames from final video (key moments)
  2. M2.7 generates thumbnail caption text based on hook + brand
  3. Overlay text on each frame with brand fonts/colors
  4. Generate 3 variants with different layouts
- **UI:** 3-column grid, click to preview full-size, "Download PNG" button
- **Sizes:** 1280×720 (YouTube), 1080×1080 (LinkedIn/Instagram)

---

## 7. UI/UX Design System

### 7.1 Visual Style: Bright Creative Studio
- **Vibe:** Canva-style — vibrant, playful, professional, media-forward
- **Background:** Clean white `#FFFFFF` with gradient accent sections
- **Primary Gradients:** Purple `#7C3AED` → Pink `#EC4899` → Orange `#F97316`
- **Cards:** White background, rounded-2xl (`16px`), `shadow-lg`, subtle border `border-gray-100`
- **Buttons:** Gradient primary, white secondary with colored border
- **Typography:** Inter (headings, 600 weight) + system-ui (body). Large headlines.
- **Spacing:** Generous padding (`p-6`, `gap-6`). Whitespace-first.
- **Icons:** Lucide React with gradient background circles on feature cards

### 7.2 Animation Specs (Framer Motion)
| Element | Animation | Duration | Easing |
|---|---|---|---|
| Page transition | Fade + slide up | 0.3s | `easeOut` |
| Card hover | Scale 1.02 + shadow increase | 0.2s | `spring` |
| FAB pulse | Scale 1.05 → 1.0 loop | 2s | `easeInOut` |
| Progress bars | Width animation + shimmer | 0.5s | `easeOut` |
| Scene list | Staggered fade-in | 0.05s per item | `easeOut` |
| Toast notification | Slide in from right + fade | 0.3s | `spring` |
| Confetti completion | Burst from center | 2s | `easeOut` |
| Camera command chips | Pop-in with rotation | 0.2s | `spring` |

### 7.3 Responsive Breakpoints
| Breakpoint | Layout Adjustments |
|---|---|
| Desktop (1280px+) | Full 3-column dashboard, split-pane editor |
| Tablet (768–1279px) | 2-column dashboard, stacked editor panels |
| Mobile (<768px) | Single column, bottom sheet for controls, timeline hidden |

---

## 8. Database Schema

### 8.1 Projects & Scenes
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  topic TEXT,
  script TEXT,
  music_prompt TEXT,
  status TEXT DEFAULT 'draft',
  video_mode TEXT DEFAULT 'i2v',
  video_model TEXT DEFAULT 'MiniMax-Hailuo-2.3',
  hook_variant TEXT,
  thumbnail_urls TEXT,
  scheduled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scenes (
  id INTEGER PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  order_index INTEGER NOT NULL,
  script TEXT,
  direction_notes TEXT,
  image_url TEXT,
  image_base64 TEXT,
  video_task_id TEXT,
  video_file_id TEXT,
  video_url TEXT,
  video_blob BLOB,
  status TEXT DEFAULT 'pending',
  camera_commands TEXT,
  prompt_optimizer INTEGER DEFAULT 1,
  prompt_optimizer_mode TEXT DEFAULT 'fast'
);
```

### 8.2 Audio & Voices
```sql
CREATE TABLE audio_assets (
  id INTEGER PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  type TEXT,
  url TEXT,
  blob BLOB,
  tts_model TEXT,
  voice_id TEXT,
  tts_settings TEXT,
  music_model TEXT,
  is_instrumental INTEGER,
  lyrics TEXT,
  timestamps TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE voices (
  id INTEGER PRIMARY KEY,
  voice_id TEXT UNIQUE NOT NULL,
  name TEXT,
  type TEXT,
  source_file_id TEXT,
  prompt_file_id TEXT,
  description TEXT,
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 8.3 Brand Kit
```sql
CREATE TABLE brand_kit (
  id INTEGER PRIMARY KEY,
  brand_name TEXT,
  tagline TEXT,
  description TEXT,
  tone_of_voice TEXT,
  target_audience TEXT,
  key_messages TEXT,
  words_to_avoid TEXT,
  brand_story TEXT,
  competitors TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  heading_font TEXT,
  body_font TEXT,
  typography_style TEXT,
  logo_url TEXT,
  logo_variant_url TEXT,
  mascot_image_url TEXT,
  mascot_file_id TEXT,
  style_guide_url TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE brand_assets (
  id INTEGER PRIMARY KEY,
  brand_kit_id INTEGER REFERENCES brand_kit(id),
  type TEXT,
  name TEXT,
  url TEXT,
  file_id TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 8.4 Calendar & History
```sql
CREATE TABLE platform_presets (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  video_model TEXT,
  resolution TEXT,
  duration INTEGER,
  camera_style TEXT,
  music_mood TEXT,
  tts_voice_id TEXT,
  caption_style TEXT,
  is_default INTEGER DEFAULT 0
);

CREATE TABLE calendar_events (
  id INTEGER PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  title TEXT,
  event_date DATETIME,
  status TEXT DEFAULT 'scheduled',
  platform TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE generations (
  id INTEGER PRIMARY KEY,
  modality TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt TEXT,
  params TEXT,
  output_url TEXT,
  output_blob BLOB,
  file_id TEXT,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. Async Architecture & Polling

### 9.1 Video Generation Flow
1. `POST /v1/video_generation` → receive `task_id`
2. Store `task_id` in `scenes` table with `status = 'processing'`
3. Client polls `GET /v1/query/video_generation?task_id={id}` every 10s
4. On `status = 'Success'`:
   - Extract `file_id`
   - Call `GET /v1/files/retrieve?file_id={id}` → get `download_url`
   - Download video blob immediately
   - Store blob in IndexedDB + SQLite
   - Update scene status to `'ready'`
   - Trigger toast notification + confetti
5. On `status = 'Fail'`:
   - Update scene status to `'failed'`
   - Show error with retry button

### 9.2 Multi-Scene Parallel Polling
- All scene tasks fire in parallel on Step 3
- Server maintains a task queue with max concurrency (respect MiniMax rate limits)
- React Query manages per-scene polling with independent `useQuery` hooks
- UI shows per-scene progress bars with MiniMax-specific status labels

### 9.3 Long TTS Async Flow
1. If script > 10,000 chars, use async TTS endpoint
2. Upload text file → get `file_id`
3. `POST /v1/t2a_async_v2` → get `task_id`
4. Poll `GET /v1/query/t2a_async_query_v2?task_id={id}`
5. On success, download via `GET /v1/files/retrieve_content?file_id={id}`

---

## 10. FFmpeg.wasm Assembly Pipeline

### 10.1 Trigger
User clicks "Export Final" in Project Editor or Step 4 of New Video Wizard.

### 10.2 Steps
1. **Lazy Load:** Load FFmpeg.wasm (~25MB) with progress indicator
2. **Fetch Assets:** Pull all scene MP4s, voiceover MP3, music MP3 from IndexedDB as `ArrayBuffer`s
3. **Concatenate Scenes:**
   - Write scene files to FFmpeg virtual FS
   - Create concat list file
   - Run: `ffmpeg -f concat -i list.txt -c copy scenes.mp4`
4. **Mix Audio:**
   - Voiceover at 100% volume
   - BGM at 25% volume with fade-in (1s) and fade-out (2s)
   - Run: `ffmpeg -i scenes.mp4 -i voiceover.mp3 -i music.mp3 -filter_complex "[1:a]volume=1.0[vo];[2:a]volume=0.25,afade=t=in:ss=0:d=1,afade=t=out:st=end-2:d=2[bg];[vo][bg]amix=inputs=2:duration=first" -c:v copy -c:a aac final.mp4`
5. **Burn Subtitles:**
   - Parse TTS timestamp JSON
   - Generate `drawtext` filter commands per sentence
   - Apply brand caption style (font, color, position)
   - Run: `ffmpeg -i final.mp4 -vf "drawtext=..." -c:a copy output.mp4`
6. **Add Logo Watermark:**
   - If brand logo configured: overlay at corner with opacity 0.8
   - Run: `ffmpeg -i output.mp4 -i logo.png -filter_complex "[1:v]scale=... ,overlay=W-w-10:H-h-10:format=auto:enable='between(t,0,9999)'" -c:a copy final_branded.mp4`
7. **Platform Resolution:**
   - Pad/crop to target resolution if needed
   - Run: `ffmpeg -i final_branded.mp4 -vf "scale=w:h:force_original_aspect_ratio=decrease,pad=w:h:(ow-iw)/2:(oh-ih)/2" -c:a copy {platform}_{date}_{slug}.mp4`
8. **Download:** Trigger browser download of final MP4

### 10.3 Fallback
If FFmpeg.wasm fails or user cancels load, offer raw asset ZIP download (individual scenes + audio files) for external editing.

---

## 11. Implementation Phases

### Phase 1: Foundation, Brand Kit & Manual Studios (Week 1)
- [ ] Next.js 15 + Tailwind + shadcn/ui scaffold with Canva-style design system
- [ ] SQLite schema implementation (all tables)
- [ ] Brand Kit hub page (Identity, Voice, Visual Assets, Presets)
- [ ] Server API routes for all MiniMax endpoints with type-safe wrappers
- [ ] Manual Studios: Text, Image, Video, Audio, Music, Voice Clone
- [ ] Asset Library with basic gallery
- [ ] Settings page (API key, theme, defaults)

### Phase 2: Auto-Generate, Viral Features & Calendar (Week 2)
- [ ] 4-step New Video Wizard with state persistence
- [ ] M2.7 script generation with brand context injection
- [ ] Viral Hook Generator with 3 variants and strength meter
- [ ] Scene → Image → Video → Audio parallel pipeline
- [ ] Camera Command Builder with animated UI
- [ ] Subject reference auto-injection from Brand Kit
- [ ] First-last-frame transition mode
- [ ] Voice Library with clone workflow
- [ ] Content Calendar with drag-and-drop
- [ ] Async polling UI with progress indicators and confetti

### Phase 3: Assembly, Thumbnails, Templates & Polish (Week 3)
- [ ] FFmpeg.wasm integration with full pipeline
- [ ] Caption Studio with live preview and brand styles
- [ ] Thumbnail Generator with 3 variants
- [ ] Video Agent Template browser and filler
- [ ] Batch generation for weekly content
- [ ] Dashboard with stats, brand consistency score, usage tracking
- [ ] Responsive design, dark mode, loading skeletons
- [ ] Export presets with auto-branding filenames
- [ ] Command palette (Cmd+K) for global search

---

## 12. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Video async generation slow (30–120s) | UX frustration | High | Animated progress, MiniMax status steps, fast preview mode, toast notifications |
| FFmpeg.wasm large payload (25MB) | Slow first export | Medium | Lazy-load with progress bar, raw ZIP fallback |
| MiniMax API rate limits | Failed generations | Medium | Server-side queue with concurrency limits, retry with backoff |
| API key exposure | Security breach | Low | All calls proxied through Next.js routes, never client-side |
| URL expiry (24h) | Lost generated videos | Medium | Auto-download on success, cache in IndexedDB + SQLite blob |
| Model-specific requirements (Hailuo-02 for FL2V, S2V-01 for subject ref) | User confusion | Medium | UI auto-enforces correct model selection with visual badges |
| TTS interjections limited to speech-2.8 | Feature mismatch | Low | UI conditionally disables interjection picker with tooltip |
| Voice clone audio format issues | Clone failure | Low | Validate format on upload, show requirements |
| Brand kit bloats prompts | Token overflow | Low | Summarize brand context before injection, compress uploaded images |
| Browser storage limits for IndexedDB | Cannot cache large videos | Low | Auto-purge old blobs, keep only last 30 days, SQLite blob fallback |

---

## 13. Open Questions

1. Should we add **auto-posting** to Instagram/LinkedIn/YouTube APIs after generation?
2. Do we need **multi-language support** (MiniMax TTS covers 30+ languages)?
3. Should we support **team collaboration** (multiple users, shared brand kits, project sharing)?
4. Should we add **A/B testing analytics** (track which hooks/thumbnails perform best)?
5. Do we need **integration with scheduling tools** (Buffer, Hootsuite, Later)?

---

## 14. Glossary

| Term | Definition |
|---|---|
| **Hailuo 2.3** | MiniMax's flagship video generation model (T2V, I2V, camera commands) |
| **Hailuo-2.3-Fast** | Speed-optimized version for quick previews |
| **Hailuo-02** | Supports first-last-frame transitions |
| **S2V-01** | Subject-reference video model for character consistency |
| **T2V** | Text-to-Video generation |
| **I2V** | Image-to-Video generation |
| **FL2V** | First-Last-Frame-to-Video |
| **M2.7** | MiniMax's text generation model (Anthropic API compatible) |
| **image-01** | MiniMax's image generation model |
| **speech-2.8-hd** | MiniMax's high-quality TTS model |
| **music-2.6** | MiniMax's music generation model |
| **subject_reference** | MiniMax feature for consistent character/product appearance |
| **Camera Command** | `[command]` syntax in prompts for explicit camera control |
| **Brand Kit** | User's comprehensive brand identity and asset collection |
| **Hook** | The opening 1–3 seconds designed to stop the scroll |
| **FFmpeg.wasm** | WebAssembly build of FFmpeg for client-side video processing |
