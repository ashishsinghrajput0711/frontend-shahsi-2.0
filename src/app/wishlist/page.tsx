"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Heart, Loader2, ShoppingBag, Trash2, XCircle } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useWishlist } from "@/components/WishlistProvider";
import {
  getWishlist,
  removeFromWishlist,
  unwrapWishlistItems,
  WishlistItem,
} from "@/lib/api/wishlist.api";

function readFirst(...values: unknown[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return "";
}

function getProduct(item: WishlistItem) {
  return item.product || {};
}

function getProductId(item: WishlistItem) {
  const product = getProduct(item);

  return readFirst(item.productId, product.productId, product.id);
}

function getProductTitle(item: WishlistItem) {
  const product = getProduct(item);

  return readFirst(product.title, product.name, "Product title missing");
}

function getProductImage(item: WishlistItem) {
  const product = getProduct(item);

  return readFirst(product.imageUrl, product.thumbnail, product.image);
}

function getProductPrice(item: WishlistItem) {
  const product = getProduct(item);

  const value =
    product.salePrice ??
    product.listingPrice ??
    product.price ??
    0;

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : 0;
}

function getProductHref(item: WishlistItem) {
  const product = getProduct(item);
  const slug = readFirst(product.slug, getProductId(item));

  const categoryPathRaw = product.categoryPath;
  const categoryPath = Array.isArray(categoryPathRaw)
    ? categoryPathRaw.join("/")
    : readFirst(categoryPathRaw, product.primaryCategory, product.category);

  if (categoryPath && slug) {
    return `/${categoryPath}/${encodeURIComponent(slug)}`;
  }

  if (slug) {
    return `/products/${encodeURIComponent(slug)}`;
  }

  return "#";
}

export default function WishlistPage() {
  const { refreshWishlistCount } = useWishlist();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");
  const [error, setError] = useState("");

  const total = items.length;

  async function loadWishlist() {
    try {
      setLoading(true);
      setError("");

      const response = await getWishlist({
        page: 1,
        limit: 60,
      });

      setItems(unwrapWishlistItems(response));
    } catch (error: any) {
      console.error("Wishlist page load failed:", error);
      setItems([]);
      setError(error?.message || "Wishlist API failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWishlist();
    refreshWishlistCount().catch(() => {});
  }, [refreshWishlistCount]);

  async function handleRemove(item: WishlistItem) {
    const productId = getProductId(item);

    if (!productId) return;

    try {
      setRemovingId(productId);

      await removeFromWishlist(productId);

      setItems((prev) => prev.filter((entry) => getProductId(entry) !== productId));

      refreshWishlistCount().catch(() => {});
    } catch (error: any) {
      console.error("Wishlist remove failed:", error);
      setError(error?.message || "Unable to remove wishlist item.");
    } finally {
      setRemovingId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#fbf8f1] text-[#15100c]">
      <SiteHeader />

      <section className="border-b border-[#ded3c4] bg-[#f4ecdf] px-5 py-10 lg:px-10">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a8178]">
            Shahsi
          </p>

          <h1 className="mt-4 font-serif text-5xl font-medium tracking-[-0.05em] md:text-7xl">
            Wishlist
          </h1>

          <p className="mt-4 text-sm text-[#6d6760]">
            {loading ? "Loading your wishlist..." : `${total} saved product${total === 1 ? "" : "s"}`}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 py-8 lg:px-10">
        {error ? (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-700">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Wishlist error</p>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-[#6d6760]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading wishlist from backend...
            </div>
          </div>
        ) : null}

        {!loading && !error && !items.length ? (
          <div className="rounded-3xl border border-[#ded3c4] bg-white px-6 py-16 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f4ecdf]">
              <Heart className="h-7 w-7" />
            </div>

            <h2 className="mt-6 text-2xl font-semibold">Your wishlist is empty</h2>

            <p className="mt-3 text-sm text-[#6d6760]">
              Product heart pe click karke products save karo.
            </p>

            <a
              href="/products"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-[#15100c] px-7 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Shop Products
            </a>
          </div>
        ) : null}

        {!loading && items.length ? (
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const productId = getProductId(item);
              const image = getProductImage(item);
              const title = getProductTitle(item);
              const price = getProductPrice(item);
              const href = getProductHref(item);
              const removing = removingId === productId;

              return (
                <article key={item.id || productId} className="group">
                  <a
                    href={href}
                    className="relative block aspect-[3/4] overflow-hidden bg-[#efe5d8]"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={title}
                        className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-[#8a8178]">
                        Backend media missing
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        handleRemove(item);
                      }}
                      disabled={removing}
                      className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full bg-white text-[#15100c] shadow-lg transition hover:bg-[#15100c] hover:text-white disabled:opacity-60"
                      aria-label="Remove from wishlist"
                    >
                      {removing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </a>

                  <div className="pt-4">
                    <a
                      href={href}
                      className="line-clamp-2 text-[15px] font-semibold leading-6 text-[#15100c] transition hover:text-[#b98262]"
                    >
                      {title}
                    </a>

                    <p className="mt-2 text-sm font-semibold">
                      ${price}
                    </p>

                    <button
                      type="button"
                      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 border border-[#15100c] text-xs font-semibold uppercase tracking-[0.18em] transition hover:bg-[#15100c] hover:text-white"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Add To Bag
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}