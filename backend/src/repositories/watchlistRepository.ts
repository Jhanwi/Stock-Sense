import pool from "../config/database";

export async function addToWatchlist(
  userId: number,
  symbol: string
) {
  const stockResult = await pool.query(
    `
    SELECT id, symbol
    FROM stocks
    WHERE symbol = $1
    `,
    [symbol]
  );

  if (stockResult.rows.length === 0) {
    throw new Error("Stock not found");
  }

  const stock = stockResult.rows[0];

  const result = await pool.query(
    `
    INSERT INTO watchlist (user_id, stock_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, stock_id)
    DO NOTHING
    RETURNING id, created_at
    `,
    [userId, stock.id]
  );

  return {
    symbol: stock.symbol,
    added: result.rows.length > 0,
  };
}

export async function getUserWatchlist(userId: number) {
  const result = await pool.query(
    `
    SELECT
      s.symbol,
      s.company_name,
      w.created_at
    FROM watchlist w
    JOIN stocks s
      ON s.id = w.stock_id
    WHERE w.user_id = $1
    ORDER BY w.created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function removeFromWatchlist(
  userId: number,
  symbol: string
) {
  const result = await pool.query(
    `
    DELETE FROM watchlist w
    USING stocks s
    WHERE w.stock_id = s.id
      AND w.user_id = $1
      AND s.symbol = $2
    RETURNING s.symbol
    `,
    [userId, symbol]
  );

  return result.rows.length > 0;
}