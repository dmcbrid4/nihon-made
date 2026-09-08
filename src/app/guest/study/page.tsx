import type { Metadata } from "next";
import { GuestStudy } from "@/components/guest-demo";
export const metadata: Metadata = { title: "Guest session" };
export default function GuestStudyPage() {
  return <GuestStudy />;
}
