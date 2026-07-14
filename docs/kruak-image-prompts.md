# Kruak image prompts — Japanese bobtail cat

Use this document as the source of truth for future Kruak artwork. Generate one master image first, then use it as the reference for every other mood so the cat's identity stays consistent.

## Style bible

```text
Character: "Kruak", a cute chibi Japanese bobtail cat **traveler** mascot for a
Japan-travel app.
Rounded chubby cream-white body, a small curled bobtail, warm russet ear tips, and
one small vermilion-red forehead patch (#D64000). Tiny dark-brown bead eyes, a
muted-gold bell (#B98A20) on an indigo sashiko traveler scarf (#1A3A32), a small
vermilion furoshiki bundle slung behind one shoulder, and tiny paws.

Art style: polished kawaii flat vector mascot with a subtle Showa-era Japanese retro
feel — warm washi-paper palette, gentle 2px #2B2622 ink outline (not pure black),
flat cel shading with one soft interior shadow, and slightly grainy vintage texture.
Friendly and premium, never generic clip-art.

Output: one centered FULL-BODY cat in a 1:1 composition with generous padding.
Use a transparent PNG. When using Codex image generation, create it on a perfectly
flat #00FF00 chroma-key background, with no scene, floor, or cast shadow, then remove
the chroma key locally.
```

## Required moods

| Mood | Final file | Prompt change from master |
| --- | --- | --- |
| Idle | `public/kruak/kruak-idle.png` | Standing forward, calm friendly smile, paws relaxed. This is the master reference. |
| Sunny | `public/kruak/kruak-sunny.png` | Small round sunglasses above the forehead patch, curved happy eyes, one paw raised in a wave. |
| Rain | `public/kruak/kruak-rain.png` | Holding a small vermilion #D64000 traditional Japanese wagasa umbrella; calm, content expression. |
| Dust | `public/kruak/kruak-dust.png` | Wearing a small plain white face mask; kind, slightly squinting eyes. Cute and caring, not sad. |
| Worried | `public/kruak/kruak-worried.png` | Gently worried expression, raised angled brows, one tiny blue-gray sweat drop, paws lifted slightly in concern. Warm, never scary or crying. |

## Consistency checklist

1. Generate idle first and attach it as the identity reference for the four other moods.
2. Preserve the body proportions, forehead patch, russet ear tips, sashiko scarf, bell, furoshiki bundle, outline weight, and palette in every image.
3. Save only the final transparent PNG files at the paths above.
4. Keep the mapping in `lib/game/kruak.ts` and use `components/kruak-avatar.tsx` to render the artwork.
