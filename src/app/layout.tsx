import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { StudyProvider } from "@/components/study-provider";
import { getAppConfig } from "@/lib/server/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "日本まで · Nihon Made", template: "%s · Nihon Made" },
  description: "A little closer to Japan. Your personal Japanese study space.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "日本まで" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f6f2",
};
export const dynamic = "force-dynamic";

const themeScript = `try{var t=localStorage.getItem('nihon-made:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <StudyProvider mode={getAppConfig().mode === "database" ? "database" : "browser"}>
          <AppShell>{children}</AppShell>
        </StudyProvider>
      </body>
    </html>
  );
}
