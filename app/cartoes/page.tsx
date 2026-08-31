'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialGuard } from '@/components/auth/TrialGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { memoryCache } from '@/lib/cache';
import { CreditCard as CreditCardType, CreditCardPurchase } from '@/types/database';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Calendar, 
  AlertCircle, 
  Loader2, 
  Wifi, 
  ShoppingBag, 
  Tag, 
  Wallet, 
  Percent, 
  DollarSign, 
  Filter, 
  ArrowUpRight,
  ShieldCheck,
  Receipt,
  Edit3,
  CheckCircle2,
  X
} from 'lucide-react';

export default function CardsPage() {
  return (
    <AuthGuard>
      <TrialGuard>
        <CardsContent />
      </TrialGuard>
    </AuthGuard>
  );
}

const CARD_COLORS: Record<string, string> = {
  'Amazon': '#ff9900',
  'Azul': '#00a8e8',
  'Banco do Brasil': '#facc15',
  'Banrisul': '#2563eb',
  'Bradesco': '#ef4444',
  'BRB': '#1d4ed8',
  'BTG Pactual': '#0f172a',
  'C6 Bank': '#475569',
  'Caixa Econômica': '#0284c7',
  'Carrefour': '#dc2626',
  'Credicard': '#ef4444',
  'Digio': '#1e3a8a',
  'Inter': '#f97316',
  'Itaú': '#f97316',
  'LATAM Pass': '#dc2626',
  'Magalu': '#3b82f6',
  'Mercado Pago': '#0ea5e9',
  'Neon': '#06b6d4',
  'Next': '#22c55e',
  'Nubank': '#8b5cf6',
  'PagBank': '#10b981',
  'PAN': '#0ea5e9',
  'Pão de Açúcar': '#16a34a',
  'Porto Seguro': '#2563eb',
  'Rico': '#ef4444',
  'Santander': '#dc2626',
  'Sicredi': '#16a34a',
  'Smiles': '#f97316',
  'XP': '#10b981',
  'Outros': '#8b5cf6',
};

interface BankStyle {
  bgGradient: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  badgeBg: string;
  chipColor: string;
  brandText: string;
}

const BANK_STYLES: Record<string, BankStyle> = {
  'Nubank': {
    bgGradient: 'from-[#3b0764]/95 via-[#581c87]/90 to-[#1e0533]/98',
    borderColor: 'border-purple-500/40',
    textColor: 'text-purple-200',
    accentColor: '#c084fc',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'NUBANK',
  },
  'Inter': {
    bgGradient: 'from-[#7c2d12]/95 via-[#c2410c]/90 to-[#1c0902]/98',
    borderColor: 'border-orange-500/40',
    textColor: 'text-orange-200',
    accentColor: '#fb923c',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'INTER',
  },
  'Itaú': {
    bgGradient: 'from-[#9a3412]/95 via-[#1e293b]/95 to-[#0f172a]/98',
    borderColor: 'border-orange-500/40',
    textColor: 'text-orange-200',
    accentColor: '#f97316',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'ITAÚ',
  },
  'Santander': {
    bgGradient: 'from-[#7f1d1d]/95 via-[#450a0a]/90 to-[#0f172a]/98',
    borderColor: 'border-red-500/40',
    textColor: 'text-red-200',
    accentColor: '#f87171',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'SANTANDER',
  },
  'Bradesco': {
    bgGradient: 'from-[#881337]/95 via-[#4c0519]/90 to-[#0f172a]/98',
    borderColor: 'border-rose-500/40',
    textColor: 'text-rose-200',
    accentColor: '#fb7185',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'BRADESCO',
  },
  'C6 Bank': {
    bgGradient: 'from-[#1e293b]/95 via-[#0f172a]/95 to-[#020617]/98',
    borderColor: 'border-slate-400/40',
    textColor: 'text-slate-200',
    accentColor: '#cbd5e1',
    badgeBg: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
    chipColor: 'bg-amber-300/90',
    brandText: 'C6 BANK',
  },
  'BTG Pactual': {
    bgGradient: 'from-[#0f172a]/95 via-[#1e1b4b]/95 to-[#020617]/98',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-200',
    accentColor: '#60a5fa',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'BTG PACTUAL',
  },
  'XP': {
    bgGradient: 'from-[#022c22]/95 via-[#0f172a]/95 to-[#020617]/98',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-200',
    accentColor: '#34d399',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'XP',
  },
  'Banco do Brasil': {
    bgGradient: 'from-[#713f12]/95 via-[#1e3a8a]/90 to-[#020617]/98',
    borderColor: 'border-yellow-500/40',
    textColor: 'text-yellow-200',
    accentColor: '#fde047',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'BANCO DO BRASIL',
  },
  'Caixa Econômica': {
    bgGradient: 'from-[#075985]/95 via-[#1e3a8a]/90 to-[#020617]/98',
    borderColor: 'border-sky-500/40',
    textColor: 'text-sky-200',
    accentColor: '#38bdf8',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'CAIXA',
  },
  'Mercado Pago': {
    bgGradient: 'from-[#0369a1]/95 via-[#0e7490]/90 to-[#020617]/98',
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-200',
    accentColor: '#38bdf8',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'MERCADO PAGO',
  },
  'Amazon': {
    bgGradient: 'from-[#78350f]/95 via-[#1e293b]/95 to-[#020617]/98',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-200',
    accentColor: '#fbbf24',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'AMAZON',
  },
  'Azul': {
    bgGradient: 'from-[#0284c7]/95 via-[#0369a1]/90 to-[#020617]/98',
    borderColor: 'border-sky-400/40',
    textColor: 'text-sky-200',
    accentColor: '#38bdf8',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'AZUL',
  },
  'Neon': {
    bgGradient: 'from-[#0e7490]/95 via-[#06b6d4]/85 to-[#020617]/98',
    borderColor: 'border-cyan-400/40',
    textColor: 'text-cyan-200',
    accentColor: '#22d3ee',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'NEON',
  },
  'Next': {
    bgGradient: 'from-[#14532d]/95 via-[#15803d]/85 to-[#020617]/98',
    borderColor: 'border-green-400/40',
    textColor: 'text-green-200',
    accentColor: '#4ade80',
    badgeBg: 'bg-green-500/20 text-green-300 border-green-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'NEXT',
  },
  'PagBank': {
    bgGradient: 'from-[#065f46]/95 via-[#0f766e]/85 to-[#020617]/98',
    borderColor: 'border-emerald-400/40',
    textColor: 'text-emerald-200',
    accentColor: '#34d399',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    chipColor: 'bg-amber-300/90',
    brandText: 'PAGBANK',
  },
};

