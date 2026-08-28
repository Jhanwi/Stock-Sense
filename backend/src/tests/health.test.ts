import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../app";

describe("Health API", () => {
  it("should return healthy status", async () => {
    const response = await request(app)
      .get("/api/health");

    expect(response.status).toBe(200);

    expect(response.body.status).toBe("healthy");
    expect(response.body.database).toBe("connected");
  });
});