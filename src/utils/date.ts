import { TZDate } from "@date-fns/tz";
import { addDays as addDaysFn, format, isValid, parseISO, startOfDay } from "date-fns";

const SP_TIMEZONE = "America/Sao_Paulo";

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = parseISO(value);

  return isValid(date) && format(date, "yyyy-MM-dd") === value;
}

export function startOfDaySaoPaulo(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);

  return startOfDay(
    new TZDate(year, month - 1, day, SP_TIMEZONE),
  );
}

export function todayInSaoPaulo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SP_TIMEZONE }).format(now);
}

export function addDays(date: string, days: number): string {
  return format(addDaysFn(parseISO(date), days), "yyyy-MM-dd");
}