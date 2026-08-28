import pool from "../config/database";

export async function getStocks() {
  const result = await pool.query(`
    SELECT
      id,
      symbol,
      company_name,
      sector,
      industry,
      market_cap
    FROM stocks
    ORDER BY symbol
  `);

  return result.rows;
}

export async function getStockHistory(symbol: string) {
  const result = await pool.query(
    `
    SELECT
      hp.trading_date,
      hp.open_price,
      hp.high_price,
      hp.low_price,
      hp.close_price,
      hp.volume
    FROM historical_prices hp
    JOIN stocks s
      ON s.id = hp.stock_id
    WHERE s.symbol = $1
    ORDER BY hp.trading_date
    `,
    [symbol]
  );

  return result.rows;
}