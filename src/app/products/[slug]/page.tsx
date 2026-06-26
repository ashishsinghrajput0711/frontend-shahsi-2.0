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
  const type = String(
    item?.type || item?.mediaType || item?.resourceType || item?.mimeType || "",
  ).toLowerCase();

  if (!type) return true;

  return type.includes("image") && !type.includes("video");
}

function getImageFromArray(items: any[]) {
  const imageItems = items.filter((item) => {
    if (typeof item === "string") return true;
    return isImageLike(item);
  });

  const sortedItems = [...imageItems].sort((a, b) => {
    const aPrimary = Boolean(a?.isPrimary || a?.primary);
    const bPrimary = Boolean(b?.isPrimary || b?.primary);

    if (aPrimary && !bPrimary) return -1;
    if (!aPrimary && bPrimary) return 1;

    const aPosition = Number(a?.position ?? a?.sortOrder ?? 999);
    const bPosition = Number(b?.position ?? b?.sortOrder ?? 999);

    return aPosition - bPosition;
  });

  const primary = sortedItems[0];

  if (!primary) return "";

  if (typeof primary === "string") return primary;

  return (
    primary?.secureUrl ||
    primary?.secure_url ||
    primary?.url ||
    primary?.src ||
    primary?.imageUrl ||
    primary?.thumbnailUrl ||
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
      getImageFromArray(images) ||
      getImageFromArray(media) ||
      product?.primaryImage ||
      product?.imageUrl ||
      product?.image ||
      product?.thumbnail ||
      product?.thumbnailUrl ||
      product?.ogImage ||
      product?.pinterestImage ||
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

function getProductPrice(product: any) {
  return (
    product?.price ||
    product?.basePrice ||
    product?.listingPrice ||
    product?.salePrice ||
    product?.rentalPrice ||
    product?.rentPrice ||
    product?.resalePrice ||
    product?.originalPrice ||
    product?.pricing?.amount ||
    ""
  );
}

function getProductDescription(product: any) {
  return (
    product?.metaDescription ||
    product?.seoDescription ||
    product?.shortDescription ||
    product?.excerpt ||
    product?.description ||
    "Explore this Shahsi product."
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  const title = String(
    product?.seoTitle ||
      product?.metaTitle ||
      product?.title ||
      product?.name ||
      "Shahsi Product",
  ).trim();

  const description = stripHtml(getProductDescription(product)).slice(0, 220);

  const productImage = getProductImage(product);
  const socialImage = buildSocialPreviewImage(productImage);

  const productSlug = String(product?.slug || slug).trim();
  const url = `${SITE_URL}/products/${encodeURIComponent(productSlug)}`;

  const price = getProductPrice(product);
  const currency = String(
    product?.currency || product?.pricing?.currency || "USD",
  ).toUpperCase();

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
  title,
  description,
  url,
  siteName: "Shahsi",
  type: "website",
  images: socialImage
    ? [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ]
    : [],
},
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: socialImage ? [socialImage] : [],
    },
    other: {
      "product:price:amount": price ? String(price) : "",
      "product:price:currency": currency,
      "pinterest-rich-pin": "true",
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  return <ProductDetailClient slug={slug} />;
}
