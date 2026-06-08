import { apiRequest } from "./client";

export type SearchProduct = {
  id?: string;
  productId?: string;
  slug?: string;
  title?: string;
  name?: string;
  brand?: string;
  category?: string;
  categoryPath?: string | string[];
  color?: string;
  imageUrl?: string;
  thumbnail?: string;
  image?: string;
  price?: number | string;
  score?: number;

  images?: any[];
  media?: {
    url?: string;
    secureUrl?: string;
    type?: string;
    mediaType?: string;
  };
  primaryImage?: string;
  primaryMedia?: {
    url?: string;
    secureUrl?: string;
  };
};

export type SearchResponse =
  | SearchProduct[]
  | {
      success?: boolean;
      data?: SearchProduct[] | { items?: SearchProduct[]; products?: SearchProduct[] };
      results?: SearchProduct[];
      items?: SearchProduct[];
      products?: SearchProduct[];
      error?: string | null;
    };

export function searchProducts(query: string) {
  return apiRequest<SearchResponse>(`/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
  });
}

export function unwrapSearchResults(response: any): SearchProduct[] {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.products)) return response.products;

  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.products)) return response.data.products;
  if (Array.isArray(response?.data?.results)) return response.data.results;

  return [];
}

export function getSearchProductId(product: SearchProduct) {
  return String(product.id || product.productId || "").trim();
}

export function getSearchProductTitle(product: SearchProduct) {
  return String(product.title || product.name || "Product title missing").trim();
}

export function getSearchProductImage(product: SearchProduct) {
  return String(
    product.imageUrl ||
      product.thumbnail ||
      product.image ||
      product.primaryImage ||
      product.media?.url ||
      product.media?.secureUrl ||
      product.primaryMedia?.url ||
      product.primaryMedia?.secureUrl ||
      ""
  ).trim();
}

export function getSearchProductHref(product: SearchProduct) {
  const idOrSlug = String(product.slug || product.id || product.productId || "").trim();

  const categoryPathRaw = product.categoryPath;
  const categoryPath = Array.isArray(categoryPathRaw)
    ? categoryPathRaw.join("/")
    : String(categoryPathRaw || product.category || "").trim();

  if (categoryPath && idOrSlug) {
    return `/${categoryPath}/${encodeURIComponent(idOrSlug)}`;
  }

  if (idOrSlug) {
    return `/products/${encodeURIComponent(idOrSlug)}`;
  }

  return "#";
}