---
name: visual-designer-content-flow
description: >
  Governs the Enkrypt Visual Designer pipeline: paste-to-preview flow, content API (heading/subheading/footer extraction),
  visual brief construction, and image generation prompting — for **General, Designer (header tab), and Blog** where they share code.
  Use this skill whenever modifying ANY of the following: content generation logic, image generation prompts or constraints,
  the visual brief / imagePromptBuilder.ts, slot layout or text slot height, background rules ("one bg" enforcement),
  brand color application in images, or the paste-to-preview rendering pipeline. Also apply when debugging image output issues
  (wrong background, red accents on non-threat content, missing red on threat content, double-layer cards, transparent fills,
  oversized slots, generic/bland/safe visuals, missed illustration opportunities). For **Designer-only** UI and settings
  (`postSizeId` trns preview, `designerWhiteBg` prompt clause), see the **Designer tab** subsection below.
---

# Visual Designer: Content + Image Flow

**Enkrypt AI** is the reference brand for defaults (gradients, `#D92D20` red rules). Custom brands layer palette/tone via Brand Editor + `studioBrandBridge`; the **four-stage architecture** and **RED DECISION** mechanics stay the same unless product changes them.

**Repo map:** File paths, TS/JS mirroring, embed session keys — see **`content-studio-designer-pipeline`**.

---

## Modes: General, Designer, Blog

| Header / panel | How it’s represented | Same pipeline as General? |
|----------------|----------------------|---------------------------|
| **General** | `headerMode === "general"`, `settings.mode === "general"` | — |
| **Designer** | `headerMode === "designer"`; **LeftPanel still receives `mode: "general"`** (not `"blog"`) | **Yes** — structure, visual brief, and `generateSingleVisual` are shared. Designer is distinguished by **`headerMode`**, not `settings.mode`. |
| **Blog** | `settings.mode === "blog"` | Shared image function, but **blog batch** and **blog edit** paths differ; see Blog branches in `LeftPanel.tsx`. |

### Designer-only (do not assume General/Blog)

| Setting | Role |
|---------|------|
| `postSizeId === "1080x1080-trns"` | Designer Post size “1:1 trns”: same pixels as 1:1, alternate preview background (`PreviewPanel` + asset). **Cleared** when switching header to General or Blog (`App.tsx` `handleSetMode`). |
| `designerWhiteBg` | When **on** and **`headerMode === "designer"`**, `generateSingleVisual` appends a mandatory full-bleed **`#FFFFFF`** clause that overrides the usual single light wash / one-bg wording for that generation. **Blog** uses the same function but **must not** receive this clause (**gated on `headerMode`**). Cleared when leaving Designer. |
| `visualImageBorderRadius` | Corner radius (px at export resolution) for the composited visual in the slot (`PreviewPanel` clip + outline). Lives in RightPanel Layout; not Designer-exclusive but affects the same preview Designer uses. |

**Files:** `App.tsx` (settings + tab switches), `LeftPanel.tsx` (prompts, Designer toggles, post size grid), `PreviewPanel.tsx` (background + visual clip), `RightPanel.tsx` (layout sliders).

---

## Architecture overview

| Stage | File / API | Input → Output |
|-------|------------|----------------|
| **1. Content** | Content/Structure API | Raw pasted text → `heading`, `subheading`, `footer` (JSON) |
| **2. Visual Brief** | `imagePromptBuilder.ts` → `buildVisualBrief()` | Pasted text + content JSON → structured **7-field** visual brief |
| **3. Image** | OpenAI **Images** API (`images.generations` / `images.edits`) or **Gemini** image modality | Structured brief + theme + constraints → single background bitmap |
| **4. Slots** | Layout / `PreviewPanel` | `heading`, `subheading`, `footer` → text slots composited **over** image |

**Primary implementation files**

