"use client";

import { useState } from "react";

export default function AdminItemImageForm({
  itemId,
  currentImageUrl,
}: {
  itemId: number;
  currentImageUrl: string | null;
}) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || "");
  const [message, setMessage] = useState("");

  async function handleSave() {
    setMessage("");

    const res = await fetch("/api/admin/item-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemId,
        imageUrl,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage("Saved");
    } else {
      setMessage(data.error || "Something went wrong");
    }
  }

  return (
    <div style={{ marginTop: "12px" }}>
      <label style={{ display: "block", marginBottom: "8px" }}>
        Item Image URL / filename
      </label>

      <input
        type="text"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Example: angel-wings.webp"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "10px",
          marginBottom: "10px",
        }}
      />

      <div>
        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            cursor: "pointer",
            background: "white",
          }}
        >
          Save Image
        </button>
      </div>

      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}