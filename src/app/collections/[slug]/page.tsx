"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { CollectionPageContent } from "@/app/collection/page";

function CollectionSlugContent() {
  const params = useParams();
  const slug = String((params as any)?.slug || "").trim();

  return <CollectionPageContent collectionSlug={slug} />;
}

export default function CollectionSlugPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fbf8f1] text-[#15100c]">
          <p className="text-sm text-[#6d6760]">Loading collection...</p>
        </main>
      }
    >
      <CollectionSlugContent />
    </Suspense>
  );
}