import type { Metadata } from "next";
import { GuestSettings } from "@/components/guest-demo";
export const metadata: Metadata = { title: "Guest settings" };
export default function GuestSettingsPage() { return <GuestSettings />; }
