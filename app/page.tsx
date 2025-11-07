"use client";
import React, { useEffect, useMemo, useState } from "react";

// ---------- Helpers ----------
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
function formatNumber(n: number, digits = 2) {
  return Number(n).toLocaleString("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// ---------- Mock Data ----------
const TOKEN = {
  symbol: "BTK-ROSARIO-001",
  name: "Depto. 2 amb. — Pellegrini 1234 (Rosario)",
  price: 1000, // ARS referencia por token
  supply: 7000, // 70% tokenizado
  sellerAccount: "BRICKTOK SAS",
  rentAPR: 9.2, // % anual estimado por alquiler
  fees: 0.5, // % fee trading
};
type Row = { id: string; side: "ask" | "bid"; price: number; qty: number };

function seedBook() {
  const mid = TOKEN.price;
  const asks: Row[] = Array.from({ length: 16 }, (_, i) => ({
    price: mid + 1 + i * 2,
    qty: Math.floor(20 + Math.random() * 120),
    side: "ask",
    id: `a${i}`,
  })).sort((a, b) => a.price - b.price);
  const bids: Row[] = Array.from({ length: 16 }, (_, i) => ({
    price: mid - 1 - i * 2,
    qty: Math.floor(20 + Math.random() * 120),
    side: "bid",
    id: `b${i}`,
  })).sort((a, b) => b.price - a.price);
  return { asks, bids };
}

type Trade = {
  id: string;
  price: number;
  qty: number;
  time: string;
  side: "buy" | "sell";
};

// pseudo stream
function useSimulatedFeed(
  setBook: React.Dispatch<React.SetStateAction<{ asks: Row[]; bids: Row[] }>>,
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>
) {
  useEffect(() => {
    const t = setInterval(() => {
      setBook((prev) => {
        const next = { asks: [...prev.asks], bids: [...prev.bids] };
        if (Math.random() > 0.5 && next.asks.length) {
          next.asks[0] = {
            ...next.asks[0],
            qty: Math.max(
              1,
              next.asks[0].qty + (Math.random() > 0.5 ? 5 : -5)
            ),
          };
        } else if (next.bids.length) {
          next.bids[0] = {
            ...next.bids[0],
            qty: Math.max(
              1,
              next.bids[0].qty + (Math.random() > 0.5 ? 5 : -5)
            ),
          };
        }
        return next;
      });

      if (Math.random() > 0.7) {
        setTrades((prev) =>
          [
            {
              id: crypto.randomUUID(),
              price:
                TOKEN.price +
                (Math.random() > 0.5 ? 1 : -1) *
                  (1 + Math.floor(Math.random() * 3)),
              qty: Math.floor(1 + Math.random() * 50),
              time: new Date().toLocaleTimeString("es-AR", { hour12: false }),
              side: Math.random() > 0.5 ? "buy" : "sell",
            },
            ...prev,
          ].slice(0, 40)
        );
      }
    }, 1200);
    return () => clearInterval(t);
  }, [setBook, setTrades]);
}

// ---------- UI ----------
function Header() {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          BrickTok — Mercado de Tokens
        </h1>
        <p className="text-sm opacity-80">
          Compra y venta P2P de participaciones tokenizadas sobre inmuebles.
        </p>
      </div>
      <div className="text-right">
        <div className="text-xs uppercase opacity-70">Token</div>
        <div className="text-lg font-semibold">{TOKEN.symbol}</div>
      </div>
    </div>
  );
}

function TokenInfoCard() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border">
        <div className="text-xs opacity-70">Activo</div>
        <div className="font-semibold">{TOKEN.name}</div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border">
        <div className="text-xs opacity-70">Precio ref.</div>
        <div className="font-semibold">$ {formatNumber(TOKEN.price, 0)}</div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border">
        <div className="text-xs opacity-70">Oferta (70%)</div>
        <div className="font-semibold">
          {formatNumber(TOKEN.supply, 0)} tokens
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border">
        <div className="text-xs opacity-70">Renta estimada</div>
        <div className="font-semibold">
          {formatNumber(TOKEN.rentAPR, 1)}% APR
        </div>
      </div>
    </div>
  );
}

