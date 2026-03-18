"use client";

import { useEffect, useState } from "react";

type QuotaData = {
  limit: number | null;
  used: number;
  remaining: number | null;
  isUnlimited?: boolean;
};

export default function PostListingStats({
  listingMode,
}: {
  listingMode: string;
}) {
  const [quota, setQuota] = useState<QuotaData | null>(null);

  useEffect(() => {
    async function loadQuota() {
      try {
        const res = await fetch("/api/listings/quota", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        setQuota(data);
      } catch {
        // ignore
      }
    }

    loadQuota();
  }, []);

  const usedToday = quota?.used ?? 0;

  const remainingToday =
    quota?.isUnlimited || quota?.remaining == null
      ? "Unlimited"
      : `${quota.remaining}`;

  const dailyLimit =
    quota?.isUnlimited || quota?.limit == null
      ? "Unlimited"
      : `${quota.limit}`;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-wider text-zinc-400">
          Daily limit
        </p>
        <p className="mt-2 text-3xl font-extrabold text-white">{dailyLimit}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-wider text-zinc-400">
          Used today
        </p>
        <p className="mt-2 text-3xl font-extrabold text-white">{usedToday}</p>
        <p className="mt-2 text-sm text-zinc-300">
          Remaining today: {remainingToday}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-wider text-zinc-400">
          Listing mode
        </p>
        <p className="mt-2 text-sm font-bold text-white">{listingMode}</p>
      </div>
    </div>
  );
}