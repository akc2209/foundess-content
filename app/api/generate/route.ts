import { NextRequest, NextResponse } from "next/server";
import { getBrand } from "../../lib/brand";
import { askJSON } from "../../lib/claude";
import { rateLimit } from "../../lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const rl = rateLimit(ip);
    if (!rl.ok) return NextResponse.json({ error: rl.reason }, { status: 429 });
    const body = await req.json();
    const { platform, prompt, surprise, slides } = body as {
      platform: "x" | "instagram";
      prompt: string;
      surprise: boolean;
      slides?: number;
    };
    const brand = getBrand();

    if (platform === "x") {
      const system = `You generate X (Twitter) posts for Foundess using this brand voice JSON:
${JSON.stringify(brand.language, null, 2)}

HARD RULES:
- You MUST use web_search to find ACTUAL recent tweets (within the last ~2 weeks) from the listed accounts in brand.language.sources. Search queries like: "from:karpathy", "from:swyx", "from:rauchg", etc. Use the most recent tweets you can find.
- For each variation, pick ONE real tweet from ONE of those accounts as your inspiration. Match that author's voice and topic domain.
- The generated post must NOT copy the inspiration tweet. It must:
  (a) cover the SAME topic (the thing currently being talked about),
  (b) mirror the SAME voice/humor/cadence/structure,
  (c) use substantially DIFFERENT wording — no phrase of 6+ consecutive words may match the source tweet.
- NO hashtags, NO emoji spam, NO LinkedIn motivational voice, NO fake benchmarks or made-up version numbers.
- 3 variations total, each drawing from a DIFFERENT source tweet and ideally a different author.
- For each variation, return the inspiration tweet's URL, author handle, and posted date + time.

Output strictly valid JSON:
{
  "variations": [
    {
      "styleRef": "@handle",
      "text": "the generated post...",
      "inspiration": {
        "url": "https://x.com/handle/status/...",
        "author": "@handle",
        "postedAt": "2026-04-06 14:32 UTC",
        "summary": "one-line description of what the source tweet was about"
      }
    },
    ...
  ]
}

If you truly cannot find a real URL for a given source, set url to "" — do NOT invent a URL, status ID, or timestamp.`;

      const userMsg = surprise
        ? `No user topic — pick 3 of the hottest things being discussed RIGHT NOW on AI / dev tools / startup X-twitter by the listed accounts. Use web_search to find actual recent tweets. Produce 3 distinct variations, each tied to a real source tweet.`
        : `User direction:\n"""${prompt}"""\n\nUse web_search to find recent tweets from the listed accounts that relate to this topic. Produce 3 distinct variations, each tied to a real source tweet (with URL + posted date/time).`;

      const json = await askJSON(system, userMsg, true);
      return NextResponse.json(json);
    }

    // Instagram: generate caption + 3 HTML/CSS slide designs (4:5)
    const system = `You generate Instagram content for Foundess. Brand JSON:
${JSON.stringify(brand, null, 2)}

You must produce:
1. A caption following instagramCaptions rules (warm, community-first, emoji-themed).
2. Three DISTINCT HTML/CSS design variations for the post at 4:5 aspect ratio (1080x1350).

Design constraints (hard):
- Use ONLY the palette: #FFF9E9 (cream bg), #B9B2FD (lavender), #000000 (black), #EFFF82 (lime accent).
- Typography: ALL headers (h1/h2/h3) use Junicode serif. Italicize 1-3 KEY words in each heading for emphasis (using <em> or font-style:italic). Body uses Chivo sans-serif.
- Load Junicode via: <link href="https://fonts.cdnfonts.com/css/junicode" rel="stylesheet"> and Chivo via Google Fonts.
- Heading sizes large (50-120px). Body 18-22px.
- Each design must be a COMPLETE self-contained HTML document with inline <style>.
- Root container: width:1080px; height:1350px; overflow:hidden; (4:5).
- Each of the 3 variations must have a visibly different layout (e.g. centered hero, split, asymmetric grid).
- If the user asks for multiple slides, design slide 1 (the cover) — other slides are future work.
- Embed Google Fonts for Chivo. For Junicode use serif fallback. For "Times New Roman MT Condensed" fall back to Times New Roman.
- Do NOT use external images unless image URLs are provided. Use CSS shapes / typography / color blocks.

Output strictly valid JSON: {"caption":"...","variations":[{"name":"...","html":"<!doctype html>..."},{...},{...}]}`;

    const userMsg = surprise
      ? `Invent a plausible Foundess event (founder meetup / panel / cafe hang in NYC). Generate caption + 3 distinct cover slide designs.`
      : `User request:\n"""${prompt}"""\n\nSlides requested: ${slides || 1}. Generate caption + 3 distinct cover slide HTML designs.`;

    const json = await askJSON(system, userMsg, false);
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