- `content-studio/designer-app/src/app/utils/imagePromptBuilder.ts`
- `content-studio/lib/designer-image/imagePromptBuilder.js` (**mirror — keep in sync**)
- `content-studio/designer-app/src/app/components/LeftPanel.tsx` — `generateSingleVisual`, `brandColorRules`, Designer gates
- `content-studio/lib/designer-image/buildDesignerOpenAiPrompt.js` — server-side `imgPrompt` assembly
- `content-studio/app/api/generate/image/route.js` — workspace thumbnails + designer pipeline

**Key principle:** Heading, subheading, and footer are **not** primary copy inside the bitmap when `omitContentTextInImage` is true (designer default). They live in separate text slots. The image supports **topic and mood** via the brief.

---

## Stage 1 — Content API (paste → structured fields)

**Input:** Raw pasted text (+ optional custom instructions / source image).  
**Output:** JSON `{ heading, subheading, footer }`.  

These three fields are shown in **separate text slots** overlaid on the image.

---

## Stage 2 — Visual brief (`imagePromptBuilder`)

**Paths:** `content-studio/designer-app/src/app/utils/imagePromptBuilder.ts` (designer iframe) and `content-studio/lib/designer-image/imagePromptBuilder.js` (Next.js / `buildDesignerOpenAiImagePrompt`).

### How it works

1. **`buildVisualBrief(rawContent, content, apiKey, provider, anthropicKeyForBrief?)`** — LLM produces the 7-field brief. The user prompt starts with an **ENGINE CONTRACT** line naming this skill (`visual-designer-content-flow`): brief output is merged into the final image prompt; a **separate** model renders pixels.
2. **`getFallbackVisualBrief(content)`** — no raw content or API failure; uses **`detectRedSignal()`** on H/S/F.
3. **`buildContentAndVisualBlock(content, visualBrief, omitContentTextInImage)`** — wraps the brief; extracts **`RED DECISION`** into **`⚑ RED COLOR INSTRUCTION`**.

### Which LLM writes the brief? (Claude vs OpenAI chat vs Gemini)

| Context | Brief step | Image step |
|---------|------------|------------|
| **Designer iframe** + **Anthropic key** set (`anthropicKeyForBrief` from Content Studio embed session **`ce_designer_embed_anthropic_key`**, or `enkrypt-anthropic-key` in standalone designer, or `primeDesignerEmbed(..., anthropicKey)`) | **Claude** — `POST https://api.anthropic.com/v1/messages`, model `ENKRYPT_ANTHROPIC_CHAT_MODEL` (e.g. Sonnet 4, aligned with `llmConstants.js`) | Still **OpenAI GPT Image** or **Gemini** per **`provider`** + image API key |
| **Designer iframe** without Anthropic key | **OpenAI** `v1/chat/completions` (`ENKRYPT_OPENAI_CHAT_MODEL`) or **Gemini** `generateContent` | Same |
| **`POST /api/generate/image`** (Content Studio) | **`claude`** if `x-anthropic-key` / env; else **`openai`** or **`gemini`** per `imageProvider` | OpenAI Images or Gemini per body |

Pixels are **never** from Claude; Claude is only the **art-director / brief** step when configured.

### LLM call settings (brief)

- `temperature: 0.75` — creative but grounded  
- `max_tokens` / `maxOutputTokens: ~700`  
- User content truncated at **~3000** chars in the brief prompt  

### The structured brief format (7 required fields)

Every brief — LLM or fallback — uses these fields in order:

```
VISUAL TYPE: [one of 7 types — see below]
RED DECISION: [ACTIVE — apply red #D92D20 to: {exact element names} | INACTIVE — do NOT use red anywhere]
COMPOSITION: [focal point] + [zone layout %] + [depth layers] + [creative surprise]
SUBJECT: [concrete domain artefacts — no category words]
STYLE: [one style committed fully]
PALETTE: [all slots: background, primary, secondary, optional third, neutrals, text, red scope, green scope]
SUPPORTING TEXT: [specific labels, stats, badges, code fragments, annotations to include]
```

**Why structured fields matter:** The image model receives discrete instructions. **`RED DECISION`** is extracted and surfaced as **`⚑ RED COLOR INSTRUCTION`** so the image model sees it early.

---

## Red color — how it works

