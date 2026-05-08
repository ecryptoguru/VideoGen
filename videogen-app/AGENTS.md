<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# VideoGen App - Agent Documentation

## Overview

**VideoGen** is an AI-powered video creation platform that generates short-form video content for Instagram, YouTube, and LinkedIn using MiniMax AI APIs. The app features a 4-step video creation wizard, studio tools for individual asset generation (captions, thumbnails, music, voice cloning), SEO optimization for YouTube, Instagram metadata management, trend research, competitive analysis, and comprehensive security/monitoring features.

**Tech Stack:**
- Next.js 16.2.4 with App Router (NOT Pages Router)
- React 19.2.4 with TypeScript
- Prisma ORM v7 with SQLite (local) and PostgreSQL/Supabase (production)
- Tailwind CSS v4 with custom design system
- Framer Motion for animations
- MiniMax AI APIs (text, image, video, TTS, music, voice clone, transcribe)
- Zod for validation schemas
- Security: CSRF protection, rate limiting, content filtering, audit logging

---

## Project Structure

```
videogen-app/src/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes (route.ts files)
│   │   ├── brand-kit/            # Brand kit CRUD
│   │   ├── calendar/             # Calendar events
│   │   ├── competitors/          # Competitor tracking CRUD
│   │   ├── docs/                 # API documentation
│   │   ├── generations/          # Generation history
│   │   ├── minimax/              # All MiniMax API proxies
│   │   │   ├── text/             # Text/chat API
│   │   │   ├── image/            # Image generation
│   │   │   ├── video/            # Video generation
│   │   │   ├── tts/              # Text-to-speech (sync)
│   │   │   ├── tts_async/        # Text-to-speech (async)
│   │   │   ├── music/            # Music generation
│   │   │   ├── voice_clone/      # Voice cloning
│   │   │   ├── transcribe/       # Audio transcription
│   │   │   ├── status/           # Task status polling
│   │   │   ├── file_upload/      # File upload
│   │   │   ├── file_retrieve/    # File retrieval
│   │   │   └── video_agent/      # Video agent
│   │   ├── projects/             # Projects CRUD
│   │   │   ├── [id]/             # Single project
│   │   │   │   ├── instagram/    # Instagram metadata
│   │   │   │   ├── linkedin/     # LinkedIn metadata
│   │   │   │   └── youtube/      # YouTube metadata
│   │   ├── scenes/               # Scenes CRUD
│   │   ├── seo/                  # SEO scoring & suggestions
│   │   │   ├── score/            # SEO score calculation
│   │   │   └── suggest/          # AI suggestions
│   │   ├── trends/               # Trend discovery API
│   │   ├── viral/                # Viral video tracking API
│   │   ├── video-poll/           # Video polling endpoint
│   │   └── voices/               # Voices CRUD
│   ├── brand-kit/                # Brand kit page
│   ├── calendar/                  # Calendar page
│   ├── create/                   # Video creation wizard + studios
│   │   ├── page.tsx              # Main 4-step wizard
│   │   ├── instagram/            # Instagram Studio
│   │   ├── seo/                  # YouTube SEO Studio
│   │   └── studio/               # Individual studios
│   │       ├── audio/            # Audio studio
│   │       ├── caption/          # Caption studio
│   │       ├── image/            # Image generation studio
│   │       ├── music/            # Music generation studio
│   │       ├── text/             # Text generation studio
│   │       ├── thumbnail/        # Thumbnail studio
│   │       ├── video/            # Video generation studio
│   │       └── voice-clone/      # Voice cloning studio
│   ├── library/                  # Project library
│   ├── page.tsx                  # Dashboard (home)
│   ├── projects/[id]/            # Project editor
│   ├── settings/                 # Settings page
│   ├── templates/                # Video templates
│   ├── trends/                   # Trend & Competitive Research
│   └── voices/                   # Voice management
├── components/                   # Shared components
│   ├── app-shell.tsx             # App shell wrapper
│   ├── create-video/             # Wizard step components
│   │   ├── error-banner.tsx      # Error banner for wizard
│   │   ├── step-1-topic-platform.tsx
│   │   ├── step-2-hook-selection.tsx
│   │   ├── step-3-script-review.tsx
│   │   ├── step-4-asset-generation.tsx
│   │   ├── wizard-header.tsx     # Wizard header component
│   │   └── wizard-navigation.tsx # Wizard navigation buttons
│   ├── error-boundary.tsx        # React error boundary
│   └── icons/                    # Custom SVG icon components
│       └── PlatformIcons.tsx    # Platform icons (Instagram, LinkedIn, YouTube, etc.)
├── data/                         # Database
│   ├── db.ts                     # Prisma client setup with dual database support
│   ├── db-queries.ts              # Prisma query functions
│   ├── migrate.ts                # Migration runner (legacy, kept for compatibility)
│   └── migrations/               # SQL migration files (legacy)
│       ├── 001_initial_schema.sql
│       ├── 002_add_brand_kit_columns.sql
│       ├── 003_add_instagram_metadata_columns.sql
│       ├── 004_add_indexes.sql
│       ├── 005_add_api_usage_tracking.sql
│       ├── 006_add_user_consent.sql
│       ├── 007_add_performance_indexes.sql
│       ├── 008_add_check_constraints.sql
│       └── 009_add_audit_logs.sql
├── prisma/                       # Prisma ORM configuration
│   ├── schema.prisma              # Database schema (SQLite/PostgreSQL)
│   ├── config.ts                  # Prisma configuration
│   └── migrations/                # Prisma migrations (if using Prisma Migrate)
├── hooks/                        # Custom React hooks
│   ├── use-ffmpeg.ts             # FFmpeg for video assembly
│   └── use-video-poll.ts         # Video task polling
├── lib/                          # Utilities
│   ├── api-error-handler.ts      # Centralized API error handling
│   ├── audit-log.ts              # Security event logging
│   ├── content-filter.ts         # Content filtering & PII detection
│   ├── consent.ts                # User consent management
│   ├── cost-tracker.ts           # API cost tracking & quota management
│   ├── csrf.ts                   # CSRF protection
│   ├── db-queries.ts             # Database query functions
│   ├── json-validator.ts         # JSON validation utilities
│   ├── logger.ts                 # API logging with persistence
│   ├── rate-limit.ts             # Rate limiting (in-memory)
│   ├── request-id.ts             # Request ID generation & tracking
│   ├── retry.ts                  # Retry logic with exponential backoff
│   ├── schema-validator.ts      # API response schema validation
│   ├── subtitle.ts               # Subtitle export (SRT, VTT, JSON)
│   └── utils.ts                  # Utility functions (cn, hexToUint8Array)
└── types/                        # TypeScript type definitions
    └── index.ts                  # All interfaces and types
```
---

