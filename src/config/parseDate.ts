import { toUtcDateOnly } from "./dateOnly";

export const parseDateDDMMYYYY = (value: string): Date | null => {
  if (!value) return null;

  const parts = value.split('/');
  if (parts.length !== 3) return null;

  const [dd, mm, yyyy] = parts;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);

  if (!day || !month || !year) return null;

  // new Date(year, monthIndex, day) → monthIndex es 0-based
  const d = new Date(Date.UTC(year, month - 1, day));

  return isNaN(d.getTime()) ? null : toUtcDateOnly(d);
};
