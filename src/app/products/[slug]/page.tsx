import type { Metadata } from "next";
import ProductDetailClient from "./ProductDetailClient";

const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://65.1.135.224:3001";

const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  "https://frontend-shahsi-2-0.vercel.app";

const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, "");
const SITE_URL = RAW_SITE_URL.replace(/\/$/, "");

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getProduct(slug: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/catalog/slug/${encodeURIComponent(slug)}`,
      {
        next: {
          revalidate: 60,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const json = await response.json();

    return json?.data || json?.product || json;
  } catch (error) {
    console.error("Product metadata fetch failed:", error);
    return null;
  }
}

function stripHtml(value?: string | null) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(url?: string | null) {
  const cleanUrl = String(url || "").trim();

  if (!cleanUrl) return "";

  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    return cleanUrl;
  }

  return `${SITE_URL}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
}

function isImageLike(item: any) {
  if (typeof item === "string") return true;

  const type = String(
    item?.type ||
      item?.mediaType ||
      item?.resourceType ||
      item?.viewType ||
      item?.mimeType ||
      "",
  ).toLowerCase();

  if (!type) return true;

  return type.includes("image") && !type.includes("video");
}

function getImageFromArray(items?: any[]) {
  if (!Array.isArray(items) || items.length === 0) return "";

  const imageItems = items.filter((item) => {
    if (typeof item === "string") return true;
    return isImageLike(item);
  });

  const sortedItems = [...imageItems].sort((a, b) => {
    if (typeof a === "string" || typeof b === "string") return 0;

    const aPrimary = Boolean(a?.isPrimary || a?.primary);
    const bPrimary = Boolean(b?.isPrimary || b?.primary);

    if (aPrimary && !bPrimary) return -1;
    if (!aPrimary && bPrimary) return 1;

    const aPosition = Number(a?.position ?? a?.sortOrder ?? 999);
    const bPosition = Number(b?.position ?? b?.sortOrder ?? 999);

    return aPosition - bPosition;
  });

  const primary =
    sortedItems.find((item) => {
      if (typeof item === "string") return false;
      return item?.isPrimary || item?.primary;
    }) || sortedItems[0];

  if (!primary) return "";

  if (typeof primary === "string") return primary;

  return (
    primary?.secureUrl ||
    primary?.secure_url ||
    primary?.url ||
    primary?.src ||
    primary?.imageUrl ||
    primary?.thumbnailUrl ||
    primary?.thumbnail ||
    primary?.path ||
    ""
  );
}

function getProductImage(product: any) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const media = Array.isArray(product?.media) ? product.media : [];

  return absoluteUrl(
    product?.socialPreviewImage ||
      product?.socialImage ||
      product?.ogImage ||
      product?.openGraph?.image ||
      product?.pinterestImage ||
      product?.pinterestSeo?.image ||
      product?.primaryImage ||
      product?.imageUrl ||
      product?.image ||
      product?.thumbnail ||
      product?.thumbnailUrl ||
      getImageFromArray(images) ||
      getImageFromArray(media) ||
      "",
  );
}

function buildSocialPreviewImage(url?: string | null) {
  const imageUrl = absoluteUrl(url);

  if (!imageUrl) return "";

  if (!imageUrl.includes("/image/upload/")) {
    return imageUrl;
  }

  if (
    imageUrl.includes("w_1200") &&
    imageUrl.includes("h_630") &&
    imageUrl.includes("c_pad")
  ) {
    return imageUrl;
  }

  return imageUrl.replace(
    "/image/upload/",
    "/image/upload/w_1200,h_630,c_pad,b_white,q_auto,f_auto/",
  );
}

function getRawProductPrice(product: any) {
  return (
    product?.pricing?.amount ??
    product?.price ??
    product?.basePrice ??
    product?.listingPrice ??
    product?.salePrice ??
    product?.rentalPrice ??
    product?.rentPrice ??
    product?.resalePrice ??
    product?.originalPrice ??
    ""
  );
}

function getNumericPrice(value: unknown) {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  const numeric = Number(String(value).replace(/[^0-9.]/g, ""));

  return Number.isFinite(numeric) && numeric > 0 ? String(numeric) : "";
}

function getFormattedPrice(product: any, currency: string) {
  if (product?.pricing?.displayPrice) {
    return String(product.pricing.displayPrice);
  }

  const rawPrice = getRawProductPrice(product);
  const numericPrice = Number(getNumericPrice(rawPrice));

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return "";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numericPrice);
  } catch {
    return `${currency} ${numericPrice}`;
  }
}

function getProductDescription(product: any) {
  return (
    product?.metaDescription ||
    product?.seoDescription ||
    product?.ogDescription ||
    product?.openGraph?.description ||
    product?.pinterestDescription ||
    product?.pinterestSeo?.description ||
    product?.shortDescription ||
    product?.excerpt ||
    product?.description ||
    "Explore this Shahsi product."
  );
}

function getMetaDescriptionWithPrice({
  product,
  currency,
}: {
  product: any;
  currency: string;
}) {
  const baseDescription = stripHtml(getProductDescription(product));
  const priceText = getFormattedPrice(product, currency);

  const cleanDescription = baseDescription
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);

  const parts = [
    cleanDescription,
    priceText ? `Price: ${priceText}.` : "",
  ].filter(Boolean);

  return parts.join(" ");
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

 const seoTitle = String(
  product?.seoTitle ||
    product?.metaTitle ||
    product?.title ||
    product?.name ||
    "Shahsi Product",
).trim();

const facebookTitle = String(
  product?.name ||
    product?.title ||
    product?.ogTitle ||
    product?.openGraph?.title ||
    product?.metaTitle ||
    product?.seoTitle ||
    "Shahsi Product",
)
  .replace(/\s+/g, " ")
  .replace(/\s+for\s+Quiet Luxury.*$/i, "")
  .replace(/\s+for\s+Luxury Resort.*$/i, "")
  .replace(/\s*&\s*Elevated.*$/i, "")
  .trim()
  .slice(0, 72);

  const currency = String(
    product?.currency || product?.pricing?.currency || "USD",
  ).toUpperCase();

  const description = getMetaDescriptionWithPrice({
    product,
    currency,
  });

  const productImage = getProductImage(product);
  const socialImage = productImage;

  const productSlug = String(product?.slug || slug).trim();
  const url = `${SITE_URL}/products/${encodeURIComponent(productSlug)}`;

  const rawPrice = getRawProductPrice(product);
  const priceAmount = getNumericPrice(rawPrice);
 
  const shareTitle = facebookTitle;

  return {
   title: seoTitle,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: shareTitle,
      description,
      url,
      siteName: "Shahsi",
      type: "website",
   images: socialImage
  ? [
      {
        url: socialImage,
        width: 800,
        height: 1200,
        alt: shareTitle,
      },
    ]
  : [],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: socialImage ? [socialImage] : [],
    },
    other: {
      "product:price:amount": priceAmount,
      "product:price:currency": currency,
      "pinterest-rich-pin": "true",
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  return <ProductDetailClient slug={slug} />;
}