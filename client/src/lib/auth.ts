import { apiRequest } from "./queryClient";
import type { LoginData, MagicLinkData } from "@shared/schema";

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: User;
}

export async function loginUser(credentials: LoginData): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/login", credentials);
  return response.json();
}

export async function registerUser(credentials: LoginData): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/register", credentials);
  return response.json();
}

export async function logoutUser(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout");
}

export async function sendMagicLink(data: MagicLinkData): Promise<void> {
  const response = await apiRequest("POST", "/api/auth/magic-link", data);
  return response.json();
}

export async function getCurrentUser(): Promise<AuthResponse> {
  const response = await apiRequest("GET", "/api/auth/me");
  return response.json();
}
