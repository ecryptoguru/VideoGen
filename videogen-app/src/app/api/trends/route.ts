import { NextRequest, NextResponse } from "next/server";
import db from "@/data/db";
import { TrendItem, TrendPlatform } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") as TrendPlatform | null;
  const category = searchParams.get("category");
  const refresh = searchParams.get("refresh") === "true";
  const origin = req.nextUrl.origin;

  try {
    if (refresh) {
      return NextResponse.json(await fetchTrendsFromAI(origin, platform, category));
    }

    const expiry = new Date();
    expiry.setHours(expiry.getHours() - 1);
    db.prepare(
      "DELETE FROM trend_cache WHERE expires_at IS NOT NULL AND expires_at < ?"
    ).run(expiry.toISOString());

    let query = "SELECT * FROM trend_cache WHERE 1=1";
    const params: (string | null)[] = [];

    if (platform) {
      query += " AND platform = ?";
      params.push(platform);
    }
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    query += " ORDER BY velocity_score DESC, volume_score DESC LIMIT 50";

    const rows = db.prepare(query).all(...params) as TrendItem[];

    if (rows.length === 0) {
      return NextResponse.json(await fetchTrendsFromAI(origin, platform, category));
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Trends fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
  }
}

async function fetchTrendsFromAI(origin: string, platform: TrendPlatform | null, category: string | null) {
  const platforms = platform ? [platform] : ["instagram", "linkedin", "youtube"];
  const categories = category ? [category] : ["hashtag", "topic", "format", "caption_style"];

  const insertStmt = db.prepare(`
    INSERT INTO trend_cache (platform, category, trend_text, trend_type, volume_score, velocity_score, hashtag, description, example_posts, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 2);

  const allTrends: TrendItem[] = [];

  for (const plat of platforms) {
    for (const cat of categories) {
      try {
        const prompt = buildTrendPrompt(plat as TrendPlatform, cat);

        const res = await fetch(`${origin}/api/minimax/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const text = data.content?.[0]?.text || data.choices?.[0]?.message?.content || "";

        let parsed: { trends?: Array<{ text: string; score: number; type?: string; hashtag?: string; description?: string; examples?: string[] }> };
        try {
          parsed = JSON.parse(text);
        } catch {
          continue;
        }

        if (parsed.trends && Array.isArray(parsed.trends)) {
          for (const t of parsed.trends) {
            const insertResult = insertStmt.run(
              plat,
              cat,
              t.text,
              cat,
              Math.round(t.score * 1000),
              Math.round(t.score * 80),
              t.hashtag || (t.text.startsWith("#") ? t.text : null),
              t.description || null,
              t.examples?.join("|") || null,
              expiry.toISOString()
            );

            const trend: TrendItem = {
              id: insertResult.lastInsertRowid as number,
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
            allTrends.push(trend);
          }
        }
      } catch {
        continue;
      }
    }
  }

  return allTrends;
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