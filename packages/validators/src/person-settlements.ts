import { z } from "@hono/zod-openapi";
import { paymentMethods } from "@openmonetis/domain/transactions";

export const PersonSettlementParamsSchema = z
  .object({ id: z.uuid().openapi({ param: { name: "id", in: "path" } }) })
  .openapi("PersonSettlementParams");

export const PersonSettlementPersonParamsSchema = z
  .object({ personId: z.uuid().openapi({ param: { name: "personId", in: "path" } }) })
  .openapi("PersonSettlementPersonParams");

export const PersonSettlementPeriodQuerySchema = z
  .object({
    period: z
      .string()
      .regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/)
      .openapi({ param: { name: "period", in: "query" }, example: "2026-08" }),
  })
  .openapi("PersonSettlementPeriodQuery");

export const CreatePersonSettlementInputSchema = z
  .object({
    personId: z.uuid(),
    amount: z.number().finite().positive().max(999999999.99),
    receivedAt: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[0-1])$/),
    period: z
      .string()
      .regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/)
      .optional()
      .openapi({
        description:
          "Month the repasse settles. Defaults to the month of `receivedAt`; set it to pay a later month in advance.",
      }),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .openapi("CreatePersonSettlementInput");

export const PersonSettlementOutputSchema = z
  .object({
    id: z.uuid(),
    personId: z.uuid(),
    amount: z.number(),
    receivedAt: z.iso.date(),
    /** Month the repasse settles (manual repasses; null for older ones and invoice payments). */
    period: z.string().nullable(),
    note: z.string().nullable(),
    source: z.enum(["manual", "invoicePayment"]),
    createdAt: z.iso.datetime(),
  })
  .openapi("PersonSettlementOutput");

export const PersonBalanceOutputSchema = z
  .object({
    assignedAmount: z.number(),
    refundedAmount: z.number(),
    settledAmount: z.number(),
    dueAmount: z.number(),
    coveredAmount: z.number(),
    balanceAmount: z.number(),
    receivableAmount: z.number(),
    creditAmount: z.number(),
    status: z.enum(["receivable", "settled", "credit"]),
  })
  .openapi("PersonBalanceOutput");

export const PersonSettlementItemOutputSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    date: z.iso.date(),
    kind: z.enum(["expense", "refund"]),
    amount: z.number().nonnegative(),
    currentInstallment: z.number().int().nullable(),
    installmentCount: z.number().int().nullable(),
    isRecurring: z.boolean(),
    paymentMethod: z.enum(paymentMethods).nullable(),
    accountName: z.string().nullable(),
    accountLogo: z.string().nullable(),
    cardName: z.string().nullable(),
    cardLogo: z.string().nullable(),
    categoryName: z.string().nullable(),
    categoryIcon: z.string().nullable(),
    receivedAmount: z.number().nonnegative(),
    remainingAmount: z.number().nonnegative(),
    status: z.enum(["received", "partial", "pending"]),
  })
  .openapi("PersonSettlementItemOutput");

export const PersonSettlementSnapshotOutputSchema = z
  .object({
    personId: z.uuid(),
    period: z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/),
    balance: PersonBalanceOutputSchema,
    /** The month's expenses of the person, with what the repasses already cover (oldest first). */
    items: z.array(PersonSettlementItemOutputSchema),
    settlements: z.array(PersonSettlementOutputSchema),
  })
  .openapi("PersonSettlementSnapshotOutput");

export const PersonSettlementSummaryItemOutputSchema = z
  .object({
    personId: z.uuid(),
    personName: z.string(),
    personAvatarUrl: z.string().nullable(),
    personStatus: z.enum(["active", "inactive"]),
    balance: PersonBalanceOutputSchema,
  })
  .openapi("PersonSettlementSummaryItemOutput");

export const PersonSettlementsSummaryOutputSchema = z
  .object({
    period: z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/),
    totalReceivableAmount: z.number().finite().nonnegative(),
    totalCreditAmount: z.number().finite().nonnegative(),
    pendingCount: z.number().int().nonnegative(),
    items: z.array(PersonSettlementSummaryItemOutputSchema),
  })
  .openapi("PersonSettlementsSummaryOutput");

export type CreatePersonSettlementInput = z.infer<typeof CreatePersonSettlementInputSchema>;
export type PersonSettlementOutput = z.infer<typeof PersonSettlementOutputSchema>;
export type PersonBalanceOutput = z.infer<typeof PersonBalanceOutputSchema>;
export type PersonSettlementItemOutput = z.infer<typeof PersonSettlementItemOutputSchema>;
export type PersonSettlementSnapshotOutput = z.infer<typeof PersonSettlementSnapshotOutputSchema>;
export type PersonSettlementSummaryItemOutput = z.infer<
  typeof PersonSettlementSummaryItemOutputSchema
>;
export type PersonSettlementsSummaryOutput = z.infer<typeof PersonSettlementsSummaryOutputSchema>;
