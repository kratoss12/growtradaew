"use client";

import { useEffect, useState } from "react";
import ListingQuota from "../../components/listing-quota";

type Item = {
  id: number;
  name: string;
  category: string;
};

export default function PostPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [listingType, setListingType] = useState("buy");
  const [quantity, setQuantity] = useState("");
  const [priceWl, setPriceWl] = useState("");
  const [worldName, setWorldName] = useState("");
  const [ingameName, setIngameName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadItems() {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(data.items || []);
      if (data.items?.length > 0) {
        setItemId(String(data.items[0].id));
      }
    }

    loadItems();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item_id: itemId,
        listing_type: listingType,
        quantity,
        price_wl: priceWl,
        world_name: worldName,
        ingame_name: ingameName,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage(data.message || "Listing submitted successfully");
      setQuantity("");
      setPriceWl("");
      setWorldName("");
      setIngameName("");
      window.location.reload();
    } else {
      setMessage(data.error || "Something went wrong");
    }
  }

  return (
    <main style={{ padding: "40px" }}>
      <h1>Post Listing</h1>

      <ListingQuota />

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "12px",
          maxWidth: "400px",
          marginTop: "20px",
        }}
      >
        <label>
          Item:
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            style={{ display: "block", width: "100%", padding: "8px", marginTop: "4px" }}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Type:
          <select
            value={listingType}
            onChange={(e) => setListingType(e.target.value)}
            style={{ display: "block", width: "100%", padding: "8px", marginTop: "4px" }}
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>

        <label>
          Quantity:
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            style={{ display: "block", width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>

        <label>
          Price in WL:
          <input
            type="number"
            value={priceWl}
            onChange={(e) => setPriceWl(e.target.value)}
            placeholder="Enter price in WL"
            style={{ display: "block", width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>

        <label>
          World Name:
          <input
            type="text"
            value={worldName}
            onChange={(e) => setWorldName(e.target.value)}
            placeholder="Enter world name"
            style={{ display: "block", width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>

        <label>
          In-Game Name:
          <input
            type="text"
            value={ingameName}
            onChange={(e) => setIngameName(e.target.value)}
            placeholder="Enter in-game name"
            style={{ display: "block", width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>

        <button type="submit" style={{ padding: "10px", cursor: "pointer" }}>
          Submit Listing
        </button>
      </form>

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}
    </main>
  );
}