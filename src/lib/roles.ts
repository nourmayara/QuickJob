export function dashboardPath(role: string) {
  if (role === "ADMIN") return "/dashboard/administrateur";
  if (role === "RECRUTEUR") return "/recruteur/dashboard";
  return "/dashboard/travailleur";
}
