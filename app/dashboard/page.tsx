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
  const { profile, family, user, refreshProfile } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>(() => memoryCache.get<Account[]>('dashboard_accounts') || []);
  const [incomes, setIncomes] = useState<Income[]>(() => memoryCache.get<Income[]>('dashboard_incomes') || []);
  const [expenses, setExpenses] = useState<Expense[]>(() => memoryCache.get<Expense[]>('dashboard_expenses') || []);
  const [goals, setGoals] = useState<Goal[]>(() => memoryCache.get<Goal[]>('dashboard_goals') || []);
  const [cards, setCards] = useState<CreditCardType[]>(() => memoryCache.get<CreditCardType[]>('dashboard_cards') || []);
  const [debts, setDebts] = useState<Debt[]>(() => memoryCache.get<Debt[]>('dashboard_debts') || []);
  const [loading, setLoading] = useState(() => !memoryCache.get('dashboard_accounts'));

  // Recovery migration for family_id mismatch to restore historical data
  useEffect(() => {
    async function recoverFamilyId() {
      const correctFamilyId = '8853acf1-f040-4b4e-b807-05bb97eca7a8';
      if (profile?.id && profile?.family_id && profile?.family_id !== correctFamilyId) {
        const wrongFamilyId = profile.family_id;
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ family_id: correctFamilyId })
            .eq('id', profile.id);
          
          if (!error) {
            await supabase
              .from('family_members')
              .delete()
              .eq('family_id', wrongFamilyId)
              .eq('user_id', profile.id);

            await supabase
              .from('families')
              .delete()
              .eq('id', wrongFamilyId);

            await refreshProfile();
          }
        } catch (e) {
          console.error('Migration failed:', e);
        }
      }
    }
    recoverFamilyId();
  }, [profile, refreshProfile]);

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
      const accountsQuery = familyId
        ? supabase.from('accounts').select('*').or(`family_id.eq.${familyId},user_id.eq.${userId}`)
        : supabase.from('accounts').select('*').eq('user_id', userId!);
      const { data: accountsData } = await accountsQuery;
      if (accountsData) {
        setAccounts(accountsData as Account[]);
        memoryCache.set('dashboard_accounts', accountsData);
      }

      // 2. Fetch Incomes
      const incomeQuery = familyId
        ? supabase.from('income').select('*').or(`family_id.eq.${familyId},user_id.eq.${userId}`).order('received_at', { ascending: false })
        : supabase.from('income').select('*').eq('user_id', userId!).order('received_at', { ascending: false });
      const { data: incomeData } = await incomeQuery;
      if (incomeData) {
        setIncomes(incomeData as Income[]);
        memoryCache.set('dashboard_incomes', incomeData);
      }

      // 3. Fetch Expenses
      const expenseQuery = familyId
        ? supabase.from('expenses').select('*').or(`family_id.eq.${familyId},user_id.eq.${userId}`).order('due_date', { ascending: false })
        : supabase.from('expenses').select('*').eq('user_id', userId!).order('due_date', { ascending: false });
      const { data: expenseData } = await expenseQuery;
      if (expenseData) {
        setExpenses(expenseData as Expense[]);
        memoryCache.set('dashboard_expenses', expenseData);
      }

      // 4. Fetch Goals
      const goalsQuery = familyId
        ? supabase.from('goals').select('*').or(`family_id.eq.${familyId},user_id.eq.${userId}`).limit(6)
        : supabase.from('goals').select('*').eq('user_id', userId!).limit(6);
      const { data: goalsData } = await goalsQuery;
      if (goalsData) {
        setGoals(goalsData as Goal[]);
        memoryCache.set('dashboard_goals', goalsData);
      }

      // 5. Fetch Cards
      const cardsQuery = familyId
        ? supabase.from('credit_cards').select('*').or(`family_id.eq.${familyId},user_id.eq.${userId}`)
        : supabase.from('credit_cards').select('*').eq('user_id', userId!);
      const { data: cardsData } = await cardsQuery;
      if (cardsData) {
        setCards(cardsData as CreditCardType[]);
        memoryCache.set('dashboard_cards', cardsData);
      }

      // 6. Fetch Debts
      const debtsQuery = familyId
        ? supabase.from('debts').select('*').or(`family_id.eq.${familyId},user_id.eq.${userId}`)
        : supabase.from('debts').select('*').eq('user_id', userId!);
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
