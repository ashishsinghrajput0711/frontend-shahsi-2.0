"use client";

import { ScopedProductDetailPage } from "@/components/catalog/ScopedProductDetailPage";

type ProductDetailClientProps = {
  slug: string;
};

export default function ProductDetailClient({ slug }: ProductDetailClientProps) {
  return <ScopedProductDetailPage categoryPath="" productId={slug} />;
}