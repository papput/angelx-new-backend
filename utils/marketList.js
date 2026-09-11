const axios = require("axios");

const MARKET_COINS = [
  { symbol: "MATIC", id: "polygon-ecosystem-token", fallbackId: "matic-network" },
  { symbol: "SHIB", id: "shiba-inu" },
  { symbol: "FIL", id: "filecoin" },
  { symbol: "EOS", id: "eos" },
  { symbol: "DOT", id: "polkadot" },
  { symbol: "USDT", id: "tether" },
  { symbol: "DOGE", id: "dogecoin" },
  { symbol: "BTC", id: "bitcoin" },
  { symbol: "SOL", id: "solana" },
  { symbol: "TON", id: "the-open-network" },
];

const CACHE_TTL_MS = 60 * 1000;
let cache = { at: 0, data: null };

function formatUsdPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) {
    return `$${n.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}`;
  }
  if (n >= 1) {
    return `$${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (n >= 0.01) {
    return `$${n.toFixed(4)}`;
  }
  return `$${n.toFixed(8).replace(/\.?0+$/, "")}`;
}

function formatUsdVolume(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
}

function formatChange(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return { change: "—", changeClass: "green" };
  }
  const rounded = Math.abs(n).toFixed(2);
  if (n > 0) return { change: `+${rounded}%`, changeClass: "green" };
  if (n < 0) return { change: `-${rounded}%`, changeClass: "red" };
  return { change: `${rounded}%`, changeClass: "green" };
}

async function fetchMarketListFromCoinGecko() {
  if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  const apiKey = process.env.COINGECKO_API_KEY || process.env.CG_DEMO_API_KEY;
  const ids = [
    ...new Set(
      MARKET_COINS.flatMap((c) =>
        c.fallbackId ? [c.id, c.fallbackId] : [c.id],
      ),
    ),
  ].join(",");

  const url = "https://api.coingecko.com/api/v3/coins/markets";
  const headers = { Accept: "application/json" };
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  const { data } = await axios.get(url, {
    headers,
    params: {
      vs_currency: "usd",
      ids,
      order: "market_cap_desc",
      per_page: 50,
      page: 1,
      sparkline: false,
      price_change_percentage: "24h",
    },
    timeout: 15000,
  });

  if (!Array.isArray(data)) {
    throw new Error("Unexpected CoinGecko response");
  }

  const byId = new Map(data.map((coin) => [coin.id, coin]));

  const markets = MARKET_COINS.map((coin) => {
    const row = byId.get(coin.id) || (coin.fallbackId ? byId.get(coin.fallbackId) : null);
    if (!row) {
      return {
        symbol: coin.symbol,
        name: coin.symbol,
        price: "—",
        vol: "—",
        change: "—",
        changeClass: "green",
        rawPrice: null,
        rawVolume: null,
        rawChange: null,
      };
    }

    const { change, changeClass } = formatChange(row.price_change_percentage_24h);
    return {
      symbol: coin.symbol,
      name: coin.symbol,
      price: formatUsdPrice(row.current_price),
      vol: formatUsdVolume(row.total_volume),
      change,
      changeClass,
      rawPrice: row.current_price,
      rawVolume: row.total_volume,
      rawChange: row.price_change_percentage_24h,
    };
  });

  cache = { at: Date.now(), data: markets };
  return markets;
}

module.exports = {
  MARKET_COINS,
  fetchMarketListFromCoinGecko,
};
