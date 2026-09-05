import type { Metadata } from "next";
import { StudySessionView } from "@/components/study-session";

export const metadata: Metadata = { title: "Daily study" };
export default function StudyPage() {
  return <StudySessionView />;
}
