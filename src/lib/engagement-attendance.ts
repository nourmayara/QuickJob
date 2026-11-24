type Attendance = {
  status: string;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  payment: unknown;
};

export function canCheckIn(engagement: Attendance) {
  return !engagement.checkedInAt && !engagement.checkedOutAt && !engagement.payment &&
    ["CONFIRMED", "AWAITING_VALIDATION", "AWAITING_PAYMENT"].includes(engagement.status);
}

export function canCheckOut(engagement: Omit<Attendance, "payment">) {
  return engagement.status === "IN_PROGRESS" && !!engagement.checkedInAt && !engagement.checkedOutAt;
}

export function hasValidatedCheckOut(engagement: Pick<Attendance, "checkedInAt" | "checkedOutAt"> & {
  completedAt: Date | null;
  validatedAt: Date | null;
}) {
  const departure = engagement.checkedOutAt?.getTime();
  return !!engagement.checkedInAt && departure !== undefined && departure >= engagement.checkedInAt.getTime() &&
    departure === engagement.completedAt?.getTime() && departure === engagement.validatedAt?.getTime();
}
