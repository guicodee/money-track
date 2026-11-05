import { z } from "zod";
import { isValidDateOnly } from "@src/utils/date";

export const amountSchema = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "Value invalid. Use up to 2 decimal places (ex.: 150.90)")
  .refine((v) => /[1-9]/.test(v), "The value must be greater than 0")
  .transform((v) => {
    const [int, dec = ""] = v.split(".");
    return `${String(Number(int))}.${dec.padEnd(2, "0")}`; 
  });

export const dateOnlySchema = z
  .string()
  .refine(isValidDateOnly, "Invalid date. Use the format YYYY-MM-DD");

export const operationTypeSchema = z.enum(["EXPENSE", "INCOME", "TRANSFER"]);