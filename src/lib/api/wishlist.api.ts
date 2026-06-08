import { apiRequest } from "./client";

export type WishlistCountResponse = {
  success?: boolean;
  data?: {
    count?: number;
  };
  error?: string | null;
};

export type WishlistProduct = {
  id?: string;
  productId?: string;
  slug?: string;
  title?: string;
  name?: string;
  price?: number | string;
  salePrice?: number | string;
  listingPrice?: number | string;
  currency?: string;
  imageUrl?: string;
  thumbnail?: string;
  image?: string;
  categoryPath?: string[] | string;
  breadcrumb?: Array<{
    name?: string;
    slug?: string;
    path?: string;
    url?: string;
  }>;
  primaryCategory?: string;
  category?: string;
  status?: string;
  isActive?: boolean;
};

export type WishlistVariant = {
  id?: string;
  variantId?: string;
  size?: string;
  color?: string;
  colorHex?: string;
  height?: string;
  available?: boolean;
  stock?: number;
};

export type WishlistItem = {
  id?: string;
  wishlistItemId?: string;
  productId?: string;
  variantId?: string | null;
  createdAt?: string;
  product?: WishlistProduct;
  variant?: WishlistVariant | null;
};

export type WishlistListResponse = {
  success?: boolean;
  data?: {
    items?: WishlistItem[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  error?: string | null;
};

export type AddWishlistPayload = {
  productId: string;
  variantId?: string | null;
};

export type AddWishlistResponse = {
  success?: boolean;
  data?: {
    id?: string;
    productId?: string;
    variantId?: string | null;
    alreadyExists?: boolean;
    createdAt?: string;
  };
  message?: string;
  error?: string | null;
  code?: string;
};

export type RemoveWishlistResponse = {
  success?: boolean;
  data?: {
    removed?: boolean;
    productId?: string;
  };
  message?: string;
  error?: string | null;
  code?: string;
};

export type WishlistCheckResponse = {
  success?: boolean;
  data?: {
    items?: Array<{
      productId: string;
      wishlisted?: boolean;
      isWishlisted?: boolean;
      wishlistItemId?: string | null;
    }>;
  };
  error?: string | null;
  code?: string;
};

export function getWishlistCount() {
  return apiRequest<WishlistCountResponse>("/wishlist/count", {
    method: "GET",
  });
}

export function getWishlist(params?: { page?: number; limit?: number }) {
  const page = params?.page || 1;
  const limit = params?.limit || 12;

  return apiRequest<WishlistListResponse>(
    `/wishlist?page=${page}&limit=${limit}`,
    {
      method: "GET",
    },
  );
}

export function addToWishlist(payload: AddWishlistPayload) {
  return apiRequest<AddWishlistResponse>("/wishlist", {
    method: "POST",
    body: payload,
  });
}

export function removeFromWishlist(productId: string) {
  return apiRequest<RemoveWishlistResponse>(
    `/wishlist/product/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
    },
  );
}

export function checkWishlist(productIds: string[]) {
  return apiRequest<WishlistCheckResponse>("/wishlist/check", {
    method: "POST",
    body: {
      productIds,
    },
  });
}

export function unwrapWishlistItems(response: any): WishlistItem[] {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.data?.items)) return response.data.data.items;

  return [];
}

export function unwrapWishlistCount(response: any) {
  const value =
    response?.data?.count ??
    response?.count ??
    response?.data?.data?.count ??
    0;

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : 0;
}