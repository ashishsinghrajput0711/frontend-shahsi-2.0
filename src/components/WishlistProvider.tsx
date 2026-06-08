"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  addToWishlist,
  checkWishlist,
  getWishlistCount,
  removeFromWishlist,
  unwrapWishlistCount,
} from "@/lib/api/wishlist.api";

type WishlistContextValue = {
  count: number;
  loadingCount: boolean;
  wishlistedMap: Record<string, boolean>;
  refreshWishlistCount: () => Promise<void>;
  checkProductsWishlist: (productIds: string[]) => Promise<void>;
  toggleWishlist: (productId: string, variantId?: string | null) => Promise<boolean>;
  isWishlisted: (productId?: string | null) => boolean;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function isAuthError(error: any) {
  const message = String(error?.message || error || "").toLowerCase();

  return (
    message.includes("auth") ||
    message.includes("token") ||
    message.includes("unauthorized") ||
    message.includes("login")
  );
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [wishlistedMap, setWishlistedMap] = useState<Record<string, boolean>>({});

  const refreshWishlistCount = useCallback(async () => {
    try {
      setLoadingCount(true);

      const response = await getWishlistCount();

      setCount(unwrapWishlistCount(response));
    } catch (error) {
      console.error("Wishlist count failed:", error);

      setCount(0);
    } finally {
      setLoadingCount(false);
    }
  }, []);

  const checkProductsWishlist = useCallback(async (productIds: string[]) => {
    const ids = Array.from(
      new Set(
        productIds
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );

    if (!ids.length) return;

    try {
      const response = await checkWishlist(ids);
      const items = response?.data?.items || [];

      setWishlistedMap((prev) => {
        const next = { ...prev };

        items.forEach((item) => {
          const productId = String(item.productId || "").trim();

          if (!productId) return;

          next[productId] = Boolean(item.wishlisted || item.isWishlisted);
        });

        return next;
      });
    } catch (error) {
      console.error("Wishlist check failed:", error);
    }
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string, variantId?: string | null) => {
      const cleanProductId = String(productId || "").trim();

      if (!cleanProductId) {
        throw new Error("Product id missing for wishlist.");
      }

      const currentlyWishlisted = Boolean(wishlistedMap[cleanProductId]);

      try {
        if (currentlyWishlisted) {
          await removeFromWishlist(cleanProductId);

          setWishlistedMap((prev) => ({
            ...prev,
            [cleanProductId]: false,
          }));

          setCount((prev) => Math.max(0, prev - 1));

          return false;
        }

        await addToWishlist({
          productId: cleanProductId,
          variantId: variantId || undefined,
        });

        setWishlistedMap((prev) => ({
          ...prev,
          [cleanProductId]: true,
        }));

        setCount((prev) => prev + 1);

        return true;
      } catch (error: any) {
        console.error("Wishlist toggle failed:", error);

        if (isAuthError(error)) {
          if (typeof window !== "undefined") {
            window.location.href = "/account";
          }
        }

        throw error;
      } finally {
        refreshWishlistCount().catch(() => {});
      }
    },
    [refreshWishlistCount, wishlistedMap],
  );

  const isWishlisted = useCallback(
    (productId?: string | null) => {
      const cleanProductId = String(productId || "").trim();

      if (!cleanProductId) return false;

      return Boolean(wishlistedMap[cleanProductId]);
    },
    [wishlistedMap],
  );

  const value = useMemo(
    () => ({
      count,
      loadingCount,
      wishlistedMap,
      refreshWishlistCount,
      checkProductsWishlist,
      toggleWishlist,
      isWishlisted,
    }),
    [
      count,
      loadingCount,
      wishlistedMap,
      refreshWishlistCount,
      checkProductsWishlist,
      toggleWishlist,
      isWishlisted,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }

  return context;
}