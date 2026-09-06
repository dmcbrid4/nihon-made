import type { Metadata } from "next";
import { GuestStudy } from "@/components/guest-demo";
export const metadata: Metadata = { title: "Guest lesson" };
export default function GuestStudyPage() { return <GuestStudy />; }