## Database Schema (SQLite/PostgreSQL)

### Database Configuration

The app uses Prisma ORM v7 with dual database support:
- **Local Development**: SQLite via `@prisma/adapter-better-sqlite3`
- **Production**: PostgreSQL via Supabase using `@prisma/adapter-pg`

The database client is configured in `src/lib/db.ts` and automatically selects the appropriate adapter based on the `DATABASE_URL` environment variable.

### Tables

**projects**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| name | TEXT | Project name |
| platform | TEXT | instagram_reels, linkedin, youtube_shorts, youtube_long |
| topic | TEXT | Video topic |
| script | TEXT | JSON string of scenes |
| music_prompt | TEXT | Music generation prompt |
| status | TEXT | draft, generating, processing, ready, published, failed |
| video_mode | TEXT | t2v, i2v, fl2v, s2v, template |
| video_model | TEXT | MiniMax-Hailuo-2.3, etc. |
| hook_variant | TEXT | Selected hook text |
| thumbnail_urls | TEXT | JSON array of URLs |
| scheduled_at | DATETIME | Scheduled publish time |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**scenes**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| project_id | INTEGER | FK to projects |
| order_index | INTEGER | Scene order |
| script | TEXT | Scene script text |
| direction_notes | TEXT | Video direction prompts |
| image_url | TEXT | Generated image URL |
| image_base64 | TEXT | Base64 image data |
| video_task_id | TEXT | MiniMax task ID |
| video_file_id | TEXT | MiniMax file ID |
| video_url | TEXT | Generated video URL |
| status | TEXT | pending, generating, ready, failed |
| camera_commands | TEXT | Camera movement commands |
| prompt_optimizer | INTEGER | Prompt optimization flag |
| prompt_optimizer_mode | TEXT | fast, quality |

