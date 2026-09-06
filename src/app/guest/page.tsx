import type { Metadata } from "next";
import { GuestDashboard } from "@/components/guest-demo";

export const metadata: Metadata = { title: "Guest demo" };

export default function GuestPage() { return <GuestDashboard />; }
