import { Router } from "express";

import {
  addStock,
  listWatchlist,
  removeStock,
} from "../controllers/watchlistController";

import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", listWatchlist);

router.post("/:symbol", addStock);

router.delete("/:symbol", removeStock);

export default router;