**audio_assets**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| project_id | INTEGER | FK to projects |
| type | TEXT | tts, music |
| url | TEXT | Audio file URL |
| tts_model | TEXT | TTS model used |
| voice_id | TEXT | Voice identifier |
| tts_settings | TEXT | JSON settings |
| music_model | TEXT | Music model used |
| is_instrumental | INTEGER | Boolean |
| lyrics | TEXT | Song lyrics |
| timestamps | TEXT | JSON timestamps |

**voices**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| voice_id | TEXT | Unique voice ID |
| name | TEXT | Display name |
| type | TEXT | system, cloned |
| source_file_id | TEXT | Source audio file |
| prompt_file_id | TEXT | Prompt audio file |
| description | TEXT | Voice description |
| is_default | INTEGER | Default voice flag |

**brand_kit**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key (always 1) |
| brand_name | TEXT | Brand name |
| tagline | TEXT | Brand tagline |
| description | TEXT | Brand description |
| tone_of_voice | TEXT | Brand tone |
| target_audience | TEXT | Target audience |
| key_messages | TEXT | Key brand messages |
| words_to_avoid | TEXT | Words to avoid |
| brand_story | TEXT | Brand story |
| competitors | TEXT | Competitors |
| primary_color | TEXT | Primary hex color |
| secondary_color | TEXT | Secondary hex color |
| accent_color | TEXT | Accent hex color |
| heading_font | TEXT | Heading font |
| body_font | TEXT | Body font |
| typography_style | TEXT | Typography style |
| logo_url | TEXT | Logo URL |
| logo_variant_url | TEXT | Logo variant URL |
| mascot_image_url | TEXT | Mascot image URL |
| mascot_file_id | TEXT | Mascot file ID |
| style_guide_url | TEXT | Style guide URL |
| language | TEXT | Brand language |
| voice_id | TEXT | Default voice ID |

**instagram_metadata**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| project_id | INTEGER | FK to projects |
| caption | TEXT | Instagram caption |
| hashtags | TEXT | Comma-separated hashtags |
| hashtags_suggested | TEXT | AI-suggested hashtags |
| story_text | TEXT | Story sticker text |
| story_hashtags | TEXT | Story hashtags |
| reel_title | TEXT | Reel title |
| reel_description | TEXT | Reel description |
| cover_image_prompt | TEXT | Cover image prompt |
| content_type | TEXT | reel, story, feed_carousel, feed_single |
| target_audience | TEXT | Target audience |
| call_to_action | TEXT | CTA text |
| scheduled_at | DATETIME | |
| published_at | DATETIME | |

**youtube_metadata** (via ALTER TABLE migrations)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| project_id | INTEGER | FK to projects |
| title | TEXT | Video title |
| description | TEXT | Video description |
| tags | TEXT | JSON array string |
| hashtags | TEXT | JSON array string |
| category | TEXT | YouTube category |
| language | TEXT | Language code |
| privacy_status | TEXT | public, unlisted, private |
| seo_score | INTEGER | Calculated SEO score |
| thumbnail_text | TEXT | Thumbnail overlay text |
| thumbnail_overlay_json | TEXT | JSON {headline, sub} |
| chapters | TEXT | JSON array of chapters |
| scheduled_at | DATETIME | |
| published_at | DATETIME | |

**linkedin_metadata**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| project_id | INTEGER | FK to projects |
| headline | TEXT | LinkedIn post headline |
| caption | TEXT | Full post caption |
| hashtags | TEXT | Comma-separated hashtags |
| hashtags_suggested | TEXT | AI-suggested hashtags |
| target_audience | TEXT | Target audience segment |
| call_to_action | TEXT | CTA text |
| content_format | TEXT | post, carousel, article, video |
| industry | TEXT | Industry vertical |
| scheduled_at | DATETIME | |
| published_at | DATETIME | |

**competitors**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| name | TEXT | Competitor name |
| platform | TEXT | instagram, linkedin, youtube |
| handle | TEXT | Social media handle |
| description | TEXT | Description |
| niche | TEXT | Industry/niche |
| followers | INTEGER | Follower count |
| avg_engagement | REAL | Avg engagement rate |
| avg_views | INTEGER | Avg view count |
| posting_frequency | TEXT | Posting frequency |
| content_themes | TEXT | Content themes (comma-separated) |
| is_active | INTEGER | Active flag |

