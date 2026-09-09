import type { Metadata } from "next";
import { Suspense } from "react";
import { QuickSort } from "@/components/quick-sort";
import { Loading } from "@/components/loading";

export const metadata: Metadata = { title: "Quick sort" };
export default function QuickSortPage() {
  return (
    <Suspense fallback={<Loading />}>
      <QuickSort />
    </Suspense>
  );
}
