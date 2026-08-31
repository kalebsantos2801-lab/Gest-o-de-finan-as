/**
 * Safe date parsing utility to avoid timezone offset bugs (e.g. UTC YYYY-MM-DD shifting backwards in Brazilian UTC-3)
 */

export interface ParsedDateInfo {
  month: number; // 0-11 (0 = Janeiro, 11 = Dezembro)
  year: number;  // e.g. 2026
  day: number;   // 1-31
  date: Date;
}

export function extractMonthAndYear(dateInput: string | Date | null | undefined): ParsedDateInfo | null {
  if (!dateInput) return null;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;

    // Format 1: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DD HH:mm:ss
    const matchISO = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchISO) {
      const year = parseInt(matchISO[1], 10);
      const month = parseInt(matchISO[2], 10) - 1; // 0-indexed
      const day = parseInt(matchISO[3], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return {
          month,
          year,
          day,
          date: new Date(year, month, day, 12, 0, 0)
        };
      }
    }

    // Format 2: DD/MM/YYYY or DD-MM-YYYY
    const matchBR = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (matchBR) {
      const day = parseInt(matchBR[1], 10);
      const month = parseInt(matchBR[2], 10) - 1;
      const year = parseInt(matchBR[3], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return {
          month,
          year,
          day,
          date: new Date(year, month, day, 12, 0, 0)
        };
      }
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return {
    month: d.getMonth(),
    year: d.getFullYear(),
    day: d.getDate(),
    date: d
  };
}

export function safeNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const clean = val.trim().replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}