**trend_cache**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| platform | TEXT | instagram, linkedin, youtube |
| category | TEXT | hashtag, topic, format, caption_style |
| trend_text | TEXT | Trend text or hashtag |
| trend_type | TEXT | Type of trend |
| volume_score | INTEGER | Volume score (0-10000) |
| velocity_score | INTEGER | Velocity/growth score |
| hashtag | TEXT | Hashtag if applicable |
| description | TEXT | Why it's trending |
| example_posts | TEXT | Example posts (pipe-separated) |
| expires_at | DATETIME | Cache expiration |

**viral_videos**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| platform | TEXT | instagram, linkedin, youtube |
| video_title | TEXT | Video title |
| video_url | TEXT | Video URL |
| thumbnail_url | TEXT | Thumbnail URL |
| creator_name | TEXT | Creator name |
| creator_handle | TEXT | Creator handle |
| views | INTEGER | View count |
| likes | INTEGER | Like count |
| comments | INTEGER | Comment count |
| shares | INTEGER | Share count |
| engagement_rate | REAL | Engagement rate % |
| posted_at | DATETIME | Original post date |
| used_in_project_id | INTEGER | FK to projects |

**api_usage** (migration 005)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| user_id | TEXT | User identifier |
| project_id | INTEGER | FK to projects |
| endpoint | TEXT | API endpoint called |
| model | TEXT | AI model used |
| duration_ms | INTEGER | Request duration |
| cost_cents | INTEGER | Cost in cents |
| status | TEXT | success, error |
| error_message | TEXT | Error details |
| cache_creation_tokens | INTEGER | Prompt cached tokens |
| cache_read_tokens | INTEGER | Cache hit tokens |
| input_tokens | INTEGER | Input token count |
| output_tokens | INTEGER | Output token count |
| created_at | DATETIME | |

**user_quota** (migration 005)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| user_id | TEXT | User identifier (unique) |
| daily_quota_cents | INTEGER | Daily quota (default 1000 = $10) |
| monthly_quota_cents | INTEGER | Monthly quota (default 30000 = $300) |
| daily_used_cents | INTEGER | Daily used amount |
| monthly_used_cents | INTEGER | Monthly used amount |
| daily_reset_date | DATE | Daily reset date |
| monthly_reset_date | DATE | Monthly reset date |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**user_consent** (migration 006)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| user_id | TEXT | User identifier (unique) |
| ai_data_consent | BOOLEAN | AI data usage consent |
| consent_date | DATETIME | Consent granted date |
| consent_version | TEXT | Consent version (default 1.0) |
| data_retention_accepted | BOOLEAN | Data retention consent |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**audit_logs** (migration 009)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| event_type | TEXT | Security event type |
| user_id | TEXT | User identifier |
| ip_address | TEXT | Client IP address |
| user_agent | TEXT | Client user agent |
| endpoint | TEXT | API endpoint |
| method | TEXT | HTTP method |
| status_code | INTEGER | HTTP status |
| details | TEXT | Event details |
| created_at | DATETIME | |

**_migrations** (migration tracking)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| migration_id | TEXT | Migration identifier (unique) |
| filename | TEXT | Migration filename |
| applied_at | DATETIME | When migration was applied |

**api_logs** (created by logger.ts)
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| timestamp | TEXT | Request timestamp |
| endpoint | TEXT | API endpoint |
| method | TEXT | HTTP method |
| status | INTEGER | HTTP status |
| duration | INTEGER | Request duration ms |
| error | TEXT | Error message |
| user_id | TEXT | User identifier |
| ip | TEXT | Client IP |
| user_agent | TEXT | Client user agent |
| request_id | TEXT | Unique request ID |
| project_id | INTEGER | Project ID |
| model | TEXT | AI model used |
| cost_cents | INTEGER | Cost in cents |
| cache_read_tokens | INTEGER | Cache read tokens |
| cache_creation_tokens | INTEGER | Cache creation tokens |
| created_at | DATETIME | |

---

## Key Types

```typescript
type Platform = "instagram_reels" | "linkedin" | "youtube_shorts" | "youtube_long";
type TrendPlatform = "instagram" | "linkedin" | "youtube";
type VideoMode = "t2v" | "i2v" | "fl2v" | "s2v" | "template";
type ProjectStatus = "draft" | "generating" | "processing" | "ready" | "published" | "failed";
type SceneStatus = "pending" | "generating" | "ready" | "failed";
type Modality = "text" | "image" | "video" | "tts" | "music" | "voice_clone";
```

