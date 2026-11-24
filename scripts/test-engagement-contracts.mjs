import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import env from "@next/env";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import { signToken } from "../src/lib/token.ts";

env.loadEnvConfig(process.cwd());
assert.match(process.env.DATABASE_URL ?? "", /quickjob-contract-receipt\.db$/);
const db = new PrismaClient();
const base = "http://127.0.0.1:3187";
const prefix = randomUUID();
async function actor(role) {
  const user = await db.user.create({ data: {
    name: role, email: `${prefix}-${randomUUID()}@example.invalid`, password: "fixture", role,
    ...(role === "RECRUTEUR" ? { recruiterVerification: { create: { status: "APPROUVE" } } } : {}),
  } });
  const session = await db.session.create({ data: { id: randomUUID(), userId: user.id, expiresAt: new Date(Date.now() + 600_000) } });
  return { id: user.id, cookie: `session=${await signToken(user.id, session.id)}` };
}
async function call(path, actor, expected, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: { Cookie: actor.cookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, expected, `${method} ${path}: ${await response.clone().text()}`);
  return response;
}
try {
  const recruiter = await actor("RECRUTEUR");
  const admin = await actor("ADMIN");
  const workers = [await actor("TRAVAILLEUR"), await actor("TRAVAILLEUR")];
  const date = new Date("2090-11-20T00:00:00.000Z");
  const mission = await db.mission.create({ data: {
    recruiterId: recruiter.id, title: "Accueil des visiteurs", description: "Accueillir les visiteurs à l’entrée.",
    city: "Tunis", address: "Rue des Fleurs", date, startTime: "09:00", endTime: "12:00", pay: 50, capacity: 2,
  } });
  async function select(worker) {
    const application = await db.application.create({ data: { missionId: mission.id, workerId: worker.id } });
    await call(`/api/applications/${application.id}`, recruiter, 200, "PATCH", { status: "ACCEPTED" });
    return db.engagement.findUniqueOrThrow({ where: { applicationId: application.id }, include: { contracts: true } });
  }
  const first = await select(workers[0]);
  assert.equal(first.totalMillimes, 60_000);
  assert.equal(first.contracts.length, 2);
  const calendar = async () => (await call("/api/travailleur/calendrier?month=2090-11", workers[0], 200)).json();
  assert.doesNotMatch(JSON.stringify(await calendar()), /Accueil des visiteurs/);
  const workerContract = first.contracts.find(contract => contract.party === "TRAVAILLEUR");
  const recruiterContract = first.contracts.find(contract => contract.party === "RECRUTEUR");
  const url = contract => `/api/finance/contracts/${contract.reference}`;
  await call(url(workerContract), workers[1], 404);
  assert.equal((await (await call(url(workerContract), workers[0], 200, "POST")).json()).confirmed, false);
  assert.equal((await (await call(url(recruiterContract), recruiter, 200, "POST")).json()).confirmed, true);
  await call(url(recruiterContract), recruiter, 409, "POST");
  assert.match(JSON.stringify(await calendar()), /Accueil des visiteurs/);
  const pdf = await call(`${url(recruiterContract)}?format=pdf`, admin, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.match(await pdf.text(), /^%PDF-1\.4/);
  const settings = await db.financialSettings.findUniqueOrThrow({ where: { id: 1 } });
  const update = { commissionBps: 2500, validationHours: 48, paymentHours: 48, revision: settings.revision };
  await call("/api/admin/finance", workers[0], 403, "PATCH", update);
  await call("/api/admin/finance", admin, 400, "PATCH", { ...update, commissionBps: 10001 });
  await call("/api/admin/finance", admin, 200, "PATCH", update);
  const second = await select(workers[1]);
  assert.equal(second.totalMillimes, 62_500);
  const saved = await db.engagement.findUniqueOrThrow({ where: { id: first.id }, include: { contracts: true } });
  assert.equal(saved.commissionBps, 2000);
  assert.equal(saved.contracts.find(contract => contract.reference === recruiterContract.reference).content, recruiterContract.content);
  const workflow = (engagement, actor, expected, command) =>
    call(`/api/finance/engagements/${engagement.id}`, actor, expected, "POST", command);
  await workflow(first, workers[0], 400, { action: "complete" });
  await call("/api/create-payment-intent", recruiter, 409, "POST", { engagementId: first.id });
  await call("/api/create-payment-intent", workers[0], 403, "POST", { engagementId: first.id });
  await call("/api/create-payment-intent", recruiter, 400, "POST", { engagementId: first.id, amount: 1, commissionBps: 0 });
  await workflow(first, recruiter, 400, { action: "validate" });
  await workflow(first, workers[0], 403, { action: "check-in" });
  await workflow(first, admin, 403, { action: "check-out" });
  await workflow(second, recruiter, 409, { action: "check-in" });
  await workflow(first, await actor("RECRUTEUR"), 404, { action: "check-in" });
  await db.engagement.update({ where: { id: first.id }, data: {
    status: "AWAITING_PAYMENT", startAt: new Date(Date.now() - 7_200_000), endAt: new Date(Date.now() - 3_600_000),
    completedAt: new Date(Date.now() - 3_600_000), validatedAt: new Date(Date.now() - 1_800_000),
  } });
  await call("/api/create-payment-intent", recruiter, 409, "POST", { engagementId: first.id });
  await workflow(first, recruiter, 409, { action: "check-out" });
  await workflow(first, recruiter, 200, { action: "check-in" });
  const inProgress = await db.engagement.findUniqueOrThrow({ where: { id: first.id } });
  assert.equal(inProgress.status, "IN_PROGRESS");
  assert.ok(inProgress.checkedInAt);
  assert.equal(inProgress.validatedAt, null);
  assert.equal((await db.mission.findUniqueOrThrow({ where: { id: mission.id } })).status, "IN_PROGRESS");
  await call("/api/create-payment-intent", recruiter, 409, "POST", { engagementId: first.id });
  await workflow(first, recruiter, 200, { action: "report-check-out-problem", reason: "Le travail doit être vérifié avant le départ." });
  const disputed = await db.engagement.findUniqueOrThrow({ where: { id: first.id } });
  assert.equal(disputed.status, "DISPUTED");
  assert.equal(disputed.checkedOutAt, null);
  await workflow(first, recruiter, 409, { action: "check-out" });
  await call("/api/create-payment-intent", recruiter, 409, "POST", { engagementId: first.id });
  await workflow(first, admin, 200, { action: "resolve", decision: "RESUME", reason: "Le travail peut reprendre après vérification." });
  await workflow(first, recruiter, 200, { action: "check-out" });
  await workflow(first, recruiter, 409, { action: "check-out" });
  const validated = await db.engagement.findUniqueOrThrow({ where: { id: first.id } });
  assert.equal(validated.status, "AWAITING_PAYMENT");
  assert.deepEqual(validated.checkedInAt, inProgress.checkedInAt);
  assert.deepEqual(validated.checkedOutAt, validated.completedAt);
  assert.deepEqual(validated.checkedOutAt, validated.validatedAt);
  assert.ok(validated.checkedOutAt >= validated.checkedInAt);
  assert.equal(validated.paymentDueAt - validated.validatedAt, 48 * 3_600_000);
  await db.engagement.update({ where: { id: first.id }, data: { paymentDueAt: new Date(Date.now() - 60_000) } });
  const publication = {
    title: "Mission de recette", description: "Description de la recette financière.", category: "Services",
    date: "2090-11-21", startTime: "09:00", endTime: "12:00", city: "Tunis", address: "Rue des Fleurs",
    pay: 50, skills: "", capacity: 1, status: "PUBLISHED",
  };
  await call("/api/missions", recruiter, 409, "POST", publication);
  function reminders() {
    return execFileSync(process.execPath, ["scripts/send-financial-reminders.mjs"], { encoding: "utf-8" });
  }
  assert.match(reminders(), /^1 rappel/);
  assert.match(reminders(), /^0 rappel/);
  await workflow(first, workers[0], 200, { action: "dispute", reason: "Je conteste les conditions de paiement." });
  await workflow(first, recruiter, 403, { action: "resolve", decision: "RESUME", reason: "Une décision réservée à l’administration." });
  await workflow(first, admin, 409, { action: "resolve", decision: "NO_WORK", reason: "Le travail avait pourtant déjà été validé." });
  await workflow(first, admin, 200, { action: "resolve", decision: "RESUME", reason: "La validation est confirmée après examen." });
  const dispute = await db.engagementDispute.findFirstOrThrow({ where: { engagementId: first.id }, orderBy: { id: "desc" } });
  assert.equal(dispute.resolvedById, admin.id);
  assert.equal(dispute.decision, "RESUME");
  assert.equal((await db.engagement.findUniqueOrThrow({ where: { id: first.id } })).status, "AWAITING_PAYMENT");
  assert.equal((await db.engagement.findUniqueOrThrow({ where: { id: second.id } })).status, "AWAITING_CONTRACTS");
  await call(`/api/missions/${mission.id}`, recruiter, 409, "PATCH", { status: "CANCELLED" });
  await workflow(first, recruiter, 409, { action: "cancel" });
  await workflow(second, recruiter, 200, { action: "cancel" });
  const cancelled = await db.engagement.findUniqueOrThrow({ where: { id: second.id } });
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.validatedAt, null);
  assert.equal((await db.mission.findUniqueOrThrow({ where: { id: mission.id } })).status, "COMPLETED");
  await call(url(second.contracts.find(contract => contract.party === "TRAVAILLEUR")), workers[1], 409, "POST");
  assert.equal(await db.engagementPayment.count(), 0);
  const payment = await db.engagementPayment.create({ data: {
    engagementId: first.id, stripeIntentId: "pi_quickjob_fixture", stripeAmount: 6000, stripeCurrency: "eur",
  } });
  const stripe = new Stripe("sk_test_quickjob_fixture");
  const secret = "whsec_quickjob_fixture";
  async function deliver(id, type, expected, amount = 6000, invalidSignature = false) {
    const created = Math.floor(Date.now() / 1000);
    const success = type === "payment_intent.succeeded";
    const payload = JSON.stringify({ id, type, created, livemode: false, data: { object: {
      id: payment.stripeIntentId, livemode: false, currency: payment.stripeCurrency, amount,
      amount_received: success ? amount : 0, status: success ? "succeeded" : "requires_payment_method",
      metadata: { quickJobPaymentId: payment.id },
    } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const response = await fetch(base + "/api/stripe/webhook", {
      method: "POST", body: payload,
      headers: { "Stripe-Signature": invalidSignature ? "invalid" : signature },
    });
    assert.equal(response.status, expected);
  }
  await deliver("evt_quickjob_bad_signature", "payment_intent.succeeded", 400, 6000, true);
  await deliver("evt_quickjob_wrong_amount", "payment_intent.succeeded", 500, 1);
  await deliver("evt_quickjob_declined", "payment_intent.payment_failed", 200);
  assert.equal((await db.engagementPayment.findUniqueOrThrow({ where: { id: payment.id } })).status, "FAILED");
  await deliver("evt_quickjob_paid", "payment_intent.succeeded", 200);
  await deliver("evt_quickjob_paid", "payment_intent.succeeded", 200);
  await deliver("evt_quickjob_paid_again", "payment_intent.succeeded", 200);
  assert.equal((await db.engagementPayment.findUniqueOrThrow({ where: { id: payment.id } })).status, "SUCCEEDED");
  assert.equal(await db.simulatedPayout.count({ where: { paymentId: payment.id } }), 1);
  assert.equal((await db.mission.findUniqueOrThrow({ where: { id: mission.id } })).status, "COMPLETED");
  await call("/api/create-payment-intent", recruiter, 409, "POST", { engagementId: first.id });
  const receipt = await call(`/api/finance/receipts/${payment.id}`, recruiter, 200);
  assert.equal(receipt.headers.get("content-type"), "application/pdf");
  await call(`/api/finance/receipts/${payment.id}`, workers[0], 403);
  for (const [path, owner, title] of [
    ["/admin/finance", admin, "Transactions Stripe en mode test"],
    ["/recruteur/finance", recruiter, "Synthèse financière"],
    ["/dashboard/travailleur/finance", workers[0], "Versement simulé"],
  ]) {
    assert.ok((await (await call(path, owner, 200)).text()).includes(title), `Contenu financier attendu sur ${path}`);
  }
  await call("/api/admin/finance/refunds", recruiter, 403, "POST", { paymentId: payment.id, reason: "Demande de remboursement de recette." });
  const refund = await db.engagementRefund.create({ data: {
    paymentId: payment.id, adminId: admin.id, reason: "Remboursement de recette autorisé.", stripeRefundId: "re_quickjob_fixture",
  } });
  const refundPayload = JSON.stringify({ id: "evt_quickjob_refund", type: "refund.created", created: Math.floor(Date.now() / 1000), livemode: false, data: { object: {
    id: refund.stripeRefundId, payment_intent: payment.stripeIntentId, currency: "eur", amount: 6000,
    status: "succeeded", metadata: { quickJobRefundId: refund.id },
  } } });
  for (let i = 0; i < 2; i++) {
    const response = await fetch(base + "/api/stripe/webhook", {
      method: "POST", body: refundPayload,
      headers: { "Stripe-Signature": stripe.webhooks.generateTestHeaderString({ payload: refundPayload, secret }) },
    });
    assert.equal(response.status, 200);
  }
  await deliver("evt_quickjob_paid_late", "payment_intent.succeeded", 200);
  assert.equal((await db.engagementPayment.findUniqueOrThrow({ where: { id: payment.id } })).status, "REFUNDED");
  assert.ok((await db.simulatedPayout.findUniqueOrThrow({ where: { paymentId: payment.id } })).reversedAt);
  console.log("Contrats, échéances, litiges, écrans et webhooks simulés de paiement et de remboursement vérifiés.");
} finally {
  await db.$disconnect();
}
