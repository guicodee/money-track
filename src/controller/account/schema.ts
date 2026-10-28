import { currencyEnum } from "@src/db/schema/account";
import { z } from "zod";

const money = z.string().regex(/^-?\d{1,12}(\.\d{1,2})?$/, "Invalid amount. Use a string like \"1500.00\"");

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  initialBalance: money.default("0.00"),
  currency: z.enum(currencyEnum.enumValues).default("BRL"),
});

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });