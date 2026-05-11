import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateText } from "@/lib/minimax-text";
import { TrendItem, TrendPlatform } from "@/types";

export const dynamic = "force-dynamic";

type TrendCacheModel = {
  id: number;
  platform: string;
  category: string;
  trendText: string;
  trendType: string;
  volumeScore: number;
  velocityScore: number;
  hashtag: string | null;
  description: string | null;
  examplePosts: string | null;
  postedAt: Date | null;
  fetchedAt: Date;
  expiresAt: Date | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") as TrendPlatform | null;
  const category = searchParams.get("category");
  const refresh = searchParams.get("refresh") === "true";
  try {
    if (refresh) {
      return NextResponse.json(await fetchTrendsFromAI(platform, category));
    }

    const expiry = new Date();
    expiry.setHours(expiry.getHours() - 1);
    
    await prisma.trendCache.deleteMany({
      where: {
        expiresAt: {
          lt: expiry
        }
      }
    });

    const where: { platform?: string; category?: string } = {};
    if (platform) {
      where.platform = platform;
    }
    if (category) {
      where.category = category;
    }

    const rows = await prisma.trendCache.findMany({
      where,
      orderBy: [
        { velocityScore: 'desc' },
        { volumeScore: 'desc' }
      ],
      take: 50
    });
    
    // Convert camelCase to snake_case for API response
    const formattedRows = rows.map((r: TrendCacheModel) => ({
      id: r.id,
      platform: r.platform,
      category: r.category,
      trend_text: r.trendText,
      trend_type: r.trendType,
      volume_score: r.volumeScore,
      velocity_score: r.velocityScore,
      hashtag: r.hashtag,
      description: r.description,
      example_posts: r.examplePosts,
      posted_at: r.postedAt?.toISOString(),
      fetched_at: r.fetchedAt.toISOString(),
      expires_at: r.expiresAt?.toISOString(),
    })) as TrendItem[];

    if (formattedRows.length === 0) {
      return NextResponse.json(await fetchTrendsFromAI(platform, category));
    }

    return NextResponse.json(formattedRows);
  } catch (err) {
    console.error("Trends fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
  }
}

async function fetchTrendsFromAI(platform: TrendPlatform | null, category: string | null) {
  const platforms = platform ? [platform] : ["instagram", "linkedin", "youtube"];
  const categories = category ? [category] : ["hashtag", "topic", "format", "caption_style"];

  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 2);

  const allTrends: TrendItem[] = [];

  for (const plat of platforms) {
    for (const cat of categories) {
      try {
        const prompt = buildTrendPrompt(plat as TrendPlatform, cat);

        const { data } = await generateText({
          messages: [
            { role: "user", content: prompt },
          ],
        });

        const text = extractTextFromResponse(data);
        const parsed = parseTrendJson(text);

        if (parsed?.trends && Array.isArray(parsed.trends)) {
          for (const t of parsed.trends) {
            const trend = await prisma.trendCache.create({
              data: {
                platform: plat,
                category: cat,
                trendText: t.text,
                trendType: cat,
                volumeScore: Math.round(t.score * 1000),
                velocityScore: Math.round(t.score * 80),
                hashtag: t.hashtag || (t.text.startsWith("#") ? t.text : null),
                description: t.description || null,
                examplePosts: t.examples?.join("|") || null,
                expiresAt: expiry,
              }
            });

            const formattedTrend: TrendItem = {
              id: trend.id,
              platform: plat as TrendPlatform,
              category: cat,
              trend_text: t.text,
              trend_type: cat as TrendItem["trend_type"],
              volume_score: Math.round(t.score * 1000),
              velocity_score: Math.round(t.score * 80),
              hashtag: t.hashtag || (t.text.startsWith("#") ? t.text : undefined),
              description: t.description || undefined,
              example_posts: t.examples?.join("|") || undefined,
              expires_at: expiry.toISOString(),
            };
            allTrends.push(formattedTrend);
          }
        }
      } catch {
        continue;
      }
    }
  }

  return allTrends;
}

function extractTextFromResponse(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;

  // Anthropic-compatible format
  if (Array.isArray(d.content)) {
    const first = d.content[0] as Record<string, unknown> | undefined;
    if (first?.type === "text" && typeof first.text === "string") {
      return first.text;
    }
  }

  // OpenAI-compatible format
  if (Array.isArray(d.choices) && d.choices.length > 0) {
    const choice = d.choices[0] as Record<string, unknown>;
    const msg = choice?.message as Record<string, unknown> | undefined;
    if (msg && typeof msg.content === "string") {
      return msg.content;
    }
  }

  // Raw string
  if (typeof d.content === "string") {
    return d.content;
  }

  return "";
}

function parseTrendJson(text: string): { trends?: Array<{ text: string; score: number; hashtag?: string; description?: string; examples?: string[] }> } | null {
  if (!text) return null;

  // Strip markdown fences
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt regex extraction of JSON object/array
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildTrendPrompt(platform: TrendPlatform, category: string): string {
  const platformContext = {
    instagram: "Instagram Reels",
    linkedin: "LinkedIn posts",
    youtube: "YouTube Shorts",
  }[platform];

  const categoryPrompts = {
    hashtag: `Identify the top 10 trending and emerging hashtags for ${platformContext} content creators in 2025. Focus on hashtags with high discovery potential and engagement. Return JSON with "trends" array containing objects with: "text" (hashtag with #), "score" (0-10 viral potential), "description" (why it's trending), "examples" (2-3 example posts or content types using this hashtag).`,
    topic: `Identify the top 10 trending topics and content themes currently performing well on ${platformContext} in 2025. Focus on emerging trends, viral formats, and underserved niches. Return JSON with "trends" array containing: "text" (topic name), "score" (0-10 trend strength), "description" (why it's trending now), "examples" (2-3 example content angles).`,
    format: `Identify the top 10 trending video formats and content structures for ${platformContext} in 2025. Focus on hook patterns, storytelling approaches, and engagement-driving structures. Return JSON with "trends" array containing: "text" (format name), "score" (0-10 trend strength), "description" (why this format works), "examples" (2-3 example videos or hooks).`,
    caption_style: `Identify the top 10 trending caption and hook writing styles for ${platformContext} in 2025. Focus on opening lines, CTA styles, and engagement-driving text patterns. Return JSON with "trends" array containing: "text" (style name or example hook), "score" (0-10 engagement potential), "description" (why this style works), "examples" (2-3 caption examples).`,
  };

  return `${categoryPrompts[category as keyof typeof categoryPrompts] || categoryPrompts.topic}

Return ONLY a JSON object with this exact structure:
{
  "trends": [
    { "text": "string", "score": 0-10, "description": "string", "examples": ["string", "string"] },
    ...
  ]
}

Score guidelines:
- 9-10: Viral, explosive growth
- 7-8: Strong upward trend
- 5-6: Steady and growing
- 3-4: Emerging signal
- 1-2: Early stage, experimental`;
}