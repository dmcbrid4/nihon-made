import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionView } from "@/components/collection";
import { Loading } from "@/components/loading";

export const metadata: Metadata = { title: "Collection" };
export default function CollectionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CollectionView />
    </Suspense>
  );
}
