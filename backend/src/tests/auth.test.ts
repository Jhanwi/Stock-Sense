import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../app";

describe("Authentication API", () => {
  it("should reject registration without credentials", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({});

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Email and password are required"
    );
  });

  it("should reject login without credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Email and password are required"
    );
  });
});