function DepthBar({ side, pct }: { side: "ask" | "bid"; pct: number }) {
  return (
    <div
      className={cn(
        "absolute inset-y-0",
        side === "ask" ? "right-0 bg-red-100" : "left-0 bg-green-100"
      )}
      style={{ width: `${Math.min(100, pct)}%` }}
    />
  );
}

function OrderRow({ r, maxQty }: { r: Row; maxQty: number }) {
  const pct = (r.qty / Math.max(1, maxQty)) * 100;
  return (
    <div className="relative">
      <DepthBar side={r.side === "ask" ? "ask" : "bid"} pct={pct} />
      <div className="grid grid-cols-3 text-xs py-1">
        <div
          className={cn(
            "tabular-nums",
            r.side === "ask" ? "text-red-600" : "text-green-600"
          )}
        >
          $ {formatNumber(r.price, 0)}
        </div>
        <div className="text-right tabular-nums">
          {formatNumber(r.qty, 0)}
        </div>
        <div className="text-right tabular-nums">
          $ {formatNumber(r.price * r.qty, 0)}
        </div>
      </div>
    </div>
  );
}

function OrderBook({ book }: { book: { asks: Row[]; bids: Row[] } }) {
  const maxAskQty = Math.max(...book.asks.map((a) => a.qty), 1);
  const maxBidQty = Math.max(...book.bids.map((b) => b.qty), 1);

  return (
    <div className="grid grid-rows-[1fr_auto_1fr] h-[520px] bg-white rounded-2xl border overflow-hidden">
      <div className="p-3 overflow-auto">
        <div className="grid grid-cols-3 text-[10px] uppercase opacity-60 mb-1">
          <div>Precio</div>
          <div className="text-right">Cantidad</div>
          <div className="text-right">Total</div>
        </div>
        {book.asks
          .slice(0, 14)
          .reverse()
          .map((a) => (
            <OrderRow key={a.id} r={a} maxQty={maxAskQty} />
          ))}
      </div>
      <div className="px-3 py-2 border-y bg-white">
        <div className="flex items-center justify-between text-xs">
          <div className="opacity-60">Último</div>
          <div className="font-semibold">$ {formatNumber(TOKEN.price, 0)}</div>
          <div className="opacity-60">ARS</div>
        </div>
      </div>
      <div className="p-3 overflow-auto">
        <div className="grid grid-cols-3 text-[10px] uppercase opacity-60 mb-1">
          <div>Precio</div>
          <div className="text-right">Cantidad</div>
          <div className="text-right">Total</div>
        </div>
        {book.bids.slice(0, 14).map((b) => (
          <OrderRow key={b.id} r={b} maxQty={maxBidQty} />
        ))}
      </div>
    </div>
  );
}

