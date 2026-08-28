import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
  createUser,
  findUserByEmail,
} from "../repositories/userRepository";

const JWT_SECRET =
  process.env.JWT_SECRET || "development-secret";

export async function registerUser(
  email: string,
  password: string
) {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return createUser(email, passwordHash);
}

export async function loginUser(
  email: string,
  password: string
) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}