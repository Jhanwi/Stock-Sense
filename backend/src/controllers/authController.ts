import { Request, Response } from "express";

import {
  registerUser,
  loginUser,
} from "../services/authService";

export async function register(
  req: Request,
  res: Response
) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await registerUser(
      email,
      password
    );

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Registration failed",
    });
  }
}

export async function login(
  req: Request,
  res: Response
) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await loginUser(
      email,
      password
    );

    res.json(result);
  } catch (error) {
    console.error("Login error:", error);

    res.status(401).json({
      message:
        error instanceof Error
          ? error.message
          : "Login failed",
    });
  }
}