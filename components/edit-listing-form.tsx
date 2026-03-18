"use client";

import { useMemo, useState } from "react";

type Item = {
  id: number;
  name: string;
  category: string;
};

type ListingType = "buy" | "sell";
type ListingCategory = "item" | "world";
type PricingMode = "per_item" | "per_wl";
type Currency = "WL" | "DL" | "BGL";

type ListingData = {
  id: number;
  listing_category: ListingCategory;
  item_id: number | null;
  listing_type: ListingType;
  quantity: number | null;
  price_amount: number | null;
  price_currency: string | null;
  pricing_mode: PricingMode;
  stock: number | null;
  world_name: string | null;
  world_sale_name: string | null;
  world_sale_description: string | null;
  ingame_name: string | null;
};

export default function EditListingForm({
  listing,
  items,
}: {
  listing: ListingData;
  items: Item[];
}) {
  const [listingCategory] = useState<ListingCategory>(listing.listing_category);
  const [itemId, setItemId] = useState(String(listing.item_id || ""));
  const [listingType, setListingType] = useState<ListingType>(listing.listing_type);
  const [pricingMode, setPricingMode] = useState<PricingMode>(
    listing.pricing_mode || "per_item"
  );

  const [quantity, setQuantity] = useState(
    listing.quantity ? String(listing.quantity) : ""
  );
  const [priceAmount, setPriceAmount] = useState(
    listing.price_amount ? String(listing.price_amount) : ""
  );
  const [priceCurrency, setPriceCurrency] = useState<Currency>(
    (listing.price_currency as Currency) || "WL"
  );

  const [worldName, setWorldName] = useState(listing.world_name || "");
  const [worldSaleName, setWorldSaleName] = useState(listing.world_sale_name || "");
  const [worldSaleDescription, setWorldSaleDescription] = useState(
    listing.world_sale_description || ""
  );
  const [ingameName, setIngameName] = useState(listing.ingame_name || "");
  const [stock, setStock] = useState(listing.stock ? String(listing.stock) : "");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const res = await fetch("/api/listings/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listing_id: listing.id,
        listing_category: listingCategory,
        item_id: listingCategory === "item" ? itemId : null,
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
    setLoading(false);
    setMessage(data.message || data.error || "Done");

    if (res.ok) {
      window.location.href = "/my-listings";
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
    >
      <div>
        <p className="mb-3 text-sm font-medium text-zinc-400">Category</p>
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white">
          {listingCategory === "world" ? "Sell World" : "Item Listing"}
        </div>
      </div>

      {listingCategory === "item" ? (
        <>
          <div>
            <p className="mb-3 text-sm font-medium text-zinc-400">Listing type</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setListingType("sell")}
                className={`rounded-xl px-5 py-3 font-semibold transition ${
                  listingType === "sell"
                    ? "bg-red-500 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                Sell
              </button>

              <button
                type="button"
                onClick={() => setListingType("buy")}
                className={`rounded-xl px-5 py-3 font-semibold transition ${
                  listingType === "buy"
                    ? "bg-green-500 text-black"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                Buy
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Item
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-zinc-400">Pricing style</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPricingMode("per_item")}
                className={`rounded-xl px-5 py-3 font-semibold transition ${
                  pricingMode === "per_item"
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                World Locks per item
              </button>

              <button
                type="button"
                onClick={() => setPricingMode("per_wl")}
                className={`rounded-xl px-5 py-3 font-semibold transition ${
                  pricingMode === "per_wl"
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                Items per World Lock
              </button>
            </div>
          </div>

          {pricingMode === "per_item" ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-400">
                Price per item
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
                />

                <select
                  value={priceCurrency}
                  onChange={(e) => setPriceCurrency(e.target.value as Currency)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
                >
                  <option value="WL">WL</option>
                  <option value="DL">DL</option>
                  <option value="BGL">BGL</option>
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-400">
                Items per 1 WL
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
              />
            </div>
          )}

          {listingType === "buy" ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-400">
                Wanted quantity
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
              />
            </div>
          ) : null}

          {listingType === "sell" ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-400">
                Stock (optional)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
              />
            </div>
          ) : null}

          {listingType === "sell" && requiresWorld ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-400">
                World name
              </label>
              <input
                type="text"
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
              />
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              World name
            </label>
            <input
              type="text"
              value={worldSaleName}
              onChange={(e) => setWorldSaleName(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              World price
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                min="1"
                step="1"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
              />

              <select
                value={priceCurrency}
                onChange={(e) => setPriceCurrency(e.target.value as Currency)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
              >
                <option value="WL">WL</option>
                <option value="DL">DL</option>
                <option value="BGL">BGL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Description
            </label>
            <textarea
              value={worldSaleDescription}
              onChange={(e) => setWorldSaleDescription(e.target.value)}
              maxLength={500}
              rows={5}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
            />
            <p className="mt-2 text-xs text-zinc-500">
              {worldSaleDescription.length}/500 characters
            </p>
          </div>
        </>
      )}

      {discordOnly && !highValueSell ? (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="font-semibold text-yellow-300">
            Discord contact listing
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            Buyers will contact you on Discord instead of visiting a world.
          </p>
        </div>
      ) : null}

      {highValueSell ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <p className="font-semibold text-green-300">
            Verified high-value listing
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            Listings worth 50 BGL or more require a 1 BGL deposit, a 20-minute confirmation window, and admin approval before they go live.
          </p>
        </div>
      ) : null}

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-400">
          In-game name
        </label>
        <input
          type="text"
          value={ingameName}
          onChange={(e) => setIngameName(e.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-800/60 p-4 text-sm text-zinc-300">
        <p>
          <span className="font-semibold text-white">Preview:</span>{" "}
          {listingCategory === "world"
            ? `${priceAmount || "0"} ${priceCurrency} for world ${worldSaleName || "WORLDNAME"}`
            : pricingMode === "per_item"
            ? `${priceAmount || "0"} ${priceCurrency} per item`
            : `${priceAmount || "0"} items per 1 WL`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-green-500 px-6 py-3 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        <a
          href="/my-listings"
          className="rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 font-bold text-white transition hover:bg-zinc-700"
        >
          Cancel
        </a>
      </div>

      {message ? (
        <p className="text-sm text-zinc-300">{message}</p>
      ) : null}
    </form>
  );
}