function RecentTrades({ trades }: { trades: Trade[] }) {
  return (
    <div className="bg-white rounded-2xl p-3 border h-[520px] overflow-auto">
      <div className="text-xs uppercase opacity-70 mb-2">
        Operaciones recientes
      </div>
      <div className="grid grid-cols-3 text-[10px] uppercase opacity-60 mb-1">
        <div>Hora</div>
        <div className="text-right">Precio</div>
        <div className="text-right">Cant.</div>
      </div>
      {trades.map((t) => (
        <div key={t.id} className="grid grid-cols-3 text-xs py-1">
          <div className="tabular-nums">{t.time}</div>
          <div
            className={cn(
              "text-right tabular-nums",
              t.side === "buy" ? "text-green-600" : "text-red-600"
            )}
          >
            $ {formatNumber(t.price, 0)}
          </div>
          <div className="text-right tabular-nums">
            {formatNumber(t.qty, 0)}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaceOrderPanel({
  onPlace,
}: {
  onPlace: (p: { side: "buy" | "sell"; price: number; qty: number }) => void;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState<number>(TOKEN.price);
  const [qty, setQty] = useState<number>(10);
  const total = useMemo(() => price * qty, [price, qty]);

  return (
    <div className="bg-white rounded-2xl p-4 border">
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs uppercase opacity-70">Nueva orden (límite)</div>
        <div className="flex gap-2">
          <button
            onClick={() => setSide("buy")}
            className={cn(
              "px-3 py-1 rounded-full text-xs border",
              side === "buy"
                ? "bg-green-600 text-white border-green-600"
                : "hover:bg-green-50"
            )}
          >
            Comprar
          </button>
          <button
            onClick={() => setSide("sell")}
            className={cn(
              "px-3 py-1 rounded-full text-xs border",
              side === "sell"
                ? "bg-red-600 text-white border-red-600"
                : "hover:bg-red-50"
            )}
          >
            Vender
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm flex flex-col gap-1">
          <span className="opacity-70">Precio (ARS)</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="border rounded-xl px-3 py-2 bg-white"
          />
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span className="opacity-70">Cantidad (tokens)</span>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="border rounded-xl px-3 py-2 bg-white"
          />
        </label>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <div className="opacity-70">Total</div>
        <div className="font-semibold">$ {formatNumber(total, 0)}</div>
      </div>
      <button
        onClick={() => onPlace({ side, price, qty })}
        className={cn(
          "mt-4 w-full py-2 rounded-xl font-medium shadow-sm",
          side === "buy" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}
      >
        {side === "buy" ? "Colocar orden de compra" : "Colocar orden de venta"}
      </button>
      <p className="text-[11px] opacity-60 mt-2">
        Fee: {TOKEN.fees}% • Mínimo por orden: $1.000 • Sólo órdenes límite en
        este MVP.
      </p>
    </div>
  );
}

function DepthPreview({ book }: { book: { asks: Row[]; bids: Row[] } }) {
  const levels = 10;
  const asks = book.asks.slice(0, levels).reduce((acc, a) => acc + a.qty, 0);
  const bids = book.bids.slice(0, levels).reduce((acc, b) => acc + b.qty, 0);
  const total = Math.max(1, asks + bids);
  const askPct = (asks / total) * 100;
  const bidPct = (bids / total) * 100;

  return (
    <div className="bg-white rounded-2xl p-4 border">
      <div className="text-xs uppercase opacity-70 mb-2">
        Profundidad (10 niveles)
      </div>
      <div className="flex h-6 w-full overflow-hidden rounded-full border">
        <div className="bg-green-500/70" style={{ width: `${bidPct}%` }} />
        <div className="bg-red-500/70" style={{ width: `${askPct}%` }} />
      </div>
      <div className="flex justify-between text-xs mt-2">
        <span className="text-green-700">Bids: {formatNumber(bids, 0)}</span>
        <span className="text-red-700">Asks: {formatNumber(asks, 0)}</span>
      </div>
    </div>
  );
}

export default function Page() {
  const [book, setBook] = useState(seedBook());
  const [trades, setTrades] = useState<Trade[]>([]);
  useSimulatedFeed(setBook, setTrades);

  const handlePlace = ({
    side,
    price,
    qty,
  }: {
    side: "buy" | "sell";
    price: number;
    qty: number;
  }) => {
    if (!price || !qty || price < 1 || qty < 1) return;
    if (side === "buy") {
      setBook((prev) => ({
        ...prev,
        bids: [
          { id: crypto.randomUUID(), side: "bid", price, qty },
          ...prev.bids,
        ].sort((a, b) => b.price - a.price),
      }));
    } else {
      setBook((prev) => ({
        ...prev,
        asks: [
          { id: crypto.randomUUID(), side: "ask", price, qty },
          ...prev.asks,
        ].sort((a, b) => a.price - b.price),
      }));
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header />
        <TokenInfoCard />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <OrderBook book={book} />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <PlaceOrderPanel onPlace={handlePlace} />
            <DepthPreview book={book} />
          </div>
          <div className="lg:col-span-1">
            <RecentTrades trades={trades} />
          </div>
        </div>
      </div>
    </div>
  );
}
