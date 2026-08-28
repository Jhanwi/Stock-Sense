import { Router } from "express";

import {
  getHistory,
  getStock,
} from "../controllers/stockController";

const router = Router();

/*
 * Dynamic stock search.
 *
 * These routes accept ANY Yahoo Finance symbol.
 *
 * Examples:
 *
 * /api/stocks/TCS.NS
 * /api/stocks/RELIANCE.NS
 * /api/stocks/INFY.NS
 * /api/stocks/AAPL
 * /api/stocks/MSFT
 */

/*
 * Current/latest stock information
 */
router.get(
  "/:symbol",
  getStock
);

/*
 * Historical daily prices
 */
router.get(
  "/:symbol/history",
  getHistory
);

export default router;