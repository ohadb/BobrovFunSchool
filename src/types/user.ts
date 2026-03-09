export interface AppUser {
  id: string;
  name: string;
  nameHe: string;
  role: "parent" | "student";
}

export const APP_USERS: AppUser[] = [
  { id: "ohad", name: "Ohad", nameHe: "אוהד", role: "parent" },
  { id: "racheli", name: "Racheli", nameHe: "רחלי", role: "parent" },
  { id: "roni", name: "Roni", nameHe: "רוני", role: "student" },
  { id: "gaia", name: "Gaia", nameHe: "גאיה", role: "student" },
];
