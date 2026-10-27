export const approvalStatuses = ["EN_ATTENTE", "APPROUVE", "REFUSE"] as const;
export type ApprovalStatus = typeof approvalStatuses[number];
export function recruiterApprovalPath(status: string | null | undefined) {
 return status === "APPROUVE" ? "/recruteur/dashboard" : status === "REFUSE" ? "/recruteur/refuse" : "/recruteur/en-attente";
}
export const approvalLabels: Record<string, string> = { EN_ATTENTE: "En attente", APPROUVE: "Approuvé", REFUSE: "Refusé" };
