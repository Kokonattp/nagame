import type { KruakArtKey } from "@/lib/game/kruak";
import { KRUAK_ART } from "@/lib/game/kruak";

type KruakAvatarProps = {
  art: KruakArtKey;
  className?: string;
};

export function KruakAvatar({ art, className = "" }: KruakAvatarProps) {
  const image = KRUAK_ART[art];

  return (
    <div
      className={`kruak-avatar kruak-avatar--${art} relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[var(--nb-ink)] bg-[radial-gradient(circle_at_45%_30%,#fffdf8_0%,var(--nb-vermilion-soft)_100%)] shadow-[2px_2px_0_0_var(--nb-ink)] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.asset} alt={image.alt} className="h-[118%] w-[118%] object-contain" />
    </div>
  );
}
