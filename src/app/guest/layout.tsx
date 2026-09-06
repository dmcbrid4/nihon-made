import { GuestDemoProvider, GuestShell } from "@/components/guest-demo";

export default function GuestLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <GuestDemoProvider><GuestShell>{children}</GuestShell></GuestDemoProvider>;
}
