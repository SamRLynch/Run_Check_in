export type Role = "runner" | "creator" | "admin";

export const ROLE_PASSWORDS: Record<Exclude<Role, "runner">, string> = {
  creator: "daisy",
  admin: "harper",
};

export function getStoredRole(): Role {
  return (localStorage.getItem("clubbnubb_role") as Role) || "runner";
}

export function setStoredRole(role: Role): void {
  localStorage.setItem("clubbnubb_role", role);
}

export function getRoleFromPassword(password: string): Role | null {
  if (password === ROLE_PASSWORDS.admin) return "admin";
  if (password === ROLE_PASSWORDS.creator) return "creator";
  return null;
}

export function canCreateRun(role: Role): boolean {
  return role === "creator" || role === "admin";
}

export function canEditRun(role: Role, createdBy: string | null, storedName: string | null): boolean {
  if (role === "admin") return true;
  if (role === "creator" && createdBy && storedName) {
    return createdBy.toLowerCase() === storedName.toLowerCase();
  }
  return false;
}

export function getRoleLabel(role: Role): string {
  if (role === "admin") return "Admin";
  if (role === "creator") return "Creator";
  return "Runner";
}