---

## API Routes

### MiniMax Proxies

All MiniMax API calls go through these proxy routes (adds auth, error handling, content filtering, quota checking):

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/minimax/text` | POST | Chat completion (hooks, scripts, SEO suggestions) |
| `/api/minimax/image` | POST | Image generation |
| `/api/minimax/video` | POST | Video generation (returns task_id) |
| `/api/minimax/tts` | POST | Synchronous TTS (short text) |
| `/api/minimax/tts_async` | POST | Async TTS (long text) |
| `/api/minimax/music` | POST | Music generation |
| `/api/minimax/voice_clone` | POST | Voice cloning |
| `/api/minimax/transcribe` | POST | Audio transcription |
| `/api/minimax/status` | GET | Poll task status |
| `/api/minimax/file_upload` | POST | Upload audio file |
| `/api/minimax/file_retrieve` | GET | Retrieve generated file |
| `/api/minimax/video_agent` | POST | Video agent orchestration |

### Project Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/projects` | GET | List all projects |
| `/api/projects` | POST | Create new project |
| `/api/projects/[id]` | GET | Get project details |
| `/api/projects/[id]` | PATCH | Update project |
| `/api/projects/[id]/instagram` | GET/POST | Instagram metadata |
| `/api/projects/[id]/linkedin` | GET/POST | LinkedIn metadata |
| `/api/projects/[id]/youtube` | GET/POST | YouTube metadata |

### Other Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/scenes` | GET/POST/PATCH/DELETE | Scene CRUD |
| `/api/seo/score` | POST | Calculate SEO score |
| `/api/seo/suggest` | POST | AI SEO suggestions |
| `/api/brand-kit` | GET/POST | Brand kit CRUD |
| `/api/voices` | GET/POST/DELETE | Voice management |
| `/api/calendar` | GET/POST | Calendar events |
| `/api/generations` | GET | Generation history |
| `/api/trends` | GET | Trend discovery (platform, category filters; refresh param for AI refresh) |
| `/api/competitors` | GET/POST/PUT/DELETE | Competitor tracking |
| `/api/viral` | GET/POST/DELETE/PATCH | Viral video tracking |
| `/api/video-poll` | GET | Video task polling (client-side) |
| `/api/docs` | GET | API documentation |

---

## Platform-Specific Details

### YouTube
- **Long form** (youtube_long): 16:9 aspect ratio, 10s duration
- **Shorts** (youtube_shorts): 9:16 aspect ratio, 6s duration
- SEO metadata: title, description, tags, hashtags, chapters, thumbnail text
- Thumbnail overlay: headline + sub-text stored as JSON

### Instagram
- **Reels**: 9:16 aspect ratio, 6s duration
- **Content types**: reel, story, feed_carousel, feed_single
- Caption scoring: character count (125-2200 optimal), hashtag count (5-30 optimal)
- Hook phrases for caption starts (case-insensitive matching)
- CTA options: swipe up, save, tag, share, link in bio, follow, comment, etc.

### LinkedIn
- **Format**: 1:1 aspect ratio, 10s duration
- **Content formats**: post, carousel, article, video
- Caption scoring: character count (150-3000 optimal), hashtag count (3-5 optimal)
- Hook phrases for opening lines (case-insensitive matching)
- LinkedIn-specific CTAs: "What would you add?", "DM me if...", "Connect if...", etc.
- Industry targeting for content relevance
- Audience segmentation: executives, founders, job seekers, consultants, etc.

---

## Hook Phrases (Instagram)

```typescript
const HOOK_PHRASES = [
  "Here's what nobody tells you about",
  "The real reason I",
  "Stop scrolling —",
  "This changed everything when I",
  "三年后我才明白 (I only realized after 3 years)",
  "You'll wish you knew this sooner",
  "The truth about",
  "My secret to",
  "How I turned",
  "Why most people fail at",
];
```

## Hook Phrases (LinkedIn)

```typescript
const HOOK_PHRASES_LINKEDIN = [
  "Here's what nobody tells you about",
  "The real reason I",
  "Stop scrolling —",
  "This changed everything when I",
  "I was wrong about this for years.",
  "3 things I wish I knew before",
  "I almost turned down",
  "I turned down $",
  "We almost ran out of",
  "Tuesday, 9 PM.",
];
```

---

## Camera Commands (Video Generation)

