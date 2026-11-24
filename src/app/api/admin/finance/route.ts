import { fail, protectedRoute } from "@/lib/api";
import { financialSettingsInput, updateFinancialSettings } from "@/lib/financial-settings";

export const PATCH = protectedRoute(["ADMIN"], async (request, _context, admin) => {
  const input = financialSettingsInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, "Taux ou délai invalide.");
  const updated = await updateFinancialSettings(admin.id, input.data);
  if (!updated) return fail(409, "Les paramètres ont changé. Actualisez la page avant de réessayer.");
  return Response.json(updated);
});
