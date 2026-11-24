export const publicUserSelect = {
  id: true,
  name: true,
  firstName: true,
  email: true,
  role: true,
  createdAt: true,
  suspended: true,
  recruiterVerification: { select: { status: true } },
} as const;
