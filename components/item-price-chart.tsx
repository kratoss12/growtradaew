"use client";

type PricePoint = {
  date: string;
  buy: number | null;
  sell: number | null;
};

export default function ItemPriceChart({
  data,
}: {
  data: PricePoint[];
}) {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-zinc-300">
        No price history yet.
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const padding = 40;

  const values = data.flatMap((d) =>
    [d.buy, d.sell].filter((v): v is number => v !== null)
  );

  const min = Math.min(...values);
  const max = Math.max(...values);

  const getX = (index: number) =>
    padding + (index / (data.length - 1)) * (width - padding * 2);

  const getY = (value: number) =>
    height -
    padding -
    ((value - min) / (max - min || 1)) * (height - padding * 2);

  function buildPath(type: "buy" | "sell") {
    return data
      .map((point, i) => {
        const value = point[type];
        if (value == null) return null;
        const x = getX(i);
        const y = getY(value);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">Price History</h3>
        <p className="text-sm text-zinc-300">
          Median buy and sell prices over time
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: "260px" }}
      >
        {/* grid */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + (i / 4) * (height - padding * 2);
          return (
            <line
              key={i}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="#27272a"
              strokeWidth="1"
            />
          );
        })}

        {/* SELL line */}
        <path
          d={buildPath("sell")}
          fill="none"
          stroke="#f87171"
          strokeWidth="3"
        />

        {/* BUY line */}
        <path
          d={buildPath("buy")}
          fill="none"
          stroke="#34d399"
          strokeWidth="3"
        />
      </svg>

      <div className="mt-3 flex gap-4 text-sm">
        <span className="text-emerald-300 font-bold">Buy</span>
        <span className="text-red-300 font-bold">Sell</span>
      </div>
    </div>
  );
}