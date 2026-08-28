import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export interface HistoricalPrice {
  trading_date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

/**
 * Get one year's daily historical data for any valid
 * Yahoo Finance ticker.
 *
 * Examples:
 * RELIANCE.NS
 * TCS.NS
 * INFY.NS
 * HDFCBANK.NS
 * SBIN.NS
 * AAPL
 * MSFT
 */
export async function getHistoricalPrices(
  symbol: string
): Promise<HistoricalPrice[]> {
  const cleanSymbol = symbol.trim().toUpperCase();

  if (!cleanSymbol) {
    throw new Error("Stock symbol is required");
  }

  const period1 = new Date();

  // One year of history
  period1.setFullYear(period1.getFullYear() - 1);

  const period2 = new Date();

  const result = await yahooFinance.chart(cleanSymbol, {
    period1,
    period2,
    interval: "1d",
  });

  if (!result || !result.quotes || result.quotes.length === 0) {
    throw new Error(
      `No market data found for ${cleanSymbol}. Check the Yahoo Finance symbol.`
    );
  }

  return result.quotes
    .filter(
      (row) =>
        row.date &&
        row.open !== null &&
        row.open !== undefined &&
        row.high !== null &&
        row.high !== undefined &&
        row.low !== null &&
        row.low !== undefined &&
        row.close !== null &&
        row.close !== undefined
    )
    .map((row) => ({
      trading_date: new Date(row.date).toISOString().split("T")[0],

      open_price: Number(row.open),

      high_price: Number(row.high),

      low_price: Number(row.low),

      close_price: Number(row.close),

      volume: Number(row.volume ?? 0),
    }));
}

/**
 * Get the latest quote information.
 *
 * This is useful for dashboard/search results.
 */
export async function getStockQuote(
  symbol: string
): Promise<StockQuote> {
  const cleanSymbol = symbol.trim().toUpperCase();

  if (!cleanSymbol) {
    throw new Error("Stock symbol is required");
  }

  const quote = await yahooFinance.quote(cleanSymbol);

  if (!quote) {
    throw new Error(`Stock ${cleanSymbol} was not found.`);
  }

  const price = Number(
    quote.regularMarketPrice ??
      quote.postMarketPrice ??
      quote.preMarketPrice ??
      0
  );

  const change = Number(
    quote.regularMarketChange ??
      quote.postMarketChange ??
      0
  );

  const changePercent = Number(
    quote.regularMarketChangePercent ??
      quote.postMarketChangePercent ??
      0
  );

  if (!price) {
    throw new Error(
      `No current price available for ${cleanSymbol}.`
    );
  }

  return {
    symbol: cleanSymbol,

    name:
      quote.longName ||
      quote.shortName ||
      cleanSymbol,

    price,

    change,

    changePercent,
  };
}

/**
 * Get latest quote by using historical data.
 *
 * This is a fallback if quote data is temporarily unavailable.
 */
export async function getLatestFromHistory(
  symbol: string
): Promise<StockQuote> {
  const history = await getHistoricalPrices(symbol);

  if (history.length === 0) {
    throw new Error(`No historical data found for ${symbol}`);
  }

  const latest = history[history.length - 1];

  const previous =
    history.length > 1
      ? history[history.length - 2]
      : null;

  const price = latest.close_price;

  const change = previous
    ? price - previous.close_price
    : 0;

  const changePercent =
    previous && previous.close_price !== 0
      ? (change / previous.close_price) * 100
      : 0;

  return {
    symbol: symbol.trim().toUpperCase(),

    name: symbol.trim().toUpperCase(),

    price,

    change,

    changePercent,
  };
}