const DEFAULT_BANK_STYLE: BankStyle = {
  bgGradient: 'from-[#1e1b4b]/95 via-[#312e81]/90 to-[#020617]/98',
  borderColor: 'border-purple-500/40',
  textColor: 'text-purple-200',
  accentColor: '#a855f7',
  badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  chipColor: 'bg-amber-300/90',
  brandText: 'CARTÃO DE CRÉDITO',
};

function getBankStyle(cardName: string): BankStyle {
  const nameLower = cardName.toLowerCase();
  
  if (nameLower.includes('nubank')) return BANK_STYLES['Nubank'];
  if (nameLower.includes('inter')) return BANK_STYLES['Inter'];
  if (nameLower.includes('itaú') || nameLower.includes('itau')) return BANK_STYLES['Itaú'];
  if (nameLower.includes('santander')) return BANK_STYLES['Santander'];
  if (nameLower.includes('bradesco')) return BANK_STYLES['Bradesco'];
  if (nameLower.includes('c6')) return BANK_STYLES['C6 Bank'];
  if (nameLower.includes('btg')) return BANK_STYLES['BTG Pactual'];
  if (nameLower.includes('xp')) return BANK_STYLES['XP'];
  if (nameLower.includes('brasil') || nameLower.includes('bb')) return BANK_STYLES['Banco do Brasil'];
  if (nameLower.includes('caixa')) return BANK_STYLES['Caixa Econômica'];
  if (nameLower.includes('mercado') || nameLower.includes('pagopago')) return BANK_STYLES['Mercado Pago'];
  if (nameLower.includes('amazon')) return BANK_STYLES['Amazon'];
  if (nameLower.includes('azul')) return BANK_STYLES['Azul'];
  if (nameLower.includes('neon')) return BANK_STYLES['Neon'];
  if (nameLower.includes('next')) return BANK_STYLES['Next'];
  if (nameLower.includes('pagbank')) return BANK_STYLES['PagBank'];

  return DEFAULT_BANK_STYLE;
}

