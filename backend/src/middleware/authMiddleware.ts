import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "development-secret";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const token = authorization.startsWith("Bearer ")
    ? authorization.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Invalid authorization header",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as {
      userId: number;
      email: string;
    };

    req.user = decoded;

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}