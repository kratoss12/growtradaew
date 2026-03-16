"use client";

import { useEffect, useState } from "react";

type QuotaData = {
  limit: number;
  used: number;
  remaining: number;
};

export default function ListingQuota() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQuota() {
      try {
        const res = await fetch("/api/listings/quota", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load listing quota");
        }

        const data = await res.json();
        setQuota(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadQuota();
  }, []);

  if (loading) {
    return <p style={{ marginTop: "12px" }}>Loading listing quota...</p>;
  }

  if (!quota) {
    return <p style={{ marginTop: "12px" }}>Could not load listing quota.</p>;
  }

  return (
    <div
      style={{
        marginTop: "16px",
        marginBottom: "20px",
        padding: "16px",
        border: "1px solid #ccc",
        borderRadius: "12px",
        maxWidth: "400px",
      }}
    >
      <p style={{ margin: "4px 0" }}>
        <strong>Daily listing limit:</strong> {quota.limit}
      </p>
      <p style={{ margin: "4px 0" }}>
        <strong>Used today:</strong> {quota.used}
      </p>
      <p style={{ margin: "4px 0" }}>
        <strong>Remaining today:</strong> {quota.remaining}
      </p>
    </div>
  );
}