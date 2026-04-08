# Foundess Content Engine

Internal content multiplier. Turns a prompt into 3 on-brand X posts or 3 Instagram (4:5) HTML/CSS designs.

## Setup

```bash
npm install
export ANTHROPIC_API_KEY= 
npm run dev
```


## How it works

- `branding/brand.json` is the single source of truth for color palette, typography, voice, X generation rules, and Instagram caption rules.
- `app/api/generate` calls Claude with the brand JSON embedded in the system prompt and returns 3 variations.
- For X, web search is enabled so posts can reference what is *actually* happening right now.
- For Instagram, Claude returns a caption + 3 complete self-contained HTML documents at 1080×1350 (4:5).
- `app/api/edit` re-asks Claude to update ONLY one variation based on a free-text instruction (and optional highlighted text for X).

## Flow

1. Pick platform (`1` = Instagram, `2` = X).
2. Prompt or hit *surprise me*.
3. (IG only) Upload images.
4. (IG only) Slide count.
5. Review 3 variations, copy / download / inline-edit.

`Enter` advances steps. `Backspace` goes back.

## Brand layer

All outputs are constrained to:
- Palette: `#FFF9E9` `#B9B2FD` `#000000` `#EFFF82`
- Type: Junicode (h1/h3), Times New Roman italic (h2), Chivo (body)
- Aspect ratio: 4:5 for IG

Changing `branding/brand.json` changes the entire system's output.
