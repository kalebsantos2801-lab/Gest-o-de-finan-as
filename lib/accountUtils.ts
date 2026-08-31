import { Account } from '@/types/database';

export interface SalaryAccountInfo {
  isSalaryAccount: boolean;
  salaryAmount: number;
  salaryDay: number;
  autoCredit: boolean;
  cleanInstitution: string;
}

export interface SavingsYieldBreakdown {
  allocatedAmount: number;
  monthlyRate: number; // 0.50% a.m.
  annualRate: number;  // ~6.17% a.a.
  dailyRate: number;
  perSecondYield: number;
  dailyYield: number;
  monthlyYield: number;
  annualYield: number;
  isTaxExempt: boolean; // Always true for Poupança
}

/**
 * Monthly base yield rate for Poupança in Brazil (0.50% a.m.)
 */
export const SAVINGS_MONTHLY_RATE = 0.005; // 0.50% a.m.
export const SAVINGS_ANNUAL_RATE = Math.pow(1 + SAVINGS_MONTHLY_RATE, 12) - 1; // ~6.17% a.a.

/**
 * Calculates Poupança yield details (0.50% a.m., 100% Isento de IR e IOF).
 */
export function calculateSavingsYields(balance: number): SavingsYieldBreakdown {
  const allocatedAmount = Math.max(0, balance);
  if (allocatedAmount <= 0) {
    return {
      allocatedAmount: 0,
      monthlyRate: SAVINGS_MONTHLY_RATE,
      annualRate: SAVINGS_ANNUAL_RATE,
      dailyRate: 0,
      perSecondYield: 0,
      dailyYield: 0,
      monthlyYield: 0,
      annualYield: 0,
      isTaxExempt: true,
    };
  }

  const dailyRate = Math.pow(1 + SAVINGS_MONTHLY_RATE, 1 / 30) - 1;
  const dailyYield = allocatedAmount * dailyRate;
  const monthlyYield = allocatedAmount * SAVINGS_MONTHLY_RATE;
  const annualYield = allocatedAmount * SAVINGS_ANNUAL_RATE;
  const perSecondYield = dailyYield / 86400;

  return {
    allocatedAmount,
    monthlyRate: SAVINGS_MONTHLY_RATE,
    annualRate: SAVINGS_ANNUAL_RATE,
    dailyRate,
    perSecondYield,
    dailyYield,
    monthlyYield,
    annualYield,
    isTaxExempt: true,
  };
}

/**
 * Parses salary configuration from an Account object.
 */
export function parseSalaryInfo(acc: Account): SalaryAccountInfo {
  const instClean = (acc.institution || 'Banco')
    .replace(/\s*\[SALARIO:.*?\]/g, '')
    .replace(/\s*\[CDI:.*?\]/g, '')
    .trim() || 'Banco';

  if (acc.is_salary_account !== undefined && acc.is_salary_account !== null) {
    return {
      isSalaryAccount: Boolean(acc.is_salary_account),
      salaryAmount: Number(acc.salary_amount || 0),
      salaryDay: Number(acc.salary_day || 5),
      autoCredit: Boolean(acc.auto_credit_salary ?? true),
      cleanInstitution: instClean,
    };
  }

  const inst = acc.institution || '';
  const match = inst.match(/\[SALARIO:([\d.]+):(\d+):(auto|manual)\]/);
  if (match && match[1]) {
    return {
      isSalaryAccount: true,
      salaryAmount: parseFloat(match[1]) || 0,
      salaryDay: parseInt(match[2], 10) || 5,
      autoCredit: match[3] === 'auto',
      cleanInstitution: instClean,
    };
  }

  return {
    isSalaryAccount: false,
    salaryAmount: 0,
    salaryDay: 5,
    autoCredit: true,
    cleanInstitution: instClean,
  };
}

/**
 * Cleans institution name of all metadata tags.
 */
export function getCleanInstitution(rawInstitution: string): string {
  return (rawInstitution || '')
    .replace(/\s*\[SALARIO:.*?\]/g, '')
    .replace(/\s*\[CDI:.*?\]/g, '')
    .trim() || 'Banco';
}

/**
 * Formats institution string with salary tags.
 */
export function formatInstitutionWithTags(
  rawInstitution: string,
  salaryConfig: { isSalaryAccount: boolean; salaryAmount: number; salaryDay: number; autoCredit: boolean }
): string {
  let clean = getCleanInstitution(rawInstitution);

  if (salaryConfig.isSalaryAccount && salaryConfig.salaryAmount > 0) {
    clean += ` [SALARIO:${salaryConfig.salaryAmount}:${salaryConfig.salaryDay}:${salaryConfig.autoCredit ? 'auto' : 'manual'}]`;
  }

  return clean;
}

/**
 * Backwards compatible helper for salary tags.
 */
export function formatInstitutionWithSalaryTag(
  rawInstitution: string,
  isSalaryAccount: boolean,
  salaryAmount: number,
  salaryDay: number,
  autoCredit: boolean
): string {
  return formatInstitutionWithTags(
    rawInstitution,
    { isSalaryAccount, salaryAmount, salaryDay, autoCredit }
  );
}

