import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { kanaScripts } from "@/lib/study/types";
import { KanaStudyPage } from "@/components/kana-study";
import { Loading } from "@/components/loading";

export const metadata: Metadata = { title: "Kana study" };

export default async function KanaScriptPage({
  params,
}: {
  params: Promise<{ script: string }>;
}) {
  const { script } = await params;
  if (!kanaScripts.includes(script as (typeof kanaScripts)[number])) notFound();
  return (
    <Suspense fallback={<Loading />}>
      <KanaStudyPage script={script as "hiragana" | "katakana"} />
    </Suspense>
  );
}
