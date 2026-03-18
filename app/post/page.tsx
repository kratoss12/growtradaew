"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PostListingStats from "../../components/post-listing-stats";

type Item = {
  id: number;
  name: string;
  category: string;
};

type ListingType = "buy" | "sell";
type ListingCategory = "item" | "world";
type PricingMode = "per_item" | "per_wl";
type Currency = "WL" | "DL" | "BGL";

function normalizeSearchValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export default function PostPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showItemResults, setShowItemResults] = useState(false);
  const itemSearchBoxRef = useRef<HTMLDivElement | null>(null);

  const [listingCategory, setListingCategory] = useState<ListingCategory>("item");
  const [listingType, setListingType] = useState<ListingType>("sell");
  const [pricingMode, setPricingMode] = useState<PricingMode>("per_item");

  const [quantity, setQuantity] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<Currency>("WL");

  const [worldName, setWorldName] = useState("");
  const [worldSaleName, setWorldSaleName] = useState("");
  const [worldSaleDescription, setWorldSaleDescription] = useState("");
  const [ingameName, setIngameName] = useState("");
  const [stock, setStock] = useState("");

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadItems() {
      const res = await fetch("/api/items");
      const data = await res.json();
      const loadedItems = (data.items || []).filter((item: any) => item.is_official !== false);
      setItems(loadedItems);

      if (loadedItems.length > 0) {
        setItemId(String(loadedItems[0].id));
        setItemSearch(loadedItems[0].name);
      }
    }

    loadItems();
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!itemSearchBoxRef.current) return;

      if (!itemSearchBoxRef.current.contains(event.target as Node)) {
        setShowItemResults(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const normalizedSearch = normalizeSearchValue(itemSearch);

  const selectedItem = items.find((item) => String(item.id) === itemId) || null;

  const filteredItems =
    normalizedSearch === ""
      ? items.slice(0, 12)
      : items
          .filter((item) =>
            item.name.toLowerCase().includes(normalizedSearch.toLowerCase())
          )
          .slice(0, 12);

  const exactMatchedItem =
    normalizedSearch === ""
      ? null
      : items.find(
          (item) => item.name.toLowerCase() === normalizedSearch.toLowerCase()
        ) || null;

  const canCreateAndPostNewItem =
    listingCategory === "item" &&
    normalizedSearch.length >= 2 &&
    !exactMatchedItem &&
    filteredItems.length === 0;

  const effectivePriceWl = useMemo(() => {
    const amount = Number(priceAmount);
    if (!amount || amount <= 0) return 0;

    if (pricingMode === "per_item") {
      if (priceCurrency === "WL") return amount;
      if (priceCurrency === "DL") return amount * 100;
      if (priceCurrency === "BGL") return amount * 10000;
    }

    if (listingCategory === "item" && pricingMode === "per_wl") {
      return 1 / amount;
    }

    return 0;
  }, [priceAmount, priceCurrency, pricingMode, listingCategory]);

  const requiresWorld =
    listingCategory === "item" &&
    listingType === "sell" &&
    effectivePriceWl > 0 &&
    effectivePriceWl <= 20000;

  const discordOnly =
    (listingCategory === "item" &&
      listingType === "sell" &&
      effectivePriceWl > 20000) ||
    listingCategory === "world";

  const highValueSell =
    listingType === "sell" &&
    pricingMode === "per_item" &&
    effectivePriceWl >= 500000;

  const listingModeLabel =
    listingCategory === "world"
      ? "World Sale"
      : listingType === "buy"
      ? "Item Buy Listing"
      : "Item Sell Listing";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (listingCategory === "item" && !itemId && !canCreateAndPostNewItem) {
      setMessage(
        "Please select an existing item, or type a new item name so it can be posted for admin review."
      );
      return;
    }

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listing_category: listingCategory,
        item_id: listingCategory === "item" && itemId ? itemId : null,
        requested_item_name:
          listingCategory === "item" && !itemId ? normalizedSearch : null,
        listing_type: listingCategory === "world" ? "sell" : listingType,
        quantity: listingCategory === "item" && listingType === "buy" ? quantity : null,
        pricing_mode: listingCategory === "world" ? "per_item" : pricingMode,
        price_amount: priceAmount,
        price_currency: pricingMode === "per_item" ? priceCurrency : "WL",
        world_name:
          listingCategory === "item" && listingType === "sell" && requiresWorld
            ? worldName
            : null,
        world_sale_name: listingCategory === "world" ? worldSaleName : null,
        world_sale_description:
          listingCategory === "world" ? worldSaleDescription : null,
        ingame_name: ingameName,
        stock: listingCategory === "item" && listingType === "sell" && stock ? stock : null,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage(data.message || "Listing created successfully.");
      setQuantity("");
      setPriceAmount("");
      setWorldName("");
      setWorldSaleName("");
      setWorldSaleDescription("");
      setIngameName("");
      setStock("");
      window.location.reload();
    } else {
      setMessage(data.error || "Something went wrong.");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-950 via-emerald-950 to-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                Create Listing
              </p>
              <h1 className="text-3xl font-extrabold">Post a new trade</h1>
              <p className="mt-2 max-w-2xl text-zinc-200">
                Create item and world listings with clearer Growtopia-style pricing,
                Discord contact flow, and safer high-value verification.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <PostListingStats listingMode={listingModeLabel} />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)] backdrop-blur-sm"
        >
          <div>
            <p className="mb-3 text-sm font-medium text-zinc-300">Category</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setListingCategory("item")}
                className={`rounded-xl px-5 py-3 font-semibold transition ${
                  listingCategory === "item"
                    ? "bg-cyan-400 text-black"
                    : "border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/10"
                }`}
              >
                Item Listing
              </button>

              <button
                type="button"
                onClick={() => {
                  setListingCategory("world");
                  setListingType("sell");
                  setPricingMode("per_item");
                }}
                className={`rounded-xl px-5 py-3 font-semibold transition ${
                  listingCategory === "world"
                    ? "bg-purple-400 text-black"
                    : "border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/10"
                }`}
              >
                Sell World
              </button>
            </div>
          </div>

          {listingCategory === "item" ? (
            <>
              <div>
                <p className="mb-3 text-sm font-medium text-zinc-300">Listing type</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setListingType("sell")}
                    className={`rounded-xl px-5 py-3 font-semibold transition ${
                      listingType === "sell"
                        ? "bg-red-400 text-black"
                        : "border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/10"
                    }`}
                  >
                    Sell
                  </button>

                  <button
                    type="button"
                    onClick={() => setListingType("buy")}
                    className={`rounded-xl px-5 py-3 font-semibold transition ${
                      listingType === "buy"
                        ? "bg-emerald-400 text-black"
                        : "border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/10"
                    }`}
                  >
                    Buy
                  </button>
                </div>
              </div>

              <div ref={itemSearchBoxRef} className="relative">
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Search item
                </label>

                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemResults(true);
                    if (
                      selectedItem &&
                      e.target.value.trim().toLowerCase() !==
                        selectedItem.name.trim().toLowerCase()
                    ) {
                      setItemId("");
                    }
                  }}
                  onFocus={() => setShowItemResults(true)}
                  placeholder="Search the item you want..."
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-zinc-400"
                />

                {selectedItem && itemId ? (
                  <p className="mt-2 text-sm text-zinc-300">
                    Selected:{" "}
                    <span className="font-semibold text-white">{selectedItem.name}</span>
                    {selectedItem.category ? (
                      <span className="text-zinc-400"> · {selectedItem.category}</span>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">
                    Select an official item, or type a missing item to post it as pending review.
                  </p>
                )}

                {showItemResults ? (
                  <div className="absolute left-0 right-0 top-[100%] z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-md">
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setItemId(String(item.id));
                            setItemSearch(item.name);
                            setShowItemResults(false);
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-white/10"
                        >
                          <span className="font-semibold text-white">{item.name}</span>
                          <span className="text-sm text-zinc-400">{item.category}</span>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-xl px-3 py-3 text-sm text-zinc-400">
                        No official items found.
                      </div>
                    )}

                    {canCreateAndPostNewItem ? (
                      <div className="mt-2 border-t border-white/10 pt-2">
                        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-3">
                          <span className="block font-semibold text-cyan-300">
                            New item will be posted as: "{normalizedSearch}"
                          </span>
                          <span className="mt-1 block text-sm text-zinc-300">
                            This item is not official yet, but your listing will still go live in the marketplace and admin can approve it later.
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-zinc-300">Pricing style</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setPricingMode("per_item")}
                    className={`rounded-xl px-5 py-3 font-semibold transition ${
                      pricingMode === "per_item"
                        ? "bg-cyan-400 text-black"
                        : "border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/10"
                    }`}
                  >
                    World Locks per item
                  </button>

                  <button
                    type="button"
                    onClick={() => setPricingMode("per_wl")}
                    className={`rounded-xl px-5 py-3 font-semibold transition ${
                      pricingMode === "per_wl"
                        ? "bg-cyan-400 text-black"
                        : "border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/10"
                    }`}
                  >
                    Items per World Lock
                  </button>
                </div>
              </div>

              {pricingMode === "per_item" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Price per item
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={priceAmount}
                      onChange={(e) => setPriceAmount(e.target.value)}
                      placeholder="Example: 5"
                      className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                    />

                    <select
                      value={priceCurrency}
                      onChange={(e) => setPriceCurrency(e.target.value as Currency)}
                      className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                    >
                      <option value="WL">WL</option>
                      <option value="DL">DL</option>
                      <option value="BGL">BGL</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Items per 1 WL
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    placeholder="Example: 60"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                  />
                </div>
              )}

              {listingType === "buy" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Wanted quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Example: 10"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                  />
                </div>
              ) : null}

              {listingType === "sell" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Stock (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="Example: 500"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                  />
                </div>
              ) : null}

              {listingType === "sell" && requiresWorld ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    World name
                  </label>
                  <input
                    type="text"
                    value={worldName}
                    onChange={(e) => setWorldName(e.target.value)}
                    placeholder="Where buyers can find your vend"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  World name
                </label>
                <input
                  type="text"
                  value={worldSaleName}
                  onChange={(e) => setWorldSaleName(e.target.value)}
                  placeholder="Example: BUYCASTLE"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  World price
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    placeholder="Example: 80"
                    className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                  />

                  <select
                    value={priceCurrency}
                    onChange={(e) => setPriceCurrency(e.target.value as Currency)}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                  >
                    <option value="WL">WL</option>
                    <option value="DL">DL</option>
                    <option value="BGL">BGL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Description
                </label>
                <textarea
                  value={worldSaleDescription}
                  onChange={(e) => setWorldSaleDescription(e.target.value)}
                  maxLength={500}
                  rows={5}
                  placeholder="Describe the world, what it contains, design, rarity, vend setup, farms, etc."
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                />
                <p className="mt-2 text-xs text-zinc-400">
                  {worldSaleDescription.length}/500 characters
                </p>
              </div>
            </>
          )}

          {discordOnly && !highValueSell ? (
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4">
              <p className="font-semibold text-yellow-300">
                Discord contact listing
              </p>
              <p className="mt-1 text-sm text-zinc-200">
                Buyers will contact you on Discord instead of visiting a world.
              </p>
            </div>
          ) : null}

          {highValueSell ? (
            <div className="rounded-2xl border border-green-400/30 bg-green-400/10 p-4">
              <p className="font-semibold text-green-300">
                Verified high-value listing
              </p>
              <p className="mt-1 text-sm text-zinc-200">
                Listings worth 50 BGL or more require a 1 BGL deposit, a 20-minute confirmation window, and admin approval before they go live.
              </p>
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              In-game name
            </label>
            <input
              type="text"
              value={ingameName}
              onChange={(e) => setIngameName(e.target.value)}
              placeholder="Your Growtopia name"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-200">
            <p>
              <span className="font-semibold text-white">Preview:</span>{" "}
              {listingCategory === "world"
                ? `${priceAmount || "0"} ${priceCurrency} for world ${worldSaleName || "WORLDNAME"}`
                : pricingMode === "per_item"
                ? `${priceAmount || "0"} ${priceCurrency} per item`
                : `${priceAmount || "0"} items per 1 WL`}
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-400 py-3 font-bold text-black transition hover:bg-emerald-300"
          >
            Post Listing
          </button>
        </form>

        {message ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-zinc-200 backdrop-blur-sm">
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}