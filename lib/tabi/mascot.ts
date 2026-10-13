// Tabi's artwork registry — the only place that knows file paths.
// Rendered from the three.js model in scripts/tabi-mascot (scene.html → render.cjs):
// `src` = full body, `face` = head close-up for round avatars,
// `sprite` = 12-frame face loop (breathe, sway, tail wag, blink) for CSS steps(12).
export const TABI_ART = {
  idle: { src: "/tabi/tabi-idle.png", face: "/tabi/tabi-idle-face.png", sprite: "/tabi/tabi-idle-sprite.webp", alt: "ทาบิ" },
  happy: { src: "/tabi/tabi-happy.png", face: "/tabi/tabi-happy-face.png", sprite: "/tabi/tabi-happy-sprite.webp", alt: "ทาบิดีใจ" },
  worried: { src: "/tabi/tabi-worried.png", face: "/tabi/tabi-worried-face.png", sprite: "/tabi/tabi-worried-sprite.webp", alt: "ทาบิไม่แน่ใจ" },
} as const;

export type TabiMood = keyof typeof TABI_ART;

/** Full-body hop-and-sway loop for the home hero: 16 frames, played with CSS steps(16). */
export const TABI_DANCE = { sprite: "/tabi/tabi-dance-sprite.webp", frames: 16 } as const;
