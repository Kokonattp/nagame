export const KRUAK_ART = {
  idle: {
    asset: "/kruak/kruak-idle.png",
    alt: "กร๊วก",
  },
  sunny: {
    asset: "/kruak/kruak-sunny.png",
    alt: "กร๊วกอารมณ์ดี",
  },
  rain: {
    asset: "/kruak/kruak-rain.png",
    alt: "กร๊วกถือร่ม",
  },
  dust: {
    asset: "/kruak/kruak-dust.png",
    alt: "กร๊วกสวมหน้ากาก",
  },
  worried: {
    asset: "/kruak/kruak-worried.png",
    alt: "กร๊วกกำลังเป็นห่วง",
  },
} as const;

export type KruakArtKey = keyof typeof KRUAK_ART;
