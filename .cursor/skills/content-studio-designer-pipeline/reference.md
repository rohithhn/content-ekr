# Designer pipeline — reference tables

Companion to `SKILL.md`. File paths in the repo: `content-studio/designer-app/...` and `content-studio/lib/designer-image/...`.

## VISUAL TYPE — output character

| Type | Character |
|------|-----------|
| diagram-illustration | Technical precision + illustration polish — not a bare whiteboard |
| editorial-illustration | Bold abstract shapes, metaphorical, magazine-cover energy |
| abstract-illustration | Pure form and color — mood is the message |
| icon-diagram | Icons as spatial heroes — layout logic, not decoration |
| data-visualization | Data is the subject — numbers, charts, trends |
| dark-technical | Near-black BG, glowing nodes, terminal/hacker aesthetic |
| product-ui | Partial screen fragments, device frames, UI components |

## STYLE — committed single style

| Style | BG | Character |
|-------|-----|-----------|
| flat-vector-precise | Light | Clean edges, exact geometry, minimal object gradients |
| dark-editorial | Near-black `#0D0F14` | Glowing accents, scanline texture, high contrast |
| bold-color-block | Any | Bauhaus-level color zones, minimal detail |
| editorial-illustration | Light | Painterly-meets-digital, expressive shapes |
| glassmorphism | Light | Frosted panels, backdrop blur, layered depth |
| isometric-precision | Light | 30° grid, ambient shadow layers |
| cinematic-duotone | Dark | Two-color film treatment, uneven bleed |
| abstract-geometric | Any | Pure shape/form, extreme scale contrasts |

## PALETTE notes

- Accents beyond brand orange/pink: teal `#06B6D4`, violet `#7C3AED`, amber `#F59E0B`.
- Dark BGs for security: deep navy `#0A0F1E`, near-black `#0D0F14`, deep teal `#0F2A2A`.
- Designer + white bg: outer canvas forced white; inner cards/diagrams can still use brief-driven fills.

## Red targeting (when RED DECISION ACTIVE)

| Content element | Brief instruction examples |
|-----------------|----------------------------|
| Attack node | Red fill + soft glow on attack node glyph only |
| CVE badge | Red pill, white CVE text |
| Threat / severity | Red background, white text — CRITICAL / HIGH |
| Before/after — before panel | Red tint overlay `#D92D20` ~15% on compromised panel |
| Danger step in flow | Red circle step number, red connector arrow |
| Cracked / compromised | Red fracture lines from break point |
| Intrusion path | Red dashed arrow — attack vector |
| Malicious terminal line | Red text on that line only |
| Risk score high | Red numeral + red upward arrow |

## Common failure modes (expanded)

### Red

| Symptom | Cause | Fix |
|---------|--------|-----|
| No red on threat content | `THREAT_SIGNALS` gap | Add phrase to array in `imagePromptBuilder` |
| ACTIVE ignored | Regex / line format | `RED DECISION:` on its own line |
| Red spread everywhere | Brief too loose | Name exact element — “glyph only, no red elsewhere” |
| Red on safe content | False positive / LLM ACTIVE | Check raw text; tighten INACTIVE in brief |
| Red on borders despite INACTIVE | Model drift | Reinforce in SUPPORTING TEXT: no red on borders/frames |

### Creativity / quality

| Symptom | Cause | Fix |
|---------|--------|-----|
| Stock-art generic | Wrong VISUAL TYPE | editorial / abstract for non-diagram thought leadership |
| Flat composition | No surprise in COMPOSITION | 3× hero scale, diagonal, negative space, bleed |
| Same visual weight | No focal point | One hero 2–3× supporting elements |
| AI sludge palette | Only orange/pink | Third accent + saturation steps |
| PowerPoint feel | Too many equal elements | 3–5 elements; foreground/mid/background depth |
| Missed illustration | Default icons for TL | editorial-illustration / abstract-illustration |
| Dark security washed | Light palette | dark-technical + deep BG + cool white `#F0F4FF` labels |

### Background / layout

| Symptom | Cause | Fix |
|---------|--------|-----|
| White card on gradient | 2-layer default | One-bg REQUIREMENTS; SUPPORTING TEXT “no floating full-width card” |
| Transparent hole | Bad “transparent” wording | Use single light wash language except trns mode |
| Cramped | No padding | COMPOSITION: generous padding, clear margins |
| White bg still tinted | Clause weak | Tighten `designerWhiteBgClause`; confirm `headerMode === "designer"` |

### Style / rendering

| Symptom | Cause | Fix |
|---------|--------|-----|
| Photorealistic | STYLE missing | Brief must always set STYLE |
| Mixed styles | Uncommitted STYLE | One style; “commit fully — no mixing” |
| Sharp boxes | Missed curved rule | REQUIREMENTS curved corners (already in imgPrompt) |

### Content in image

| Symptom | Cause | Fix |
|---------|--------|-----|
| H/S/F in bitmap | omit false or prompt leak | `omitContentTextInImage`; omit branch without literal strings |
| Unrelated image | Brief from heading only | Rich `rawContent` into `buildVisualBrief`; 3000 char cap |
| Decorative only | Vague SUPPORTING TEXT | Explicit badges, stats, labels, fragments |

### Slots

| Symptom | Cause | Fix |
|---------|--------|-----|
| Slot too tall | Extra bottom padding | ascent + wrapped height only |
| Corner radius wrong | `visualImageBorderRadius` vs slot | Clamp rules in PreviewPanel; adjust slider / slot |
