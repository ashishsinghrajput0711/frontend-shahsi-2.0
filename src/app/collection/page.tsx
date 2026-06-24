"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import {
  getCatalogFilteredProducts,
  getCatalogProducts,
  unwrapCatalogProducts,
  CatalogProduct,
  CatalogVariant,
} from "@/lib/api/catalog.api";
import { addToCart } from "@/lib/api/cart.api";
import { filterPublicVisibleProducts } from "@/lib/product-visibility";
import { ArrowUpRight, Loader2, ShoppingBag, XCircle } from "lucide-react";

const PRODUCTS_PER_PAGE = 12;

type ProductSelection = {
  size: string;
  height: string;
};

type CollectionPageContentProps = {
  collectionSlug?: string;
};

function getProductId(product: CatalogProduct) {
  return String(product.id || product.productId || "");
}

function normalizeCompare(value?: string | number | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeTitle(value: string) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getImageFromCatalog(product: CatalogProduct) {
  const images = product.images;

  if (Array.isArray(images) && images.length) {
    const first = images[0];

    if (typeof first === "string") return first;

    return (
      first?.url ||
      first?.src ||
      first?.imageUrl ||
      product.imageUrl ||
      product.image ||
      product.thumbnail ||
      ""
    );
  }

  return product.imageUrl || product.image || product.thumbnail || "";
}

function getPriceFromCatalog(product: CatalogProduct) {
  const price =
    product.price ||
    product.listingPrice ||
    product.rentalPrice ||
    product.resalePrice ||
    product.rentPrice ||
    product.salePrice ||
    "";

  if (price === "" || price === null || price === undefined) return "";

  const numeric = Number(price);

  if (!Number.isNaN(numeric)) return `$${numeric}`;

  return String(price);
}

function getProductVariants(product: CatalogProduct): CatalogVariant[] {
  const variants =
    product.variants || product.productVariants || product.inventory || [];

  return Array.isArray(variants) ? variants : [];
}

function isVariantAvailable(variant: CatalogVariant) {
  const stock = Number(variant.stock ?? 0);

  return (
    variant.available !== false &&
    variant.isAvailable !== false &&
    variant.isActive !== false &&
    normalizeCompare(variant.status) !== "out_of_stock" &&
    normalizeCompare(variant.status) !== "inactive" &&
    stock > 0
  );
}

function getProductSizes(product: CatalogProduct) {
  const variants = getProductVariants(product);
  const sizeMap = new Map<string, { label: string; available: boolean }>();

  if (Array.isArray(product.sizes)) {
    product.sizes.forEach((item: any) => {
      const label =
        typeof item === "string"
          ? item
          : item?.label || item?.size || item?.name || "";

      if (!label) return;

      sizeMap.set(label, {
        label,
        available: item?.available !== false,
      });
    });
  }

  variants.forEach((variant) => {
    const label = String(variant.size || "").trim();

    if (!label) return;

    const current = sizeMap.get(label);

    sizeMap.set(label, {
      label,
      available: Boolean(current?.available || isVariantAvailable(variant)),
    });
  });

  return Array.from(sizeMap.values());
}

function getProductHeights(product: CatalogProduct) {
  const variants = getProductVariants(product);
  const heightMap = new Map<string, { label: string; available: boolean }>();

  variants.forEach((variant) => {
    const label = String(variant.height || "").trim();

    if (!label) return;

    const current = heightMap.get(label);

    heightMap.set(label, {
      label,
      available: Boolean(current?.available || isVariantAvailable(variant)),
    });
  });

  return Array.from(heightMap.values());
}

function getDefaultSelection(product: CatalogProduct): ProductSelection {
  const sizes = getProductSizes(product);
  const heights = getProductHeights(product);

  const defaultSize =
    sizes.find((size) => size.available)?.label || sizes[0]?.label || "";

  const defaultHeight =
    heights.find((height) => height.available)?.label || heights[0]?.label || "";

  return {
    size: defaultSize,
    height: defaultHeight,
  };
}

function findMatchingVariant(
  product: CatalogProduct,
  selection: ProductSelection,
) {
  const variants = getProductVariants(product);

  const exactVariant = variants.find((variant) => {
    const sizeMatch = selection.size
      ? normalizeCompare(variant.size) === normalizeCompare(selection.size)
      : true;

    const heightMatch = selection.height
      ? normalizeCompare(variant.height) === normalizeCompare(selection.height)
      : true;

    return sizeMatch && heightMatch && isVariantAvailable(variant);
  });

  if (exactVariant) return exactVariant;

  const sizeOnlyVariant = variants.find((variant) => {
    const sizeMatch = selection.size
      ? normalizeCompare(variant.size) === normalizeCompare(selection.size)
      : true;

    return sizeMatch && isVariantAvailable(variant);
  });

  if (sizeOnlyVariant) return sizeOnlyVariant;

  return variants.find(isVariantAvailable) || null;
}

function getProductDetailHref(
  product: CatalogProduct,
  collectionSlug?: string,
) {
  const slugOrId = String(product.slug || product.id || product.productId || "").trim();

  if (!slugOrId) return "#";

  if (collectionSlug) {
    return `/collections/${encodeURIComponent(collectionSlug)}/${encodeURIComponent(
      slugOrId,
    )}`;
  }

  return `/collection?product=${encodeURIComponent(slugOrId)}`;
}

async function readProxyJson(endpoint: string) {
  const response = await fetch(`/api/proxy${endpoint}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const text = await response.text();
  const data = text.trim() ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.data?.error ||
      `API failed: ${endpoint} returned ${response.status}`;

    throw new Error(message);
  }

  return data;
}

function extractProductsFromCollectionResponse(data: any) {
  const payload = data?.data || data || {};

  const products =
    Array.isArray(payload.products)
      ? payload.products
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(data?.products)
            ? data.products
            : Array.isArray(data?.items)
              ? data.items
              : [];

  const meta = payload.meta || payload.pagination || data?.meta || data?.pagination || {};

  const total = Number(
    meta.total ||
      payload.total ||
      data?.total ||
      products.length ||
      0,
  );

  const totalPages =
    Number(meta.totalPages || payload.totalPages || data?.totalPages || 0) ||
    Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));

  const collection =
    payload.collection ||
    payload.category ||
    data?.collection ||
    data?.category ||
    null;

  return {
    products,
    total,
    totalPages,
    collection,
  };
}

async function getCollectionProductsBySlug({
  slug,
  page,
}: {
  slug: string;
  page: number;
}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(PRODUCTS_PER_PAGE));

  const encodedSlug = encodeURIComponent(slug);

  const endpoints = [
    `/catalog/collections/${encodedSlug}/products?${params.toString()}`,
    `/catalog/collections/${encodedSlug}?${params.toString()}`,
    `/catalog/categories/${encodedSlug}/products?${params.toString()}`,
  ];

  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const data = await readProxyJson(endpoint);
      return extractProductsFromCollectionResponse(data);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Collection products load failed.");
}

async function addProductToCart(
  product: CatalogProduct,
  selection: ProductSelection,
) {
  const productId = getProductId(product);
  const variant = findMatchingVariant(product, selection);

  if (!productId) {
    throw new Error("Product id missing hai.");
  }

  if (!variant) {
    throw new Error("Selected size/height available nahi hai.");
  }

  const variantId = String(variant.variantId || variant.id || "");

  await addToCart({
    productId,
    variantId,
    quantity: 1,
    deliveryOption: "STANDARD",
  } as any);
}

export function CollectionPageContent({
  collectionSlug = "",
}: CollectionPageContentProps) {
  const searchParams = useSearchParams();

  const colorStory = searchParams.get("colorStory") || "";
  const color = searchParams.get("color") || "";
  const pageParam = Number(searchParams.get("page") || 1);
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [collectionTitle, setCollectionTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selections, setSelections] = useState<Record<string, ProductSelection>>(
    {},
  );
  const [addingId, setAddingId] = useState("");
  const [cartMessage, setCartMessage] = useState("");

  const heading = useMemo(() => {
    if (collectionTitle) return collectionTitle;
    if (collectionSlug) return normalizeTitle(collectionSlug);
    if (colorStory) return `${normalizeTitle(colorStory)} Collection`;
    if (color) return `${normalizeTitle(color)} Collection`;
    return "All Collections";
  }, [collectionTitle, collectionSlug, colorStory, color]);

  useEffect(() => {
    let mounted = true;

    async function loadCollection() {
      try {
        setLoading(true);
        setError("");
        setCartMessage("");

        let rawProducts: CatalogProduct[] = [];
        let responseTotal = 0;
        let responseTotalPages = 1;
        let nextCollectionTitle = "";

        if (collectionSlug) {
          const result = await getCollectionProductsBySlug({
            slug: collectionSlug,
            page: currentPage,
          });

          rawProducts = result.products;
          responseTotal = result.total;
          responseTotalPages = result.totalPages;

          nextCollectionTitle =
            result.collection?.name ||
            result.collection?.title ||
            normalizeTitle(collectionSlug);
        } else {
          const commonQuery = {
            page: currentPage,
            limit: PRODUCTS_PER_PAGE,
            sort: "featured",
          };

          const response =
            colorStory || color
              ? await getCatalogFilteredProducts({
                  ...commonQuery,
                  ...(colorStory ? { colorStory } : {}),
                  ...(color ? { color } : {}),
                })
              : await getCatalogProducts(commonQuery);

          rawProducts = unwrapCatalogProducts(response);

          const data = response?.data || {};
          const pagination = data?.pagination || {};

          responseTotal = Number(
            data?.total ?? pagination?.total ?? rawProducts.length,
          );

          responseTotalPages = Number(
            data?.totalPages ??
              pagination?.totalPages ??
              Math.max(1, Math.ceil(responseTotal / PRODUCTS_PER_PAGE)),
          );
        }

        const visibleProducts = filterPublicVisibleProducts(rawProducts);

        const initialSelections: Record<string, ProductSelection> = {};

        visibleProducts.forEach((product) => {
          const productId = getProductId(product);

          if (!productId) return;

          initialSelections[productId] = getDefaultSelection(product);
        });

        if (!mounted) return;

        setProducts(visibleProducts);
        setTotal(responseTotal);
        setTotalPages(responseTotalPages);
        setSelections(initialSelections);
        setCollectionTitle(nextCollectionTitle);
      } catch (error: any) {
        console.error("Collection load failed:", error);

        if (!mounted) return;

        setProducts([]);
        setTotal(0);
        setTotalPages(1);
        setCollectionTitle("");
        setError(error?.message || "Collection load failed");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCollection();

    return () => {
      mounted = false;
    };
  }, [collectionSlug, colorStory, color, currentPage]);

  function updateSelection(
    product: CatalogProduct,
    key: keyof ProductSelection,
    value: string,
  ) {
    const productId = getProductId(product);

    if (!productId) return;

    setSelections((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || getDefaultSelection(product)),
        [key]: value,
      },
    }));
  }

  async function handleAddToBag(product: CatalogProduct) {
    const productId = getProductId(product);

    if (!productId) return;

    try {
      setAddingId(productId);
      setCartMessage("");

      const selection = selections[productId] || getDefaultSelection(product);

      await addProductToCart(product, selection);

      setCartMessage("Product bag me add ho gaya.");
    } catch (error: any) {
      console.error("Collection add to cart failed:", error);
      setCartMessage(error?.message || "Add to bag failed.");
    } finally {
      setAddingId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#fbf8f1] text-[#15100c]">
      <SiteHeader />

      <section className="border-b border-[#ddd5c9] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <p className="text-[9px] uppercase tracking-[0.42em] text-[#b98262]">
            {collectionSlug ? "Curated Collection" : "Global Collection"}
          </p>

          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-serif text-[44px] italic leading-none tracking-[-0.05em] md:text-[64px]">
                {heading}
              </h1>

              <p className="mt-3 text-[13px] text-[#7a746e]">
                {loading
                  ? "Loading products..."
                  : `${total} products found`}
              </p>
            </div>

            <a
              href="/collection"
              className="w-fit border border-[#15100c] px-5 py-3 text-[10px] uppercase tracking-[0.28em] transition hover:bg-[#15100c] hover:text-white"
            >
              All Collections
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          {loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#ddd5c9] bg-white/70 px-5 py-4 text-sm text-[#6d6760]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading collection products...
            </div>
          ) : null}

          {error ? (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle className="h-5 w-5" />
              {error}
            </div>
          ) : null}

          {cartMessage ? (
            <div className="mb-5 rounded-xl border border-[#ddd5c9] bg-white/80 px-4 py-3 text-sm text-[#6d6760]">
              {cartMessage}
            </div>
          ) : null}

          {!loading && !error && !products.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
              Is collection me koi product nahi mila.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => {
              const productId = getProductId(product);
              const image = getImageFromCatalog(product);
              const title = product.title || product.name || "Product";
              const price = getPriceFromCatalog(product);
              const sizes = getProductSizes(product);
              const heights = getProductHeights(product);
              const selection = selections[productId] || getDefaultSelection(product);
              const detailHref = getProductDetailHref(product, collectionSlug);
              const matchingVariant = findMatchingVariant(product, selection);
              const canAdd = Boolean(matchingVariant && productId);
              const isAdding = addingId === productId;

              return (
                <article key={productId || title} className="group">
                  <a href={detailHref} className="block">
                    <div className="relative h-[390px] overflow-hidden bg-[#eee8df]">
                      {image ? (
                        <img
                          src={image}
                          alt={title}
                          className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.24em] text-[#8b867f]">
                          No image
                        </div>
                      )}

                      <span className="absolute left-4 top-4 bg-[#fbf8f1]/95 px-3 py-2 text-[10px] uppercase tracking-[0.22em]">
                        {product.categoryName ||
                          product.category ||
                          product.productType ||
                          "Collection"}
                      </span>
                    </div>
                  </a>

                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <a
                        href={detailHref}
                        className="line-clamp-2 font-semibold leading-5 transition hover:text-[#b98262]"
                      >
                        {title}
                      </a>

                      <p className="mt-1 text-sm text-[#7a746e]">
                        {product.fabric || product.material || ""}
                      </p>
                    </div>

                    {price ? (
                      <span className="shrink-0 text-sm text-[#b98262]">
                        {price}
                      </span>
                    ) : null}
                  </div>

                  {sizes.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {sizes.slice(0, 6).map((size) => {
                        const active =
                          normalizeCompare(selection.size) ===
                          normalizeCompare(size.label);

                        return (
                          <button
                            key={`${productId}-${size.label}`}
                            type="button"
                            disabled={!size.available}
                            onClick={() =>
                              updateSelection(product, "size", size.label)
                            }
                            className={[
                              "h-8 min-w-[34px] border px-2 text-[10px] uppercase tracking-[0.12em] transition",
                              active
                                ? "border-[#15100c] bg-[#15100c] text-white"
                                : "border-[#d8cfc2] text-[#15100c] hover:border-[#15100c]",
                              !size.available
                                ? "cursor-not-allowed opacity-35"
                                : "",
                            ].join(" ")}
                          >
                            {size.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {heights.length ? (
                    <select
                      value={selection.height}
                      onChange={(event) =>
                        updateSelection(product, "height", event.target.value)
                      }
                      className="mt-4 h-12 w-full border border-[#d8cfc2] bg-[#fbf8f1] px-4 text-[12px] uppercase tracking-[0.16em] text-[#15100c] outline-none transition focus:border-[#15100c]"
                    >
                      {heights.map((height) => (
                        <option
                          key={`${productId}-${height.label}`}
                          value={height.label}
                          disabled={!height.available}
                        >
                          {height.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <div className="mt-4 grid grid-cols-[1fr_48px] gap-3">
                    <button
                      type="button"
                      disabled={!canAdd || isAdding}
                      onClick={() => handleAddToBag(product)}
                      className={[
                        "flex h-12 items-center justify-center gap-2 border text-[10px] uppercase tracking-[0.26em] transition",
                        canAdd
                          ? "border-[#15100c] hover:bg-[#15100c] hover:text-white"
                          : "cursor-not-allowed border-[#d8cfc2] text-[#9d948a] opacity-60",
                      ].join(" ")}
                    >
                      {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingBag className="h-4 w-4" />
                      )}
                      Add to Bag
                    </button>

                    <a
                      href={detailHref}
                      className="flex h-12 items-center justify-center border border-[#15100c] transition hover:bg-[#15100c] hover:text-white"
                      aria-label={`Open ${title}`}
                    >
                      <ArrowUpRight className="h-5 w-5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="mt-12 flex items-center justify-center gap-2 border-t border-[#ddd5c9] pt-8">
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;

                const basePath = collectionSlug
                  ? `/collections/${encodeURIComponent(collectionSlug)}`
                  : "/collection";

                const href = `${basePath}?${new URLSearchParams({
                  ...(colorStory ? { colorStory } : {}),
                  ...(color ? { color } : {}),
                  page: String(page),
                }).toString()}`;

                return (
                  <a
                    key={page}
                    href={href}
                    className={[
                      "flex h-9 w-9 items-center justify-center border text-sm",
                      currentPage === page
                        ? "border-[#15100c] bg-[#15100c] text-white"
                        : "border-[#d8cfc2] hover:border-[#15100c]",
                    ].join(" ")}
                  >
                    {page}
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function CollectionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fbf8f1] text-[#15100c]">
          <p className="text-sm text-[#6d6760]">Loading collection...</p>
        </main>
      }
    >
      <CollectionPageContent />
    </Suspense>
  );
}