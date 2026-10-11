import type { RequestHandler } from "express";
import { changePassword, getCurrentUser, loginUser, registerUser, updateProfile } from "../services/authService.js";

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

export const updateMe: RequestHandler = async (request, response) => {
  const user = await updateProfile(request.user!.userId, request.body);
  response.json({ success: true, message: "Profile updated successfully", data: { user } });
};

export const updateMyPassword: RequestHandler = async (request, response) => {
  await changePassword(request.user!.userId, request.body);
  response.json({ success: true, message: "Password changed successfully", data: null });
};