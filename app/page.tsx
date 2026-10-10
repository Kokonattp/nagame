import { prompt } from "@/components/tabi/fonts";
import { TabiApp } from "@/components/tabi/tabi-app";

// Home = Tabi V1-lite (docs/spec-nagame-v1-lite.md). Rollback: render
// <PretripHome seedBubbles={[]} seedCards={[]} /> from "@/components/pretrip/pretrip-home" again.
// Title, description and icons come from app/layout.tsx (one slogan for the whole site).
// ?q=… (from the month guides) is asked to Tabi on arrival; ?src=… tags where the visit came from (e.g. fb1).

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string | string[]; src?: string | string[] }> }) {
  const { q, src } = await searchParams;
  const ask = typeof q === "string" ? q.trim().slice(0, 300) : undefined;
  const source = typeof src === "string" && /^[a-z0-9_-]{1,20}$/i.test(src) ? src : undefined;
  return (
    <div className={prompt.variable}>
      <TabiApp initialAsk={ask || undefined} source={source} />
    </div>
  );
}
