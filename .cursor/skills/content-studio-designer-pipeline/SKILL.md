---
name: content-studio-designer-pipeline
description: >-
  Explains the Enkrypt visual designer pipeline in this repo: modes (General / Designer / Blog),
  structure → visual brief → image prompt → composited slots; red-decision flow; designer-only
  flags (trns, white bg); mirrored TS/JS prompt builders; Content Studio embed and API routes.
  Use when changing designer image prompts, omitContentTextInImage behavior, LeftPanel generation,
  PreviewPanel layout, generate/image API, designer-app build, or DesignerOverlay embed sync.
  For the full content→brief→image flow, 7-field brief spec, red rules, failure modes, and
  per-brand “Create skill” workflow, use visual-designer-content-flow (Enkrypt canonical base).
---

# Content Studio — Visual designer pipeline

**Deep-dive (Enkrypt canonical + per-brand skill authoring):** see **`visual-designer-content-flow`** in `.cursor/skills/visual-designer-content-flow/SKILL.md`. The old **`designer-content-flow`** name redirects there.

## Repo map (two implementations — keep in sync)

| Role | Location |
|------|----------|
| Standalone designer (Vite) | `content-studio/designer-app/src/app/` — `App.tsx`, `LeftPanel.tsx`, `PreviewPanel.tsx`, `RightPanel.tsx`, `utils/imagePromptBuilder.ts` |
| Next.js mirror (API + orchestration) | `content-studio/lib/designer-image/` — `imagePromptBuilder.js`, `buildDesignerOpenAiPrompt.js`, `themes.js`, etc. |
| Image API route | `content-studio/app/api/generate/image/route.js` — calls `buildDesignerOpenAiImagePrompt`, default `omitContentTextInImage: true` for designer path |
| Content Studio overlay | `content-studio/components/DesignerOverlay.js` — `primeDesignerEmbed()`, iframe; optional `ce-designer-embed-visual` postMessage to swap bitmap without reload |
| Embed consumer | `content-studio/designer-app/src/app/App.tsx` — reads session keys, posts `ce-designer-embed-settings`; listens for `ce-designer-embed-visual` |

**Rule:** When editing prompt strings or brief format, update **both** `imagePromptBuilder.ts` and `imagePromptBuilder.js` (and `LeftPanel.tsx` / `buildDesignerOpenAiPrompt.js` where the final `imgPrompt` diverges).

---

## Modes: General, Designer, Blog

| Mode | How it’s represented | Pipeline |
|------|----------------------|----------|
| **General** | `headerMode === "general"`, `settings.mode === "general"` | Base canvas behavior |
| **Designer** | `headerMode === "designer"`; **LeftPanel still receives `mode: "general"`** (not `"blog"`). Designer is distinguished by **`headerMode`**, not `settings.mode`. | Same structure / visual brief / `generateSingleVisual` path as the shared designer image flow |
| **Blog** | `settings.mode === "blog"` | Shared image function; **blog batch and blog edit branches differ** — see `Blog` branches in `LeftPanel.tsx` |

---

## Designer-only settings (do not assume General/Blog)

| Setting | Role |
|---------|------|
| `postSizeId === "1080x1080-trns"` | **1:1 trns:** same pixels as 1:1; alternate preview background (`PreviewPanel` + asset). **Cleared** when switching header to General or Blog (`App.tsx` `handleSetMode`). |
| `designerWhiteBg` | When **on** and **`headerMode === "designer"`**, generation appends mandatory full-bleed **`#FFFFFF`** clause (overrides usual single light wash / one-bg wording). **Blog** may call `generateSingleVisual` but **must not** get this clause unless product explicitly changes gating — gate on **`headerMode`**. Cleared when leaving Designer. |
| `visualImageBorderRadius` | Corner radius (px at export resolution) for composited visual in slot (`PreviewPanel` clip + outline). Lives in RightPanel layout; not designer-exclusive but affects the same preview. |

**Primary files:** `designer-app/.../App.tsx`, `LeftPanel.tsx`, `PreviewPanel.tsx`, `RightPanel.tsx`.

---

## Architecture (four stages)

| Stage | Where | Input → output |
|-------|--------|----------------|
| **1. Content** | Content/Structure API (studio + `generateDesignerStructure` client) | Raw text → `{ heading, subheading, footer }` JSON |
| **2. Visual brief** | `buildVisualBrief()` in `imagePromptBuilder` | Pasted/raw content + structured JSON → **7-field** brief |
| **3. Image** | Image generation API / `generateSingleVisual` | Brief + theme + layout constraints → **background/supporting bitmap** |
| **4. Slots** | Layout + `PreviewPanel` | H/S/F in **text slots** composited **over** the image |

### Key principle

**Heading, subheading, and footer are not primary copy inside the bitmap.** They are shown in separate text layers. The image supports topic and mood via the brief — **not** by painting the title lines. In this repo, `omitContentTextInImage: true` (designer default) must be reflected in `buildContentAndVisualBlock`: **do not inject literal H/S/F strings into the image prompt** (they were copied by the image model). Semantic context still reaches the art-director step via raw content in `buildVisualBrief`.

