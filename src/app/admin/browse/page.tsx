import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminBrowse } from "@/components/admin-browse";
import { Loading } from "@/components/loading";

export const metadata: Metadata = { title: "Admin browse" };
export default function AdminBrowsePage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminBrowse />
    </Suspense>
  );
}
