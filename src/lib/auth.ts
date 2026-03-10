import { APP_USERS, type AppUser } from "@/types/user";

const USER_PASSWORDS: Record<string, string> = {
  ohad: "Fundbox01",
  racheli: "Fundbox01",
  gaia: "gaia01",
  roni: "roni01",
};

const AUTH_KEY = "currentUserId";

export function authenticate(userId: string, password: string): boolean {
  return USER_PASSWORDS[userId] === password;
}

export function getLoggedInUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(AUTH_KEY);
  if (!id) return null;
  return APP_USERS.find((u) => u.id === id) ?? null;
}

export function login(userId: string): void {
  localStorage.setItem(AUTH_KEY, userId);
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function getCurrentUserId(): string {
  if (typeof window === "undefined") return "ohad";
  return localStorage.getItem(AUTH_KEY) ?? "ohad";
}
