import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../app";

describe("Watchlist API", () => {
  it("should require authentication", async () => {
    const response = await request(app)
      .get("/api/watchlist");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Authentication required"
    );
  });
});