function CardsContent() {
  const { profile, user } = useAuth();
  const [cards, setCards] = useState<CreditCardType[]>(() => memoryCache.get<CreditCardType[]>('cards_list') || []);
  const [purchases, setPurchases] = useState<CreditCardPurchase[]>(() => memoryCache.get<CreditCardPurchase[]>('cards_purchases') || []);
  const [loading, setLoading] = useState(() => !memoryCache.get('cards_list'));

  const [filterCardId, setFilterCardId] = useState<string>('ALL');
  
  // Card Modal
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardName, setCardName] = useState('Nubank');
  const [customCardName, setCustomCardName] = useState('');
  const [lastDigits, setLastDigits] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState(1);
  const [dueDay, setDueDay] = useState(10);

  const handleOpenNewCardModal = () => {
    setEditingCardId(null);
    setCardName('Nubank');
    setCustomCardName('');
    setLastDigits('');
    setCreditLimit('');
    setClosingDay(1);
    setDueDay(10);
    setErrorMsg('');
    setCardModalOpen(true);
  };

  const handleOpenEditCardModal = (card: CreditCardType) => {
    setEditingCardId(card.id);
    const isStandard = Object.keys(CARD_COLORS).includes(card.name);
    if (isStandard) {
      setCardName(card.name);
      setCustomCardName('');
    } else {
      setCardName('Outros');
      setCustomCardName(card.name);
    }
    setLastDigits(card.last_digits || '');
    setCreditLimit(card.credit_limit !== undefined && card.credit_limit !== null ? String(card.credit_limit) : '');
    setClosingDay(card.closing_day || 1);
    setDueDay(card.due_day || 10);
    setErrorMsg('');
    setCardModalOpen(true);
  };

  // Purchase Modal
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [purchaseDesc, setPurchaseDesc] = useState('Mercado');
  const [customPurchaseDesc, setCustomPurchaseDesc] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState('Geral');
  const [customCategory, setCustomCategory] = useState('');
  const [installments, setInstallments] = useState(1);
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Settle / Payment Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedCardForSettle, setSelectedCardForSettle] = useState<CreditCardType | null>(null);
  const [confirmSettleModalOpen, setConfirmSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleType, setSettleType] = useState<'total' | 'partial'>('total');
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);
  const [settling, setSettling] = useState(false);

  const handleOpenSettleModal = (card?: CreditCardType) => {
    if (card) {
      setSelectedCardForSettle(card);
      setSettleAmount(String(card.current_bill || 0));
    } else if (cards.length > 0) {
      setSelectedCardForSettle(cards[0]);
      setSettleAmount(String(cards[0].current_bill || 0));
    }
    setSettleType('total');
    setSelectedPurchaseIds([]);
    setSettleModalOpen(true);
  };

  const handleTogglePurchaseSettle = (pId: string) => {
    if (!selectedCardForSettle) return;
    const cardPurchases = purchases.filter(p => p.card_id === selectedCardForSettle.id);
    
    let newSelected: string[];
    if (selectedPurchaseIds.includes(pId)) {
      newSelected = selectedPurchaseIds.filter(id => id !== pId);
    } else {
      newSelected = [...selectedPurchaseIds, pId];
    }
    setSelectedPurchaseIds(newSelected);

    const sum = cardPurchases
      .filter(p => newSelected.includes(p.id))
      .reduce((acc, p) => acc + (p.total_installments > 1 ? p.amount / p.total_installments : p.amount), 0);

    setSettleAmount(sum > 0 ? sum.toFixed(2).replace('.', ',') : '');
  };

  const handleConfirmSettle = async () => {
    if (!selectedCardForSettle) return;
    const currentBill = Number(selectedCardForSettle.current_bill || 0);
    const rawAmountStr = settleAmount.replace(',', '.');
    const parsedAmount = settleType === 'total' ? currentBill : parseFloat(rawAmountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Informe um valor válido para quitação.');
      return;
    }

    if (parsedAmount > currentBill && settleType === 'total') {
      setErrorMsg('O valor da quitação não pode ser superior à fatura atual.');
      return;
    }

    setSettling(true);
    try {
      const newBill = Math.max(0, currentBill - parsedAmount);

      if (settleType === 'partial' && selectedPurchaseIds.length > 0) {
        await supabase
          .from('credit_card_purchases')
          .delete()
          .in('id', selectedPurchaseIds);
      } else if (settleType === 'total') {
        await supabase
          .from('credit_card_purchases')
          .delete()
          .eq('card_id', selectedCardForSettle.id);
      }

      const { error } = await supabase
        .from('credit_cards')
        .update({ current_bill: newBill })
        .eq('id', selectedCardForSettle.id);

      if (error) {
        setErrorMsg(error.message);
      } else {
        setConfirmSettleModalOpen(false);
        setSettleModalOpen(false);
        setSelectedCardForSettle(null);
        setSettleAmount('');
        setSelectedPurchaseIds([]);
        memoryCache.set('cards_list', null);
        memoryCache.set('cards_purchases', null);
        await loadData();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao quitar fatura');
    } finally {
      setSettling(false);
    }
  };

  const handleOpenNewPurchaseModal = () => {
    setEditingPurchaseId(null);
    if (cards.length > 0 && !selectedCardId) {
      setSelectedCardId(cards[0].id);
    }
    setPurchaseDesc('Mercado');
    setCustomPurchaseDesc('');
    setPurchaseAmount('');
    setPurchaseCategory('Geral');
    setCustomCategory('');
    setInstallments(1);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setPurchaseModalOpen(true);
  };

  const handleOpenEditPurchaseModal = (pur: CreditCardPurchase) => {
    setEditingPurchaseId(pur.id);
    setSelectedCardId(pur.card_id);
    const isStdDesc = ['Mercado', 'Combustível', 'Restaurante', 'Farmácia', 'Assinatura', 'Eletrônicos'].includes(pur.description);
    if (isStdDesc) {
      setPurchaseDesc(pur.description);
      setCustomPurchaseDesc('');
    } else {
      setPurchaseDesc('Outros');
      setCustomPurchaseDesc(pur.description);
    }
    setPurchaseAmount(pur.amount !== undefined && pur.amount !== null ? String(pur.amount) : '');
    const isStdCat = ['Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Serviços'].includes(pur.category || '');
    if (isStdCat) {
      setPurchaseCategory(pur.category || 'Geral');
      setCustomCategory('');
    } else {
      setPurchaseCategory('Outros');
      setCustomCategory(pur.category || '');
    }
    setInstallments(pur.total_installments || 1);
    setPurchaseDate(pur.purchase_date ? pur.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setPurchaseModalOpen(true);
  };

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    if (!profile?.family_id) {
      setLoading(false);
      return;
    }
    // Only set loading if there is no cache to keep transitions seamless
    if (!memoryCache.get('cards_list')) {
      setLoading(true);
    }
    try {
      const { data: cardsData } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('family_id', profile.family_id)
        .order('created_at', { ascending: false });
      if (cardsData) {
        setCards(cardsData as CreditCardType[]);
        memoryCache.set('cards_list', cardsData);
        if (cardsData.length > 0) {
          setSelectedCardId(prev => prev || cardsData[0].id);
        }
      }

      const { data: purData } = await supabase
        .from('credit_card_purchases')
        .select('*')
        .eq('family_id', profile.family_id)
        .order('purchase_date', { ascending: false });
      if (purData) {
        setPurchases(purData as CreditCardPurchase[]);
        memoryCache.set('cards_purchases', purData);
      }
    } catch (err) {
      console.error('Error fetching cards:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.family_id]);

  useEffect(() => {
    const hasCache = memoryCache.get('cards_list');
    if (hasCache) {
      // Defer background revalidation by 400ms to allow route transitions to complete with 0% CPU thread blocking
      const timer = setTimeout(() => {
        loadData();
      }, 400);
      return () => clearTimeout(timer);
    } else {
      loadData();
    }
  }, [loadData]);

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();

    const isCardNameEmpty = cardName === 'Outros' ? !customCardName.trim() : !cardName.trim();
    const isLimitInvalid = !creditLimit || parseFloat(creditLimit.replace(',', '.')) <= 0;

    if (isCardNameEmpty || isLimitInvalid) {
      setErrorMsg('Informe o nome do cartão e o limite.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const finalCardName = cardName === 'Outros' ? customCardName.trim() : cardName;
      const finalColor = CARD_COLORS[cardName] || '#8b5cf6';

      if (editingCardId) {
        const { error } = await supabase.from('credit_cards').update({
          name: finalCardName.trim(),
          last_digits: lastDigits.trim() || null,
          credit_limit: parseFloat(creditLimit.replace(',', '.')),
          closing_day: Number(closingDay),
          due_day: Number(dueDay),
          color: finalColor,
        }).eq('id', editingCardId);

        if (error) {
          setErrorMsg(error.message);
        } else {
          setCardModalOpen(false);
          memoryCache.set('cards_list', null);
          await loadData();
        }
      } else {
        const { error } = await supabase.from('credit_cards').insert({
          family_id: profile?.family_id,
          user_id: user?.id,
          name: finalCardName.trim(),
          last_digits: lastDigits.trim() || null,
          credit_limit: parseFloat(creditLimit.replace(',', '.')),
          current_bill: 0,
          closing_day: Number(closingDay),
          due_day: Number(dueDay),
          color: finalColor,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setCardModalOpen(false);
          memoryCache.set('cards_list', null);
          await loadData();
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar cartão');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    const isDescriptionEmpty = purchaseDesc === 'Outros' ? !customPurchaseDesc.trim() : !purchaseDesc.trim();
    const isCategoryEmpty = purchaseCategory === 'Outros' ? !customCategory.trim() : !purchaseCategory.trim();
    const isAmountInvalid = !purchaseAmount || parseFloat(purchaseAmount.replace(',', '.')) <= 0;

    if (!selectedCardId) {
      setErrorMsg('Selecione um cartão de crédito.');
      return;
    }
    if (isDescriptionEmpty && isAmountInvalid) {
      setErrorMsg('Informe a descrição e o valor.');
      return;
    }
    if (isDescriptionEmpty) {
      setErrorMsg('Informe a descrição.');
      return;
    }
    if (isAmountInvalid) {
      setErrorMsg('Informe o valor.');
      return;
    }
    if (isCategoryEmpty) {
      setErrorMsg('Informe a categoria.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const parsedAmount = parseFloat(purchaseAmount.replace(',', '.'));
      const finalCategory = purchaseCategory === 'Outros' ? customCategory.trim() : purchaseCategory;
      const finalDescription = purchaseDesc === 'Outros' ? customPurchaseDesc.trim() : purchaseDesc;

      if (editingPurchaseId) {
        const oldPur = purchases.find(p => p.id === editingPurchaseId);
        const oldAmount = oldPur ? Number(oldPur.amount || 0) : 0;
        const oldCardId = oldPur ? oldPur.card_id : null;

        const { error } = await supabase.from('credit_card_purchases').update({
          card_id: selectedCardId,
          description: finalDescription.trim(),
          amount: parsedAmount,
          category: finalCategory,
          total_installments: Number(installments),
          purchase_date: purchaseDate,
        }).eq('id', editingPurchaseId);

        if (error) {
          setErrorMsg(error.message);
        } else {
          if (oldCardId === selectedCardId) {
            const diff = parsedAmount - oldAmount;
            if (diff !== 0) {
              const card = cards.find(c => c.id === selectedCardId);
              if (card) {
                const newBill = Math.max(0, Number(card.current_bill || 0) + diff);
                await supabase.from('credit_cards').update({ current_bill: newBill }).eq('id', selectedCardId);
              }
            }
          } else {
            if (oldCardId) {
              const oldCard = cards.find(c => c.id === oldCardId);
              if (oldCard) {
                const newBillOld = Math.max(0, Number(oldCard.current_bill || 0) - oldAmount);
                await supabase.from('credit_cards').update({ current_bill: newBillOld }).eq('id', oldCardId);
              }
            }
            const newCard = cards.find(c => c.id === selectedCardId);
            if (newCard) {
              const newBillNew = Number(newCard.current_bill || 0) + parsedAmount;
              await supabase.from('credit_cards').update({ current_bill: newBillNew }).eq('id', selectedCardId);
            }
          }

          setPurchaseModalOpen(false);
          memoryCache.set('cards_purchases', null);
          await loadData();
        }
      } else {
        const { error } = await supabase.from('credit_card_purchases').insert({
          family_id: profile?.family_id,
          card_id: selectedCardId,
          description: finalDescription.trim(),
          amount: parsedAmount,
          category: finalCategory,
          purchase_date: purchaseDate,
          total_installments: Number(installments),
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          const card = cards.find(c => c.id === selectedCardId);
          if (card) {
            const installmentValue = parsedAmount / Number(installments);
            await supabase
              .from('credit_cards')
              .update({ current_bill: Number(card.current_bill || 0) + installmentValue })
              .eq('id', selectedCardId);
          }

          setPurchaseDesc('Mercado');
          setCustomPurchaseDesc('');
          setPurchaseCategory('Geral');
          setCustomCategory('');
          setPurchaseAmount('');
          setErrorMsg('');
          setPurchaseModalOpen(false);
          await loadData();
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar compra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Deseja excluir este cartão? Todas as compras associadas serão removidas.')) return;
    await supabase.from('credit_cards').delete().eq('id', id);
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const handleDeletePurchase = async (purchase: CreditCardPurchase) => {
    if (!confirm(`Deseja remover a compra "${purchase.description}"?`)) return;
    
    const { error } = await supabase
      .from('credit_card_purchases')
      .delete()
      .eq('id', purchase.id);

    if (!error) {
      const card = cards.find(c => c.id === purchase.card_id);
      if (card) {
        const newBill = Math.max(0, Number(card.current_bill || 0) - Number(purchase.amount || 0));
        await supabase
          .from('credit_cards')
          .update({ current_bill: newBill })
          .eq('id', card.id);
      }
      await loadData();
    }
  };

  const totalLimits = cards.reduce((acc, curr) => acc + Number(curr.credit_limit || 0), 0);
  const totalBills = cards.reduce((acc, curr) => acc + Number(curr.current_bill || 0), 0);
  const totalAvailable = Math.max(0, totalLimits - totalBills);

  const filteredPurchases = filterCardId === 'ALL' 
    ? purchases 
    : purchases.filter(p => p.card_id === filterCardId);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-2xl text-purple-400 shadow-lg shadow-purple-500/10">
                <CreditCard className="w-5 h-5" />
              </div>
              <span>Cartões de Crédito & Faturas</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Acompanhe limites, fatura atual, vencimentos e compras parceladas da família
            </p>
          </div>

          <div className="flex items-center gap-2.5 relative z-10">
            {cards.length > 0 && (
              <button
                onClick={handleOpenNewPurchaseModal}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Lançar Compra</span>
              </button>
            )}

            <button
              onClick={handleOpenNewCardModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/25 border border-purple-400/20 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cartão</span>
            </button>
          </div>
        </div>



        {/* Cards Grid Header */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <span>Meus Cartões de Crédito</span>
          </h2>
          {cards.length > 0 && (
            <span className="text-xs text-slate-400">
              {cards.length} {cards.length === 1 ? 'cartão ativo' : 'cartões ativos'}
            </span>
          )}
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px]">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span>Carregando cartões do Supabase...</span>
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-12 text-center space-y-3 shadow-2xl">
            <CreditCard className="w-12 h-12 text-purple-400/50 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">Nenhum cartão cadastrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cadastre os cartões de crédito da família (Nubank, Inter, Itaú, Santander, etc) para organizar suas faturas e limites.
            </p>
            <button
              onClick={handleOpenNewCardModal}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/25 border border-purple-400/20"
            >
              + Cadastrar Primeiro Cartão
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card) => {
              const style = getBankStyle(card.name);
              const limit = Number(card.credit_limit || 0);
              const bill = Number(card.current_bill || 0);
              const available = Math.max(0, limit - bill);
              const percentUsed = limit > 0 ? Math.min(100, Math.round((bill / limit) * 100)) : 0;

              return (
                <div 
                  key={card.id} 
                  className={`bg-gradient-to-br ${style.bgGradient} backdrop-blur-2xl border ${style.borderColor} rounded-[20px] p-4 space-y-3 relative overflow-hidden shadow-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-purple-500/10 group`}
                >
                  {/* Subtle Card Glow Effect */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none group-hover:bg-white/10 transition" />
                  
                  {/* Top Bar: Bank Brand Badge + Trash */}
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-2.5">
                      {/* Bank Brand Avatar Icon */}
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm font-bold text-xs"
                        style={{ 
                          backgroundColor: `${card.color || style.accentColor}25`, 
                          borderColor: `${card.color || style.accentColor}50`,
                          color: card.color || style.accentColor 
                        }}
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tracking-wide">
                            {card.name}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${style.badgeBg} uppercase tracking-wider`}>
                            {style.brandText}
                          </span>
                        </div>
                        <div className="text-[10px] tracking-widest text-slate-400 font-mono">
                          {card.last_digits ? `•••• ${card.last_digits}` : '•••• ••••'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-slate-400/60 rotate-90 mr-0.5" />
                      <button
                        onClick={() => handleOpenEditCardModal(card)}
                        title="Editar Cartão"
                        className="p-1 text-slate-400 hover:text-purple-400 transition rounded-lg hover:bg-white/10 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        title="Excluir Cartão"
                        className="p-1 text-slate-400 hover:text-rose-400 transition rounded-lg hover:bg-white/10 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Fatura & Limite Section */}
                  <div className="space-y-1.5 pt-2 border-t border-white/10 relative z-10">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-300 font-medium">Fatura Atual:</span>
                      <span className="font-mono font-extrabold text-base text-white">
                        R$ {bill.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Usage Progress Gauge */}
                    <div className="space-y-0.5">
                      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentUsed > 85 ? 'bg-rose-500' : percentUsed > 50 ? 'bg-amber-500' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>{percentUsed}% usado</span>
                        <span>Disp: R$ {available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Dates Footer & Quick Action */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300 relative z-10">
                    <div className="flex items-center gap-2">
                      <span>Fecha <strong className="text-white">dia {card.closing_day}</strong></span>
                      <span className="text-slate-600">•</span>
                      <span>Vence <strong className="text-white">dia {card.due_day}</strong></span>
                    </div>

                    <button
                      onClick={() => handleOpenSettleModal(card)}
                      className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold rounded-md transition border border-emerald-500/30 flex items-center gap-1 active:scale-95 cursor-pointer"
                      title="Quitar Fatura"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Card Purchases & Invoices History Section */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 space-y-5 shadow-2xl mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-400" />
                <span>Histórico de Lançamentos na Fatura</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Veja as compras realizadas com seus cartões de crédito
              </p>
            </div>

            {/* Filter by Card */}
            {cards.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterCardId}
                  onChange={(e) => setFilterCardId(e.target.value)}
                  className="px-3 py-1.5 bg-[#0f172a] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="ALL">Todos os Cartões</option>
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs">Nenhuma compra registrada nesta fatura ainda.</p>
              {cards.length > 0 && (
                <button
                  onClick={() => setPurchaseModalOpen(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
                >
                  + Lançar primeira compra
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPurchases.map((purchase) => {
                const card = cards.find(c => c.id === purchase.card_id);
                return (
                  <div 
                    key={purchase.id}
                    className="p-3.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 shrink-0">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {purchase.description}
                          </span>
                          {purchase.total_installments && purchase.total_installments > 1 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full font-mono">
                              {purchase.total_installments}x
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="text-purple-300 font-medium">{card?.name || 'Cartão'}</span>
                          <span>•</span>
                          <span>{purchase.category || 'Geral'}</span>
                          <span>•</span>
                          <span>{purchase.purchase_date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <span className="text-sm font-bold font-mono text-purple-400">
                        R$ {Number(purchase.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditPurchaseModal(purchase)}
                          className="p-1 text-slate-400 hover:text-purple-400 transition rounded-lg hover:bg-white/10"
                          title="Editar Compra"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePurchase(purchase)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition rounded-lg hover:bg-white/10"
                          title="Remover Compra"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Novo Cartão */}
      {cardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              <span>{editingCardId ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}</span>
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveCard} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Nome / Instituição do Cartão</label>
                <select
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {Object.keys(CARD_COLORS).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {cardName === 'Outros' && (
                  <input
                    type="text"
                    required
                    value={customCardName}
                    onChange={(e) => setCustomCardName(e.target.value)}
                    placeholder="Digite o nome do cartão"
                    className="w-full mt-2 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Últimos 4 Dígitos</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={lastDigits}
                    onChange={(e) => setLastDigits(e.target.value)}
                    placeholder="Ex: 1234"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Limite Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="5000.00"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Dia de Fechamento</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={closingDay}
                    onChange={(e) => setClosingDay(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Dia de Vencimento</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/25 border border-purple-400/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? 'Salvando...' : (editingCardId ? 'Atualizar Cartão' : 'Salvar Cartão')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Compra */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" />
              <span>{editingPurchaseId ? 'Editar Compra na Fatura' : 'Lançar Compra no Cartão'}</span>
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePurchase} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Cartão de Crédito</label>
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Descrição da Compra</label>
                <select
                  value={purchaseDesc}
                  onChange={(e) => setPurchaseDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="Mercado">Mercado / Supermercado</option>
                  <option value="Restaurante">Restaurante / Delivery</option>
                  <option value="Farmácia">Farmácia</option>
                  <option value="Combustível">Combustível</option>
                  <option value="Assinaturas">Assinaturas (Netflix, Spotify, etc)</option>
                  <option value="Passagem Aérea">Passagem Aérea</option>
                  <option value="Hospedagem">Hospedagem</option>
                  <option value="Roupas">Roupas / Vestuário</option>
                  <option value="Outros">Outra (Digitar)</option>
                </select>
                {purchaseDesc === 'Outros' && (
                  <input
                    type="text"
                    required
                    value={customPurchaseDesc}
                    onChange={(e) => setCustomPurchaseDesc(e.target.value)}
                    placeholder="Digite a descrição da compra"
                    className="w-full mt-2 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Categoria</label>
                <select
                  value={purchaseCategory}
                  onChange={(e) => setPurchaseCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="Geral">Geral</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Educação">Educação</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Serviços">Serviços</option>
                  <option value="Outros">Outra (Digitar)</option>
                </select>
                {purchaseCategory === 'Outros' && (
                  <input
                    type="text"
                    placeholder="Digite a categoria"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    required
                    className="w-full mt-2 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Data da Compra</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 ml-1">Número de Parcelas</label>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 ml-1">Valor Total (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
                />
              </div>

              {Number(installments) > 1 && Number(purchaseAmount) > 0 && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-purple-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Repartição das Parcelas ({installments}x)
                    </span>
                    <span className="font-mono font-bold">
                      R$ {(Number(purchaseAmount) / Number(installments)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês
                    </span>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5">
                    {Array.from({ length: Math.min(Number(installments), 12) }).map((_, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center justify-center px-2 py-1 bg-white/5 border border-white/10 rounded-lg shrink-0 text-[10px]"
                      >
                        <span className="text-slate-400">{i + 1}ª</span>
                        <span className="text-purple-300 font-mono font-semibold">
                          {(Number(purchaseAmount) / Number(installments)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                    {Number(installments) > 12 && (
                      <div className="px-2 py-1 text-[10px] text-slate-400 shrink-0">
                        +{Number(installments) - 12} mais
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/25 border border-purple-400/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? 'Salvando...' : (editingPurchaseId ? 'Atualizar Compra' : 'Confirmar Compra')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle / Pending Bills Modal */}
      {settleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full max-w-lg rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Faturas Pendentes para Quitação</span>
              </h3>
              <button
                onClick={() => setSettleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white transition rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {cards.filter(c => Number(c.current_bill || 0) > 0).length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400/50 mx-auto" />
                  <p className="text-sm font-semibold text-slate-200">Parabéns! Nenhuma fatura pendente</p>
                  <p className="text-xs text-slate-500">Todos os seus cartões estão com fatura zerada ou quitada.</p>
                </div>
              ) : (
                cards.filter(c => Number(c.current_bill || 0) > 0).map(card => {
                  const bill = Number(card.current_bill || 0);
                  return (
                    <div
                      key={card.id}
                      className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between gap-4 transition hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{card.name}</h4>
                          <p className="text-xs text-slate-400">
                            Vencimento dia <strong className="text-slate-200">{card.due_day}</strong> • Final {card.last_digits || '----'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          <div className="text-xs text-slate-400">Fatura Atual</div>
                          <div className="text-sm font-mono font-extrabold text-emerald-400">
                            R$ {bill.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCardForSettle(card);
                            setConfirmSettleModalOpen(true);
                          }}
                          className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Settle / Payment */}
      {confirmSettleModalOpen && selectedCardForSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className={`bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 w-full rounded-[28px] p-6 space-y-4 shadow-2xl transition-all ${settleType === 'partial' ? 'max-w-md sm:max-w-lg' : 'max-w-sm'}`}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1 text-center">
              <h3 className="text-base font-bold text-white">Quitar Fatura - {selectedCardForSettle.name}</h3>
              <p className="text-xs text-slate-300">
                Fatura atual: <strong className="text-emerald-400 font-mono">R$ {Number(selectedCardForSettle.current_bill || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettleType('total');
                    setSettleAmount(String(selectedCardForSettle.current_bill || 0));
                    setSelectedPurchaseIds([]);
                    setErrorMsg('');
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    settleType === 'total'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Valor Total
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettleType('partial');
                    setErrorMsg('');
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    settleType === 'partial'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Valor Parcial
                </button>
              </div>

              {settleType === 'partial' && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-300">Valor a Pagar (R$)</label>
                      {selectedPurchaseIds.length > 0 && (
                        <span className="text-[10px] text-emerald-400 font-medium">
                          {selectedPurchaseIds.length} lançamento(s) selecionado(s)
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-3.5 py-2 bg-[#0b1329] border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  {/* Purchase History for Card */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-purple-400" />
                        Lançamentos na Fatura
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const cardPurchases = purchases.filter(p => p.card_id === selectedCardForSettle.id);
                          if (selectedPurchaseIds.length === cardPurchases.length && cardPurchases.length > 0) {
                            setSelectedPurchaseIds([]);
                            setSettleAmount('0');
                          } else {
                            const allIds = cardPurchases.map(p => p.id);
                            setSelectedPurchaseIds(allIds);
                            const sum = cardPurchases.reduce((acc, p) => acc + (p.total_installments > 1 ? p.amount / p.total_installments : p.amount), 0);
                            setSettleAmount(sum > 0 ? sum.toFixed(2).replace('.', ',') : '');
                          }
                        }}
                        className="text-[10px] text-purple-300 hover:text-purple-200 font-medium cursor-pointer"
                      >
                        {selectedPurchaseIds.length === purchases.filter(p => p.card_id === selectedCardForSettle.id).length && purchases.filter(p => p.card_id === selectedCardForSettle.id).length > 0
                          ? 'Desmarcar todos'
                          : 'Selecionar todos'}
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-left">
                      {purchases.filter(p => p.card_id === selectedCardForSettle.id).length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500 bg-white/[0.02] border border-white/5 rounded-xl">
                          Nenhum lançamento individual encontrado para este cartão.
                        </div>
                      ) : (
                        purchases
                          .filter(p => p.card_id === selectedCardForSettle.id)
                          .map(pur => {
                            const isSelected = selectedPurchaseIds.includes(pur.id);
                            const itemVal = pur.total_installments > 1 ? (pur.amount / pur.total_installments) : pur.amount;
                            const dateStr = pur.purchase_date ? new Date(pur.purchase_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data';

                            return (
                              <div
                                key={pur.id}
                                onClick={() => handleTogglePurchaseSettle(pur.id)}
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // Handled by parent div onClick
                                    className="w-4 h-4 rounded border-white/20 text-emerald-500 focus:ring-emerald-500/50 bg-white/5 cursor-pointer shrink-0"
                                  />
                                  <div className="truncate">
                                    <div className="font-semibold text-white truncate text-xs">{pur.description}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                      <span>{dateStr}</span>
                                      {pur.category && <span>• {pur.category}</span>}
                                      {pur.total_installments > 1 && (
                                        <span className="text-purple-300 font-medium">({pur.total_installments}x)</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="font-mono font-bold text-emerald-400 text-xs">
                                    R$ {itemVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                  {pur.total_installments > 1 && (
                                    <div className="text-[9px] text-slate-500 font-mono">
                                      Tot: R$ {Number(pur.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={settling}
                onClick={() => setConfirmSettleModalOpen(false)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={settling}
                onClick={handleConfirmSettle}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {settling ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