### Step 1: `detectRedSignal()` scans content

**`THREAT_SIGNALS`** in `imagePromptBuilder.ts` / `.js` is the source of truth:

```ts
const THREAT_SIGNALS = [
  "attack", "threat", "adversarial", "jailbreak", "prompt injection", "exploit",
  "breach", "vulnerability", "cve", "red team", "red teaming", "malicious", "bypass",
  "evasion", "data poisoning", "poisoning", "backdoor", "compromise", "intrusion",
  "exfiltration", "risk", "danger", "critical", "severe", "high severity", "unsafe",
  "failure mode", "incident", "data leak", "non-compliant", "policy violation",
  "flagged", "blocked", "denied", "attack vector", "zero-day", "ransomware",
];
```

### Step 2 — `buildVisualBrief` LLM prompt forces an explicit decision

The LLM is instructed to:

1. Run the signal scan **first**, before creative decisions.  
2. Output **`RED DECISION: ACTIVE — apply red #D92D20 to: {exact named element}`** or **`RED DECISION: INACTIVE — do NOT use red anywhere`**.  
3. For **ACTIVE**: name specific elements (e.g. “the attack node in the network diagram, the terminal line showing the malicious prompt”).

### Step 3 — `buildContentAndVisualBlock` extracts and surfaces the decision

```ts
const match = visualBrief.match(/RED DECISION:\s*(.+?)(?:\n|$)/i);
if (match) {
  redInstruction = `\n⚑ RED COLOR INSTRUCTION (mandatory — override any defaults): ${match[1].trim()}\n`;
}
```

The **⚑** line appears at the top of the content block — before the full brief — so the image model reads it early.

### Step 4 — `brandColorRules` in `LeftPanel.tsx` references the decision

Static brand color rules tell the image model: read **⚑ RED COLOR INSTRUCTION** and **RED DECISION**. If **ACTIVE**, apply red to **only** the named element. If **INACTIVE**, do **not** use red anywhere — not as border, frame, accent, glow, or emphasis.

### Red element targeting (when ACTIVE)

| Content element | How to target in brief |
|-----------------|-------------------------|
| Attack node in network diagram | "red fill + soft red glow on the attack node glyph only" |
| CVE badge | "red background pill with white CVE identifier text" |
| Threat badge / severity label | "red background, white text — 'CRITICAL' or 'HIGH'" |
| Before/after — "before" panel | "red tint overlay (#D92D20 at 15% opacity) on the compromised panel" |
| Danger step in process flow | "red circle for step number, red connector arrow to next step" |
| Cracked / compromised element | "red fracture lines radiating from break point" |
| Intrusion path arrow | "red dashed directional arrow showing attack vector" |
| Terminal line (malicious input) | "red-colored text on the injected line only" |
| Risk score above threshold | "red numeral with red upward arrow" |

---

## Stage 3 — Image generation prompt (`LeftPanel.tsx`)

Final **`imgPrompt`** in **`generateSingleVisual()`**:

```
[role sentence]
[templateCtx — theme color/mood reference]
[brandColorRules — includes red decision reference]
--- CONTENT & VISUAL DIRECTION ---
[contentAndVisualBlock — includes ⚑ RED INSTRUCTION + full 7-field brief]
---
[layoutCtx]
[visualSlotSizeCtx]
REQUIREMENTS:
  [one-background rule]
  [no thick border]
  [curved corners]
  [no logo]
  [palette + aspect ratio]
[optional: designerWhiteBgClause — Designer tab only]
```

### Designer tab — `designerWhiteBgClause`

When **`headerMode === "designer"`** and **`settings.designerWhiteBg === true`**, append **`designerWhiteBgClause`** at the end of `imgPrompt`. It mandates solid **`#FFFFFF`** full-bleed and overrides conflicting one-bg wording. **Do not** attach for Blog/General unless product intent changes; **Blog** stays gated on **`headerMode`**.

**OpenAI image model:** `content-studio/lib/designer-image/openaiImageModelId.js` — default **GPT Image 1.5**; designer iframe reads **`ce_studio_models_v1`** (`imageModel`) when set.

