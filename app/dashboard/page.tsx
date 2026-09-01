'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { Account, Income, Expense, Goal, CreditCard as CreditCardType, Debt } from '@/types/database';
import { memoryCache } from '@/lib/cache';
import { FinHouseDashboard } from '@/components/dashboard/FinHouseDashboard';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <DashboardContent />
      </TrialGuard>
    </AuthGuard>
  );
}

function DashboardContent() {
  const { profile, user } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>(() => memoryCache.get<Account[]>('dashboard_accounts') || []);
  const [incomes, setIncomes] = useState<Income[]>(() => memoryCache.get<Income[]>('dashboard_incomes') || []);
  const [expenses, setExpenses] = useState<Expense[]>(() => memoryCache.get<Expense[]>('dashboard_expenses') || []);
  const [goals, setGoals] = useState<Goal[]>(() => memoryCache.get<Goal[]>('dashboard_goals') || []);
  const [cards, setCards] = useState<CreditCardType[]>(() => memoryCache.get<CreditCardType[]>('dashboard_cards') || []);
  const [debts, setDebts] = useState<Debt[]>(() => memoryCache.get<Debt[]>('dashboard_debts') || []);
  const [loading, setLoading] = useState(() => !memoryCache.get('dashboard_accounts'));

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.family_id && !user?.id) {
      setLoading(false);
      return;
    }
    // Only set loading to true if we don't have cached data to avoid visual flash on tab transitions
    const hasCache = memoryCache.get('dashboard_accounts') !== null;
    if (!hasCache) {
      setLoading(true);
    }

    try {
      const familyId = profile?.family_id;
      const userId = user?.id || profile?.id;

      // 1. Fetch Accounts
      const accountsQuery = userId
        ? (familyId 
            ? supabase.from('accounts').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`)
            : supabase.from('accounts').select('*').eq('user_id', userId))
        : supabase.from('accounts').select('*').eq('family_id', familyId!);
      const { data: accountsData } = await accountsQuery;
      if (accountsData) {
        setAccounts(accountsData as Account[]);
        memoryCache.set('dashboard_accounts', accountsData);
      }

      // 2. Fetch Incomes
      const incomeQuery = userId
        ? (familyId 
            ? supabase.from('income').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`).order('received_at', { ascending: false })
            : supabase.from('income').select('*').eq('user_id', userId).order('received_at', { ascending: false }))
        : supabase.from('income').select('*').eq('family_id', familyId!).order('received_at', { ascending: false });
      const { data: incomeData } = await incomeQuery;
      if (incomeData) {
        setIncomes(incomeData as Income[]);
        memoryCache.set('dashboard_incomes', incomeData);
      }

      // 3. Fetch Expenses
      const expenseQuery = userId
        ? (familyId 
            ? supabase.from('expenses').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`).order('due_date', { ascending: false })
            : supabase.from('expenses').select('*').eq('user_id', userId).order('due_date', { ascending: false }))
        : supabase.from('expenses').select('*').eq('family_id', familyId!).order('due_date', { ascending: false });
      const { data: expenseData } = await expenseQuery;
      if (expenseData) {
        setExpenses(expenseData as Expense[]);
        memoryCache.set('dashboard_expenses', expenseData);
      }

      // 4. Fetch Goals
      const goalsQuery = userId
        ? (familyId 
            ? supabase.from('goals').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`).limit(6)
            : supabase.from('goals').select('*').eq('user_id', userId).limit(6))
        : supabase.from('goals').select('*').eq('family_id', familyId!).limit(6);
      const { data: goalsData } = await goalsQuery;
      if (goalsData) {
        setGoals(goalsData as Goal[]);
        memoryCache.set('dashboard_goals', goalsData);
      }

      // 5. Fetch Cards
      const cardsQuery = userId
        ? (familyId 
            ? supabase.from('credit_cards').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`)
            : supabase.from('credit_cards').select('*').eq('user_id', userId))
        : supabase.from('credit_cards').select('*').eq('family_id', familyId!);
      const { data: cardsData } = await cardsQuery;
      if (cardsData) {
        setCards(cardsData as CreditCardType[]);
        memoryCache.set('dashboard_cards', cardsData);
      }

      // 6. Fetch Debts
      const debtsQuery = userId
        ? (familyId 
            ? supabase.from('debts').select('*').or(`user_id.eq.${userId},and(family_id.eq.${familyId},user_id.is.null)`)
            : supabase.from('debts').select('*').eq('user_id', userId))
        : supabase.from('debts').select('*').eq('family_id', familyId!);
      const { data: debtsData } = await debtsQuery;
      if (debtsData) {
        setDebts(debtsData as Debt[]);
        memoryCache.set('dashboard_debts', debtsData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id, profile?.id, user?.id]);

  useEffect(() => {
    const hasCache = memoryCache.get('dashboard_accounts');
    if (hasCache) {
      // Defer background revalidation by 400ms to allow route transitions to complete with 0% CPU thread blocking
      const timer = setTimeout(() => {
        fetchDashboardData();
      }, 400);
      return () => clearTimeout(timer);
    } else {
      fetchDashboardData();
    }
  }, [fetchDashboardData]);

  return (
    <FinHouseDashboard
      accounts={accounts}
      incomes={incomes}
      expenses={expenses}
      goals={goals}
      cards={cards}
      debts={debts}
      loading={loading}
      onRefresh={fetchDashboardData}
    />
  );
}