```typescript
const cameraCommands = [
  "[Push in]", "[Pull out]", "[Pan left]", "[Pan right]",
  "[Tilt up]", "[Tilt down]", "[Zoom in]", "[Zoom out]",
  "[Truck left]", "[Truck right]", "[Pedestal up]", "[Pedestal down]",
  "[Shake]", "[Tracking shot]", "[Static shot]",
];
```

---

## AI Models

### Video Models
- `MiniMax-Hailuo-2.3` (supports 768P, 1080P)
- `MiniMax-Hailuo-2.3-Fast` (supports 768P, 1080P)
- `MiniMax-Hailuo-02` (supports 512P, 768P, 1080P)
- `I2V-01` (supports 720P)

### Color Grades
- Natural, Cinematic, Teal-Orange, Cyberpunk, Vintage Film, Japanese Fresh, Morandi, High Contrast

### TTS Voice
- Default: `English_expressive_narrator`
- Async model: `speech-2.8-hd`

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MINIMAX_API_KEY` | MiniMax API key (required) |
| `DATABASE_URL` | Database connection string (SQLite: `file:./data/video-gen.db` for local, PostgreSQL connection string for Supabase production) |
| `SUPABASE_URL` | Supabase project URL (for production) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (for production) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for production) |

### Local Development
Use SQLite by default with `DATABASE_URL=file:./data/video-gen.db`

### Production (Vercel)
Set `DATABASE_URL` to your Supabase PostgreSQL connection string and include Supabase URL and keys. Configure the root directory in Vercel settings to `videogen-app`.

---

## Design System

### Color Palette
- Primary: Violet (#7C3AED)
- Secondary: Pink (#EC4899)
- Accent: Orange (#F97316)
- Success: Green
- Warning: Yellow
- Destructive: Red

### Typography
- Heading font: Inter (default)
- Body font: system-ui (default)

### Components
- `btn-gradient`: Primary gradient button
- `shadow-card`: Card shadow style
- `rounded-2xl`: Standard border radius
- Border: `border-border` (default gray)

---

## Library Utilities

### Security & Monitoring

**lib/csrf.ts** - CSRF Protection
- Generates and validates CSRF tokens
- Sets tokens in httpOnly, secure cookies
- Middleware for state-changing endpoints (POST, PATCH, DELETE, PUT)
- Skips CSRF for public API routes (/api/minimax, /api/brand-kit)

**lib/rate-limit.ts** - Rate Limiting
- In-memory rate limiting (for development)
- Pre-configured limiters: `apiLimiter` (100/15min), `strictLimiter` (10/15min), `miniMaxLimiter` (20/1min)
- IP-based identification with fallback headers
- Automatic cleanup of expired entries every minute
- Returns standard rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After)

**lib/content-filter.ts** - Content Filtering & PII Detection
- Filters prompt injection patterns (90+ patterns)
- Detects harmful content keywords
- PII detection: email, phone, credit card, SSN, IP address, URL, API key, address, DOB
- SQL injection and XSS pattern detection
- Input sanitization with length limits
- Returns severity levels (low, medium, high)

**lib/audit-log.ts** - Security Event Logging
- Logs authentication events (login, logout, failures)
- CSRF validation failures
- Rate limit violations
- Data access events (project CRUD)
- Content blocking and PII detection
- Quota exceeded events
- Admin actions and config changes
- Suspicious activity detection (multiple failed logins, rate limit violations)

**lib/consent.ts** - User Consent Management
- Tracks AI data usage consent
- Versioned consent system (current: 1.0)
- Data retention acceptance tracking
- Consent revocation support
- Used before calling MiniMax APIs

### API Cost & Quota Management

**lib/cost-tracker.ts** - API Cost Tracking
- MiniMax token pricing: input (0.01¢/token), output (0.04¢/token), cache write (0.0125¢/token), cache read (0.001¢/token)
- Quota management: daily (default 1000¢ = $10), monthly (default 30000¢ = $300)
- Quota alerts at 80%, 90%, 95% thresholds
- API usage recording with token counts
- Usage statistics: total requests, costs, cache hit rate, avg duration
- Model performance metrics: success rate, failure counts, total costs

### Error Handling & Validation

**lib/api-error-handler.ts** - Centralized Error Handling
- Custom ApiError class with context (userId, projectId, endpoint, method, duration)
- Specialized error responses: validation, quota exceeded, rate limit, consent required, config error, content blocked
- Automatic request ID generation
- Integration with apiLogger for error tracking
- Development vs production error messages

**lib/validation-schemas.ts** - Zod Validation Schemas
- Schemas for all API endpoints: projects, scenes, brand kit, MiniMax APIs, calendar, voices, metadata
- Type-safe validation before database operations
- Platform enums, status enums, video mode enums
- Field-level validation (length, format, required)

**lib/schema-validator.ts** - API Response Validation
- Validates MiniMax API responses against expected schemas
- Video, text, image, audio response validators
- Quality validation for URLs (protocol, domain, file extension)
- Suspicious domain detection

### Logging & Request Tracking

**lib/logger.ts** - API Logging
- In-memory + database persistence (api_logs table)
- Request tracking: endpoint, method, status, duration, error
- Context: userId, projectId, model, costCents, cache tokens
- Query methods: by request ID, user ID, project ID
- Error logs and slow request tracking
- Statistics: total requests, error rate, duration percentiles (p50, p95, p99), total cost, cache hit rate
- Automatic cleanup of old logs (configurable days)

**lib/request-id.ts** - Request ID Generation
- Unique request IDs (timestamp + random string)
- Short IDs for display
- Request context tracking (in-memory Map)
- Automatic cleanup of old contexts (older than 1 hour)

### Retry & Resilience

**lib/retry.ts** - Retry Logic with Exponential Backoff
- Configurable max retries, initial delay, max delay, backoff multiplier, jitter
- Pre-configured options: `miniMaxRetryOptions`, `quickRetryOptions`
- Retryable status codes: 408, 429, 500, 502, 503, 504
- Retryable error codes: ECONNREFUSED, ETIMEDOUT, ECONNRESET, ENOTFOUND, EAI_AGAIN
- Callbacks: onRetry, onMaxRetriesReached

### JSON & Data Validation

**lib/json-validator.ts** - JSON Validation Utilities
- validateJSONString: checks if string is valid JSON
- parseJSONSafely: parses with default value fallback
- stringifyJSONSafely: stringifies with error handling
- isValidJSONArray / isValidJSONObject: type-specific validation
- validateFieldSchema: field-specific schema validation for database columns

### Subtitle Utilities

**lib/subtitle.ts** - Subtitle Export
- exportSRT: SRT format with line splitting (max 42 chars)
- exportVTT: WebVTT format with multi-line support
- exportJSON: JSON format with metadata
- downloadFile: browser download helper
- hexToAudioUrl: converts hex audio data to blob URL
- parseMiniMaxTimestamps: parses MiniMax timestamp format

## Migration System

**src/data/migrate.ts** - Migration Runner
- Tracks applied migrations in `_migrations` table
- Applies migrations in alphabetical order (001, 002, etc.)
- Transaction-based migration execution
- Graceful error handling with detailed logging
- Run on application startup via db.ts

Migration files:
- 001_initial_schema.sql: Core tables (projects, scenes, audio_assets, voices, brand_kit, instagram_metadata, youtube_metadata, linkedin_metadata, competitors, trend_cache, viral_videos)
- 002_add_brand_kit_columns.sql: Extended brand kit fields
- 003_add_instagram_metadata_columns.sql: Additional Instagram fields
- 004_add_indexes.sql: Performance indexes
- 005_add_api_usage_tracking.sql: api_usage, user_quota tables
- 006_add_user_consent.sql: user_consent table
- 007_add_performance_indexes.sql: Additional performance indexes
- 008_add_check_constraints.sql: Data integrity constraints
- 009_add_audit_logs.sql: audit_logs table with indexes

## Common Patterns

### useCallback with mountedRef pattern
```typescript
const mountedRef = useRef(false);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);
// Use in async callbacks to prevent state updates after unmount
if (!mountedRef.current) return;
```

### API route with params (Next.js 16)
```typescript
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```

### Column allowlisting for security
```typescript
const ALLOWED_COLS = new Set([...]);
const filtered = filterAllowedCols(updates, ALLOWED_COLS);
```

### Score computation with debouncing
```typescript
const computeScoreRef = useRef<() => void>(() => {});
useEffect(() => {
  computeScoreRef.current = () => computeScore();
}, [computeScore]);
useEffect(() => {
  const timer = setTimeout(() => computeScoreRef.current(), 800);
  return () => clearTimeout(timer);
}, [meta.title, meta.description, ...]);
```

---

## Important Implementation Notes

1. **Instagram hook detection is case-insensitive** - Always compare with `.toLowerCase()`
2. **YouTube GET route uses `[id]` param** - NOT query params like Instagram
3. **SEO suggest endpoint handles multiple platforms** - instagram, instagram_hashtags, instagram_reels, and YouTube defaults
4. **Scene IDs may be temporary (client-side)** - Use `dbId` for database IDs, `id` for client-side tracking
5. **Video generation is async** - Poll `/api/minimax/status?task_id=xxx` for completion
6. **FFmpeg runs in browser** - Loaded via `@ffmpeg/core` hook for client-side video assembly
7. **LocalStorage persistence** - Video wizard state saved to localStorage for recovery
8. **SQLite migrations via ALTER TABLE** - Gracefully handles missing columns with try/catch
9. **Blob URL cleanup uses `blobUrlRef` pattern** - Always use a `useRef` to track the latest blob URL so cleanup effects with `[]` deps can revoke the current URL without stale closures. Call `URL.revokeObjectURL` before setting a new URL. On unmount, revoke the ref value.
10. **Async TTS polling loop must set failed status on exhaustion** - When the polling loop exits after max attempts without success, it must explicitly call `setGenerationProgress(prev => ({ ...prev, voiceover: "failed" }))`.
11. **Error auto-dismiss uses ref-based cancel-then-set** - To avoid leaking timers when error changes before timeout fires: clear existing timer ref first, then set new one.
12. **Migrations run automatically on startup** - The `db.ts` file calls `runMigrations()` on initialization. Always use migration files for schema changes, never manual ALTER TABLE in code.
13. **Rate limiting is in-memory only** - For production, replace with Redis or similar distributed cache. Current implementation resets on server restart.
14. **CSRF protection skips certain routes** - `/api/minimax` and `/api/brand-kit` skip CSRF checks. Add new public routes to the skip list in `csrf.ts`.
15. **Content filtering before MiniMax calls** - Always run `filterPrompt()` before sending user input to MiniMax APIs to prevent injection attacks.
16. **Check user consent before AI calls** - Use `checkUserConsent(userId)` before calling MiniMax APIs. Return 403 with consent required if not consented.
17. **Quota checking before expensive operations** - Use `checkQuota(userId)` before video generation or other expensive AI operations. Record usage with `recordApiUsage()` after completion.
18. **Audit logging for security events** - Log security-relevant events using `logSecurityEvent()` for compliance and monitoring.
19. **API error handling consistency** - Use `handleApiError()` for all API routes to ensure consistent error responses with request IDs.
20. **Validation with Zod schemas** - Use schemas from `validation-schemas.ts` to validate request bodies before processing.
21. **Request ID for tracing** - Generate request IDs with `generateRequestId()` and include in logs and error responses for debugging.
22. **Retry with backoff for external APIs** - Use `retryWithBackoff()` with `miniMaxRetryOptions` for MiniMax API calls to handle transient failures.
23. **JSON validation for database fields** - Use `parseJSONSafely()` and `stringifyJSONSafely()` when working with JSON TEXT fields in SQLite.
24. **PII detection in user content** - Use `detectPII()` to identify potentially sensitive information before processing or storing.
25. **Schema validation for API responses** - Use `validateResponse()` to validate MiniMax API responses match expected structure.
26. **Logger persistence fallback** - If database is not available, logger falls back to in-memory storage. Logs are lost on server restart in this case.

---

## Testing

```bash
npm run test          # Run tests
npm run test:ui       # Run tests with UI
npm run test:coverage # Run with coverage
```

**Test Files:**
- `src/hooks/use-video-poll.test.ts` - Video polling hook tests
- `src/lib/db-queries.test.ts` - Database query function tests
- `src/lib/utils.test.ts` - Utility function tests

---

## Linting & Building

```bash
npm run lint  # ESLint (0 errors expected)
npm run build # Next.js production build
```

**Current lint status**: 0 errors, 2 pre-existing warnings (`_sceneId` in `use-video-poll.ts:60`, `_content_type` in `db-queries.ts:342`)

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MINIMAX_API_KEY` | MiniMax API key (required) |
| `DATABASE_URL` | SQLite database path (optional, defaults to `./data/video-gen.db`) |

---
