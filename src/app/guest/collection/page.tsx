import type { Metadata } from "next";
import { GuestCollection } from "@/components/guest-demo";
export const metadata: Metadata = { title: "Guest collection" };
export default function GuestCollectionPage() { return <GuestCollection />; }
