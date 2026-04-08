import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

export async function askJSON(system: string, user: string, useWebSearch = false): Promise<any> {
  const tools: any[] = useWebSearch
    ? [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }]
    : [];
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    tools,
    messages: [{ role: "user", content: user }]
  });
  const text = res.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const raw = match ? match[1] || match[0] : text;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Claude did not return valid JSON. Raw: " + text.slice(0, 500));
  }
}
