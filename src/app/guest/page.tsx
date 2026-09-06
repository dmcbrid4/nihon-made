import type { Metadata } from "next";
import { GuestStudy } from "@/components/guest-study";

export const metadata: Metadata = { title: "Guest lesson" };

export default function GuestPage() {
  return <GuestStudy />;
}
