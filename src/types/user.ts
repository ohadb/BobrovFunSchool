export interface AppUser {
  id: string;
  name: string;
  role: "parent" | "student";
}

export const APP_USERS: AppUser[] = [
  { id: "ohad", name: "Ohad", role: "parent" },
  { id: "racheli", name: "Racheli", role: "parent" },
  { id: "roni", name: "Roni", role: "student" },
  { id: "gaia", name: "Gaia", role: "student" },
];