### Dynamic creative direction — what the brief drives

The **7-field brief** is the creative engine.

#### VISUAL TYPE — output character

| Type | Output character |
|------|------------------|
| `diagram-illustration` | Technical precision with illustration polish — not a bare whiteboard diagram |
| `editorial-illustration` | Bold abstract shapes, metaphorical, magazine-cover energy |
| `abstract-illustration` | Pure form and color — no literal subject, mood is the message |
| `icon-diagram` | Icons as spatial heroes — strong layout logic, not decoration |
| `data-visualization` | Data is the subject — numbers, charts, trends |
| `dark-technical` | Near-black BG, glowing nodes, terminal/hacker aesthetic |
| `product-ui` | Partial screen fragments, device frames, UI components |

#### COMPOSITION — zone structure + creative surprise

Examples:

- “Left 60%: neural network diagram. Right 40%: 3 stacked stat callouts. Hero attack node at 3× scale — size conveys severity. Creative surprise: nodes arranged in shape of a shield.”
- “Single enormous KPI numeral occupying 55% of canvas, floating in warm off-white space. Supporting sparkline lower-left, trend arrow pointing up-right.”
- “Diagonal composition — primary element anchored lower-left, energy flows to upper-right. Nothing on the horizontal axis.”

#### STYLE — commit to one

| Style | BG | Character |
|-------|-----|-----------|
| `flat-vector-precise` | Light | Clean edges, exact geometry, no object gradients |
| `dark-editorial` | Near-black `#0D0F14` | Glowing accents, scanline texture, high contrast |
| `bold-color-block` | Any | Bauhaus-level color zones, minimal detail |
| `editorial-illustration` | Light | Painterly-meets-digital, expressive shapes |
| `glassmorphism` | Light | Frosted panels, backdrop blur, layered depth |
| `isometric-precision` | Light | 30° isometric grid, ambient shadow layers |
| `cinematic-duotone` | Dark | Two-color film treatment, uneven bleed |
| `abstract-geometric` | Any | Pure shape and form, extreme scale contrasts |

#### PALETTE — accents beyond brand orange/pink

Permitted accents:

- Electric teal **`#06B6D4`** — AI/ML nodes, data streams, tech-positive elements  
- Violet **`#7C3AED`** — embedding space, AI model visualization  
- Amber **`#F59E0B`** — process highlights, step numbers, warmth  
- Deep navy **`#0A0F1E`** / near-black **`#0D0F14`** / deep teal **`#0F2A2A`** — valid dark backgrounds for security content  

**Note (Designer + white bg):** When `designerWhiteBg` is on, the **outer** background is forced white; **PALETTE** and brief can still drive inner elements (cards, diagrams, accents). Avoid contradicting the white-bg clause in the same prompt without updating the clause text.

---

## Stage 4 — Text slot height

Slot height must **hug** the text with no extra padding.

**Formula:** `slot height = ascent + measureWrappedHeight(text, font, lineHeight)`  
- `ascent` ≈ **0.65–0.75 × font size** (space above baseline for first line)  
- `measureWrappedHeight` uses the **same** font and line height as the drawing pass  

Do **not** add extra bottom padding (no `+ fontSize * 0.6`, no fixed minimum).

---

## Per-brand “Create designer skill” (Content Studio)

When a user saves a brand and exports a skill, generated skills should **extend** this **`visual-designer-content-flow`** base (plus **`content-studio-designer-pipeline`** for paths). Export lives in **`content-studio/lib/brand/generateDesignerBrandSkill.js`** (Brand Editor footer). Suggested folder: `.cursor/skills/<slug>-visual-designer-content-flow/SKILL.md`.

---

## Common failure modes

### Red color failures

