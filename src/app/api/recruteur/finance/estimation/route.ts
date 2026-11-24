import { z } from "zod";
import { fail, protectedRoute } from "@/lib/api";
import { calculateEngagementAmounts } from "@/lib/financial-amounts";
import { getFinancialSettings } from "@/lib/financial-settings";

const estimateInput = z.object({
  pay: z.number().finite().min(0).max(1_000_000),
  capacity: z.number().int().min(1).max(1000),
}).strict();

export const POST = protectedRoute(["RECRUTEUR"], async (request) => {
  const input = estimateInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, "Rémunération ou nombre de travailleurs invalide.");
  const { commissionBps } = await getFinancialSettings();
  const amounts = calculateEngagementAmounts(Math.round(input.data.pay * 1000), commissionBps);
  return Response.json({ ...amounts, commissionBps, missionTotalMillimes: amounts.totalMillimes * input.data.capacity });
});
