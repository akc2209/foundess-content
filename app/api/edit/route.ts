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
    const { platform, current, selection, instruction } = body as {
      platform: "x" | "instagram";
      current: string; // full text or full HTML
      selection?: string; // highlighted substring (optional)
      instruction: string;
    };
    const brand = getBrand();

    if (platform === "x") {
      const system = `You edit ONE X post variation for Foundess. Voice rules:
${JSON.stringify(brand.language.voice, null, 2)}
Return JSON: {"text":"..."} — the full updated post, preserving brand voice.`;
      const userMsg = `Current post:\n"""${current}"""\n\n${
        selection ? `User highlighted this fragment: """${selection}"""\n` : ""
      }User instruction: ${instruction}\n\nReturn the edited full post.`;
      const json = await askJSON(system, userMsg, false);
      return NextResponse.json(json);
    }

    const system = `You edit ONE Instagram slide design (HTML/CSS) for Foundess.
Constraints:
- Keep the 1080x1350 (4:5) root container.
- Only use palette #FFF9E9, #B9B2FD, #000000, #EFFF82.
- Keep typography system (Junicode / Times / Chivo).
- Only change what the user asks for. Preserve the rest.
Return JSON: {"html":"<!doctype html>..."}`;
    const userMsg = `Current HTML:\n${current}\n\nUser instruction: ${instruction}\n\nReturn the updated full HTML document.`;
    const json = await askJSON(system, userMsg, false);
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
