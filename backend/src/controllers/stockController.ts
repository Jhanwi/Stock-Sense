import { Request, Response } from "express";

import {
  getHistoricalPrices,
  getStockQuote,
} from "../services/stockService";

/**
 * GET /api/stocks/:symbol/history
 *
 * Example:
 *
 * /api/stocks/TCS.NS/history
 * /api/stocks/RELIANCE.NS/history
 * /api/stocks/AAPL/history
 */
export async function getHistory(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const symbol = String(
      req.params.symbol || ""
    )
      .trim()
      .toUpperCase();

    if (!symbol) {
      res.status(400).json({
        message: "Stock symbol is required.",
      });

      return;
    }

    console.log(
      `Loading Yahoo Finance history for ${symbol}`
    );

    const history =
      await getHistoricalPrices(symbol);

    res.status(200).json(history);
  } catch (error) {
    console.error(
      "Stock history error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load stock history.";

    res.status(404).json({
      message,
    });
  }
}

/**
 * GET /api/stocks/:symbol
 *
 * Example:
 *
 * /api/stocks/TCS.NS
 */
export async function getStock(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const symbol = String(
      req.params.symbol || ""
    )
      .trim()
      .toUpperCase();

    if (!symbol) {
      res.status(400).json({
        message: "Stock symbol is required.",
      });

      return;
    }

    console.log(
      `Loading Yahoo Finance quote for ${symbol}`
    );

    const stock =
      await getStockQuote(symbol);

    res.status(200).json(stock);
  } catch (error) {
    console.error(
      "Stock quote error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load stock.";

    res.status(404).json({
      message,
    });
  }
}