---

## Stage 1 — Structured content

- Output: `heading`, `subheading`, `footer` for overlay slots and brief extraction fields.

---

## Stage 2 — Visual brief (`imagePromptBuilder`)

### Functions

- **`buildVisualBrief(rawContent, content, apiKey, provider)`** — LLM with structured analysis prompt; returns 7-field brief.
- **`getFallbackVisualBrief(content)`** — if no raw content or API fails; uses **`detectRedSignal()`** on combined H/S/F text.
- **`buildContentAndVisualBlock(content, visualBrief, omitContentTextInImage)`** — builds block for final image prompt; extracts **`RED DECISION`** into **⚑ RED COLOR INSTRUCTION** line above the full brief.

### LLM settings

- `temperature: 0.75`, `max_tokens` / `maxOutputTokens: ~700`, user content truncated (~3000 chars) in prompt.

### Required 7 fields (order)

1. `VISUAL TYPE:`  
2. `RED DECISION:`  
3. `COMPOSITION:`  
4. `SUBJECT:`  
5. `STYLE:`  
6. `PALETTE:`  
7. `SUPPORTING TEXT:`  

**SUPPORTING TEXT** must not echo H/S/F as hero title copy (see prompt text in file — extracted fields are for context only).

### Red pipeline

1. **`THREAT_SIGNALS`** in `imagePromptBuilder` is the source of truth for fallback detection; extend the array for missed phrasing.
2. LLM prompt forces explicit **ACTIVE** (name elements) vs **INACTIVE** (no red anywhere).
3. Regex: `/RED DECISION:\s*(.+?)(?:\n|$)/i` — line must be well-formed or extraction fails.
4. **`brandColorRules`** in `LeftPanel` / mirrored prompt text: read ⚑ line + `RED DECISION`; ACTIVE = red **only** on named elements; INACTIVE = **no** red (including borders/frames/glow).

---

## Stage 3 — Final image prompt

Assembled in **`generateSingleVisual`** (`LeftPanel.tsx`) and **`buildDesignerOpenAiImagePrompt`** (`buildDesignerOpenAiPrompt.js`).

### Structure

1. Role sentence  
2. `templateCtx` (theme tone — not layout clone)  
3. `brandColorRules` (red rules)  
4. `--- CONTENT & VISUAL DIRECTION ---` + `contentAndVisualBlock` (⚑ + brief)  
5. `---`  
6. `layoutCtx`, `visualSlotSizeCtx`  
7. **REQUIREMENTS:** one-background rule, no thick border, curved corners, no logo, palette, aspect ratio; **Designer + omit:** explicit **no primary post copy in-paint**  
8. **`designerWhiteBgClause`** / **`designerTrnsClause`** when applicable (designer header + flags)

### VISUAL TYPE / STYLE / PALETTE creativity

Use the tables from the legacy skill as **intent guides** when editing briefs or reviewing output quality: `diagram-illustration`, `editorial-illustration`, `dark-technical`, accents (teal `#06B6D4`, violet `#7C3AED`, amber `#F59E0B`), dark BGs for security, etc.

---

## Stage 4 — Text slot height

Slots should **hug** text: `ascent + measureWrappedHeight` with same font/line-height as draw pass; **no** extra bottom padding hacks (`+ fontSize * 0.6`, arbitrary minimums).

---

## Content Studio–specific

- **Orchestrator** `generateImage` → API route with `designerOptions` (`postSizeId`, `designerWhiteBg`, `themeId`, `extractedContent`, `omitContentTextInImage`, etc.).
- **Embed:** `primeDesignerEmbed(imageUrl, content, layout)` writes `sessionStorage` keys before iframe load; designer reads once on boot.
- **Visual swap in overlay:** parent may send **`ce-designer-embed-visual`** with `{ imageUrl, designerContent? }`; `App.tsx` patches `visualImage` / `variations` / optional `content`.

---

## When NOT to use this skill

- Raw image API transport only (no prompt/brief changes)
- Unrelated app chrome
- Schema changes outside H/S/F for this pipeline
- Fabric/SVG studio canvas editor (different skill)
- Generic React/Next work with no designer pipeline tie-in

---

## Quick failure-mode index

| Symptom | Check |
|---------|--------|
| Title text in bitmap | `omitContentTextInImage`; `buildContentAndVisualBlock` omit branch must not paste H/S/F; brief SUPPORTING TEXT echoing headline |
| Red missing / wrong | `THREAT_SIGNALS`; `RED DECISION` line format; ⚑ extraction; brief element naming |
| Two backgrounds / card on gradient | REQUIREMENTS one-bg + brief SUPPORTING TEXT |
| White bg still tinted | `designerWhiteBgClause` strength; `headerMode === "designer"` gating |
| Generic/stock output | VISUAL TYPE / COMPOSITION “creative surprise” / PALETTE third accent |
| Slots too tall | Remove extra padding in height calculation |
