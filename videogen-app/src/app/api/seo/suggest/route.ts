import { NextRequest, NextResponse } from "next/server";
import { MINIMAX_TIMEOUT_MS } from "@/lib/config";
import { guardBodySize } from "@/lib/body-size-guard";
import { handleApiError, createValidationErrorResponse, createConfigErrorResponse } from "@/lib/api-error-handler";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const endpoint = "/api/seo/suggest";
  const method = "POST";

  const sizeGuard = guardBodySize(req);
  if (sizeGuard) return sizeGuard;

  try {
    const body = await req.json();
    const { topic = "", platform = "", tone_of_voice = "Professional" } = body;

    if (!topic || typeof topic !== "string") {
      return createValidationErrorResponse("topic is required", "topic", { endpoint, method, startTime });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return createConfigErrorResponse("Missing MiniMax API key", { endpoint, method, startTime });
    }

    const isInstagram = platform.toLowerCase().includes("instagram");
    const isLinkedIn = platform.toLowerCase().includes("linkedin");
    const isHashtagOnly = platform.toLowerCase().includes("hashtags");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MINIMAX_TIMEOUT_MS);

    const systemPrompt = isInstagram
      ? `You are an Instagram marketing expert. Generate optimized content for Instagram ${isHashtagOnly ? "hashtags" : "captions and metadata"}.`
      : isLinkedIn
      ? "You are a LinkedIn content strategist specializing in thought leadership and professional brand building."
      : "You are a YouTube SEO expert. Generate SEO optimization data for this video.";

    const userPrompt = isInstagram && isHashtagOnly
      ? `Generate 10-15 relevant Instagram hashtags for this content.

Topic: ${topic}

Return ONLY a valid JSON object:
{ "hashtags": ["#hashtag1", "#hashtag2", ...] }

Rules:
- Mix of broad (3-5M+ posts), niche (100K-1M posts), and micro hashtags
- Include 1-2 branded hashtags if appropriate
- No more than 30 characters per hashtag
- No spaces or special characters except underscore and numbers`
      : isInstagram
      ? `Generate Instagram content optimization for this topic.

Topic: ${topic}
Tone: ${tone_of_voice}

Return ONLY a valid JSON object:
{
  "caption": "A compelling Instagram caption with hook, value proposition, and CTA",
  "hashtags": "#tag1 #tag2 #tag3 (10-20 relevant hashtags)",
  "reel_title": "Short catchy title for Reel (max 100 chars)",
  "reel_description": "Description for Reel search",
  "cover_image_prompt": "Description for cover image generation"
}`
      : isLinkedIn && isHashtagOnly
      ? `Generate 5-10 relevant LinkedIn hashtags for this content.

Topic: ${topic}

Return ONLY a valid JSON object:
{ "hashtags": ["#hashtag1", "#hashtag2", ...] }

Rules:
- Mix of broad (1-2: #LinkedIn #Business) and niche (2-3: #TechRecruiting #B2BSales)
- Use industry-specific hashtags where relevant
- No generic hashtags like #love #happy
- Maximum 5 hashtags for LinkedIn`
      : isLinkedIn
      ? `Generate LinkedIn content optimization for this topic.

Topic: ${topic}
Tone: ${tone_of_voice}

Return ONLY a valid JSON object:
{
  "caption": "A compelling LinkedIn post with strong opening hook, value delivery, and engagement CTA",
  "hashtags": "#tag1 #tag2 #tag3 (3-5 specific hashtags)"
}

Rules:
- Hook must stop the scroll in the first line
- Include a question or CTA that drives comments
- No external links in the caption body
- Professional but human tone
- 150-300 words optimal for engagement`
      : `You are a YouTube SEO expert. Generate SEO optimization data for this video.

Topic: ${topic}
Platform: ${platform}
Tone: ${tone_of_voice}

Return ONLY a valid JSON object with this exact structure:
{
  "title_variants": ["curiosity hook title (max 60 chars)", "direct search title (max 60 chars)", "benefit-driven title (max 60 chars)"],
  "description_template": "A compelling description template with [KEYWORD] placeholders, timestamps section, and hashtag suggestions",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "chapters": [{ "title": "Chapter title", "start": 0 }, ...],
  "thumbnail_text": "SHORT Punchy Headline"
}

Rules:
- Titles must be 50-60 chars, no clickbait, no ALL CAPS
- Description should be 2000+ chars with clear structure
- Include 5 relevant tags mixing broad and niche
- Include 3-8 chapters based on the content
- Thumbnail text must be 3-5 words, readable on mobile at 3 inches`;

    const response = await fetch("https://api.minimaxi.com/v1/text/chatcompletion_pro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "MiniMax-M2.7",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: isHashtagOnly ? 400 : 1200,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: `MiniMax API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || data.choices?.[0]?.message?.content || "";

    if (!text) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
    }

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    return handleApiError(error, { endpoint, method, startTime });
  }
}
