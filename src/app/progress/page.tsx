import type { Metadata } from "next";
import { ProgressView } from "@/components/progress";

export const metadata: Metadata = { title: "Progress" };
export default function ProgressPage() {
  return <ProgressView />;
}
