import { Response } from "express";

import {
  addToWatchlist,
  getUserWatchlist,
  removeFromWatchlist,
} from "../repositories/watchlistRepository";

import { AuthRequest } from "../middleware/authMiddleware";

export async function addStock(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userId;
    const symbol = String(req.params.symbol);

    const result = await addToWatchlist(
      userId,
      symbol
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("Watchlist error:", error);

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Could not add stock",
    });
  }
}

export async function listWatchlist(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userId;

    const stocks = await getUserWatchlist(userId);

    res.json(stocks);
  } catch (error) {
    console.error("Watchlist error:", error);

    res.status(500).json({
      message: "Could not fetch watchlist",
    });
  }
}

export async function removeStock(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userId;
    const symbol = String(req.params.symbol);

    const removed = await removeFromWatchlist(
      userId,
      symbol
    );

    if (!removed) {
      return res.status(404).json({
        message: "Stock not found in watchlist",
      });
    }

    res.json({
      message: "Stock removed from watchlist",
    });
  } catch (error) {
    console.error("Watchlist error:", error);

    res.status(500).json({
      message: "Could not remove stock",
    });
  }
}