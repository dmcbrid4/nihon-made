import type { Metadata } from "next";
import { KanaHome } from "@/components/kana-home";

export const metadata: Metadata = { title: "Kana" };
export default function KanaPage() {
  return <KanaHome />;
}