| Symptom | Root cause | Fix |
|---------|------------|-----|
| No red on threat/attack content | `THREAT_SIGNALS` doesn’t cover the phrasing | Add phrase to **`THREAT_SIGNALS`** in `imagePromptBuilder` |
| Brief says ACTIVE but image ignores | `buildContentAndVisualBlock` regex failed | Brief format — **RED DECISION** on its own line with no prefix |
| Red spread decoratively | Brief scoped red too loosely | Name the **exact** element: “attack node glyph only — no red elsewhere” |
| Red on non-threat | `detectRedSignal` false positive or LLM misread INACTIVE | Check raw content; if LLM hallucinated ACTIVE, content may be threat-adjacent |
| Red on borders/frames despite INACTIVE | `brandColorRules` not followed | Add “no red anywhere including borders and frames” to **SUPPORTING TEXT** |

### Creativity / quality failures

| Symptom | Root cause | Fix |
|---------|------------|-----|
| Generic stock-art | VISUAL TYPE defaulted to `icon-diagram` for non-diagram content | Use `editorial-illustration` or `abstract-illustration` for concept/strategy |
| Boring flat composition | No creative surprise in COMPOSITION | Add scale contrast (hero 3×), diagonal tension, extreme negative space, off-canvas bleed |
| All elements same weight | No focal point | One hero at 2–3× scale of supporting elements |
| Safe palette, looks AI-generated | Only orange/pink in PALETTE | Third accent (teal, violet, amber); supporting at 60–70% hero saturation |
| PowerPoint slide feel | Too many equal elements, no depth | 3–5 elements max; foreground/midground/background layers |
| Illustration opportunity missed | Defaulted to icons for thought leadership | `editorial-illustration` or `abstract-illustration` for non-technical concept content |
| Dark security washed out | Light palette for `dark-technical` | Deep navy/near-black BG; cool white `#F0F4FF` for labels |

### Background / layout failures

| Symptom | Root cause | Fix |
|---------|------------|-----|
| White card on colored gradient | Model defaulted to 2-layer composition | One-background rule in REQUIREMENTS; add “NO floating cards or panels” to SUPPORTING TEXT |
| Transparent / missing bg | “Transparent” in prompt | Use “single flat fill at 20–30% opacity” language |
| Everything crammed | No breathing room | “Generous padding, nothing touches edges” in COMPOSITION |

### Style / rendering failures

| Symptom | Root cause | Fix |
|---------|------------|-----|
| Photorealistic | STYLE not specified | `buildVisualBrief` must always set STYLE |
| Mixed styles | STYLE not committed | One style; “commit fully — no style mixing” |
| Sharp rectangular containers | Curved corners missed | REQUIREMENTS in `imgPrompt` |

### Content failures

| Symptom | Root cause | Fix |
|---------|------------|-----|
| Heading/subheading in image | `omitContentTextInImage` not set | Check flag; `buildContentAndVisualBlock` adds do-not-render instruction |
| Generic unrelated image | Brief used heading only | Pass **raw** content to `buildVisualBrief`; check ~3000 char truncation |
| Decorative, no information | SUPPORTING TEXT vague | Be explicit: CVE badge, “94% detection rate”, “BLOCKED” label |

### Slot failures

| Symptom | Root cause | Fix |
|---------|------------|-----|
| Slot too tall, space below text | Extra bottom padding in height calc | Remove `+ fontSize * 0.6`; use ascent + wrapped height only |
| Visual corners wrong | `visualImageBorderRadius` vs slot aspect | Radius clamped to half slot w/h in `PreviewPanel`; raise slider or widen slot |

### Designer “White bg” still tinted

Tighten **`designerWhiteBgClause`** in `LeftPanel.tsx`; confirm **`headerMode === "designer"`** and flag on.

---

## When **not** to apply this skill

- Nanobanana / raw transport-only image API changes **with no prompt change**  
- UI wholly outside paste / preview / slot / layout pipeline  
- Content API schema changes **unrelated** to `heading` / `subheading` / `footer`  
- Studio tab fabric / SVG canvas — different skill  
- Generic React/Next work **unrelated** to this pipeline  

---

## Cross-reference

- **`content-studio-designer-pipeline`** — Embed keys (`primeDesignerEmbed`, `ce_designer_embed_*`), `DesignerOverlay`, `/api/generate/image`, mirroring rule.
