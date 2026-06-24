"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { ScopedProductDetailPage } from "@/components/catalog/ScopedProductDetailPage";

function CollectionProductDetailContent() {
  const params = useParams();

  const collectionSlug = String((params as any)?.slug || "").trim();
  const productSlug = String((params as any)?.productSlug || "").trim();

  return (
    <ScopedProductDetailPage
      categoryPath={collectionSlug ? `collections/${collectionSlug}` : ""}
      productId={productSlug}
    />
  );
}

export default function CollectionProductDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fbf8f1] text-[#15100c]">
          <p className="text-sm text-[#6d6760]">Loading product...</p>
        </main>
      }
    >
      <CollectionProductDetailContent />
    </Suspense>
  );
}