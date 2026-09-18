import type { RequestHandler } from "express";
import { getCurrentUser, loginUser, registerUser } from "../services/authService.js";

export const register: RequestHandler = async (request, response) => {
  const user = await registerUser(request.body);
  response.status(201).json({ success: true, message: "User registered successfully", data: { user } });
};

export const login: RequestHandler = async (request, response) => {
  const result = await loginUser(request.body);
  response.json({ success: true, message: "Login successful", data: result });
};

export const me: RequestHandler = async (request, response) => {
  const user = await getCurrentUser(request.user!.userId);
  response.json({ success: true, message: "Authenticated user", data: user });
};