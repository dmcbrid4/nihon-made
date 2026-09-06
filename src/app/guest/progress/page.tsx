import type { Metadata } from "next";
import { GuestProgress } from "@/components/guest-demo";
export const metadata: Metadata = { title: "Guest progress" };
export default function GuestProgressPage() { return <GuestProgress />; }
