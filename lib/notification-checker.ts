import { supabase } from '@/lib/supabase';
import { encodeNotificationMessage } from '@/lib/push-notifications';

export interface NotificationCheckResult {
  success: boolean;
  processed?: number;
  sent: number;
  notifications: Array<{ title: string; message: string; target_url: string }>;
  error?: string;
}

export async function checkAndSendNotifications(targetUserId?: string): Promise<NotificationCheckResult> {
  try {
    // 1. Fetch target profiles or all profiles if no specific user requested
    let profilesQuery = supabase.from('profiles').select('id, family_id, full_name, email');
    if (targetUserId) {
      profilesQuery = profilesQuery.eq('id', targetUserId);
    }
    const { data: profiles, error: pErr } = await profilesQuery;

    if (pErr || !profiles || profiles.length === 0) {
      return { success: true, processed: 0, sent: 0, notifications: [] };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    let totalNotificationsSent = 0;
    const detailsSent: Array<{ title: string; message: string; target_url: string }> = [];

    for (const userProfile of profiles) {
      const userId = userProfile.id;
      const familyId = userProfile.family_id;

      if (!familyId) continue;

      // Fetch user notification settings
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const billsEnabled = settings?.bills_enabled ?? true;
      const cardsEnabled = settings?.cards_enabled ?? true;
      const invoicesEnabled = settings?.invoices_enabled ?? true;
      const installmentsEnabled = settings?.installments_enabled ?? true;
      const loansEnabled = settings?.loans_enabled ?? true;
      const budgetEnabled = settings?.budget_enabled ?? true;
      const trialEnabled = settings?.trial_enabled ?? true;

      // Helper to check if already logged in notifications table using encoded metadata
      const isAlreadyNotified = async (type: string, refId: string) => {
        try {
          const { data, error } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .ilike('message', `%ref=${refId}%`)
            .limit(1);

          if (error) {
            console.error('isAlreadyNotified query error:', error);
            return false;
          }
          return Boolean(data && data.length > 0);
        } catch (err) {
          console.error('isAlreadyNotified exception:', err);
          return false;
        }
      };

      // Helper to record notification & log
      const sendNotification = async (
        type: string,
        refId: string,
        title: string,
        message: string,
        targetUrl: string
      ) => {
        try {
          if (await isAlreadyNotified(type, refId)) return false;

          // Encode type, refId, and targetUrl into the message column directly
          const encodedMessage = encodeNotificationMessage(message, type, refId, targetUrl);

          const { error: notifErr } = await supabase.from('notifications').insert({
            user_id: userId,
            family_id: familyId,
            title,
            message: encodedMessage,
            is_read: false,
          });

          if (notifErr) {
            console.error('Failed to insert into notifications table:', notifErr);
            return false;
          }

          totalNotificationsSent++;
          detailsSent.push({ title, message, target_url: targetUrl });
          return true;
        } catch (err) {
          console.error('sendNotification exception:', err);
          return false;
        }
      };

      // -------------------------------------------------------------
      // 8 & 10. CONTAS A VENCER E VENCIDAS (expenses)
      // -------------------------------------------------------------
      if (billsEnabled) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('family_id', familyId)
          .eq('status', 'pending');

        if (expenses) {
          for (const expense of expenses) {
            const dueDate = new Date(expense.due_date);
            const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const amountFormatted = Number(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

            if (diffDays < 0) {
              await sendNotification(
                'conta_vencida',
                `expense_${expense.id}_overdue_${todayStr}`,
                '⚠️ Conta vencida',
                `A conta "${expense.description}" está vencida!\nValor: R$ ${amountFormatted}\nVencimento foi em ${expense.due_date}`,
                '/contas'
              );
            } else if (diffDays === 0) {
              await sendNotification(
                'conta_hoje',
                `expense_${expense.id}_today_${todayStr}`,
                '🔔 Conta vence hoje',
                `A conta "${expense.description}" vence hoje.\nValor: R$ ${amountFormatted}`,
                '/contas'
              );
            } else if (diffDays === 1) {
              await sendNotification(
                'conta_amanha',
                `expense_${expense.id}_due1d`,
                '🔔 Conta próxima do vencimento',
                `Conta "${expense.description}" vence amanhã.\nValor: R$ ${amountFormatted}`,
                '/contas'
              );
            } else if (diffDays <= 3) {
              await sendNotification(
                'conta_3dias',
                `expense_${expense.id}_due3d`,
                '🔔 Conta próxima do vencimento',
                `Conta "${expense.description}"\nVencimento: ${expense.due_date}\nValor: R$ ${amountFormatted}`,
                '/contas'
              );
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 9, 10 & 11. CARTÕES DE CRÉDITO & FATURAS
      // -------------------------------------------------------------
      if (cardsEnabled || invoicesEnabled) {
        const { data: cards } = await supabase
          .from('credit_cards')
          .select('*')
          .eq('family_id', familyId);

        if (cards) {
          const currentDay = now.getDate();

          for (const card of cards) {
            const bill = Number(card.current_bill || 0);
            if (bill <= 0) continue;

            const dueDay = card.due_day;
            const billFormatted = bill.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            const diffDays = dueDay - currentDay;

            if (diffDays === 1) {
              await sendNotification(
                'fatura_amanha',
                `card_${card.id}_due1d_${now.getMonth()}_${now.getFullYear()}`,
                '🔔 Fatura próxima do vencimento',
                `A fatura do cartão ${card.name} vence amanhã.\nValor: R$ ${billFormatted}\nToque para visualizar.`,
                '/cartoes'
              );
            } else if (diffDays === 0) {
              await sendNotification(
                'fatura_pendente',
                `card_${card.id}_dueToday_${now.getMonth()}_${now.getFullYear()}`,
                '🔔 Fatura pendente',
                `A fatura do cartão ${card.name} ainda não foi paga.\nValor: R$ ${billFormatted}\nVencimento: Hoje`,
                '/cartoes'
              );
            } else if (diffDays < 0 && Math.abs(diffDays) < 15) {
              await sendNotification(
                'fatura_vencida',
                `card_${card.id}_overdue_${now.getMonth()}_${now.getFullYear()}`,
                '⚠️ Fatura vencida',
                `A fatura do cartão ${card.name} está vencida.\nValor: R$ ${billFormatted}\nToque para verificar.`,
                '/cartoes'
              );
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 12. PARCELAS PRÓXIMAS DO VENCIMENTO
      // -------------------------------------------------------------
      if (installmentsEnabled) {
        const { data: installments } = await supabase
          .from('credit_card_installments')
          .select('*, purchase:credit_card_purchases(description)')
          .eq('is_paid', false);

        if (installments) {
          for (const inst of installments) {
            const dueDate = new Date(inst.due_date);
            const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 1) {
              const amountFormatted = Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
              const desc = (inst.purchase as { description?: string })?.description || 'Compra parcelada';

              await sendNotification(
                'parcela_vencimento',
                `inst_${inst.id}_due_${diffDays}d`,
                '🔔 Parcela próxima do vencimento',
                `Compra: ${desc}\nParcela: ${inst.installment_number}/${inst.total_installments}\nValor: R$ ${amountFormatted}\nVencimento: ${diffDays === 0 ? 'Hoje' : 'Amanhã'}`,
                '/cartoes'
              );
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 13. EMPRÉSTIMOS
      // -------------------------------------------------------------
      if (loansEnabled) {
        const { data: loanInsts } = await supabase
          .from('loan_installments')
          .select('*')
          .eq('is_paid', false);

        if (loanInsts) {
          for (const inst of loanInsts) {
            const dueDate = new Date(inst.due_date);
            const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 1) {
              const amountFormatted = Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
              await sendNotification(
                'emprestimo_vencimento',
                `loan_inst_${inst.id}_due_${diffDays}d`,
                '🔔 Parcela de empréstimo',
                `Parcela de empréstimo próxima do vencimento.\nValor: R$ ${amountFormatted}\nVencimento: ${diffDays === 0 ? 'Hoje' : 'Amanhã'}`,
                '/emprestimos'
              );
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 14. ORÇAMENTO (80% ou ultrapassado)
      // -------------------------------------------------------------
      if (budgetEnabled) {
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const { data: budgets } = await supabase
          .from('budgets')
          .select('*')
          .eq('family_id', familyId)
          .eq('month', currentMonth)
          .eq('year', currentYear);

        if (budgets && budgets.length > 0) {
          const { data: expenses } = await supabase
            .from('expenses')
            .select('amount, category')
            .eq('family_id', familyId);

          if (expenses) {
            const spentByCategory: Record<string, number> = {};
            for (const exp of expenses) {
              spentByCategory[exp.category] = (spentByCategory[exp.category] || 0) + Number(exp.amount || 0);
            }

            for (const b of budgets) {
              const spent = spentByCategory[b.category] || 0;
              const limit = Number(b.allocated_amount || 0);
              if (limit <= 0) continue;

              const percent = Math.round((spent / limit) * 100);

              if (spent > limit) {
                await sendNotification(
                  'orcamento_ultrapassado',
                  `budget_${b.id}_exceeded_${currentMonth}_${currentYear}`,
                  '⚠️ Orçamento ultrapassado',
                  `A categoria "${b.category}" ultrapassou o limite definido.\nLimite: R$ ${limit.toLocaleString('pt-BR')}\nGasto: R$ ${spent.toLocaleString('pt-BR')}`,
                  '/despesas'
                );
              } else if (percent >= 80) {
                await sendNotification(
                  'orcamento_80',
                  `budget_${b.id}_80percent_${currentMonth}_${currentYear}`,
                  '⚠️ Atenção ao orçamento',
                  `Você já utilizou ${percent}% do orçamento de "${b.category}".\nLimite: R$ ${limit.toLocaleString('pt-BR')}\nUtilizado: R$ ${spent.toLocaleString('pt-BR')}`,
                  '/despesas'
                );
              }
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 15. PERÍODO DE TESTE (3 dias, 1 dia, expirado)
      // -------------------------------------------------------------
      if (trialEnabled) {
        const { data: trial } = await supabase
          .from('trial_periods')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (trial && trial.trial_expires_at) {
          const expireMs = new Date(trial.trial_expires_at).getTime();
          const diffDays = Math.ceil((expireMs - now.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) {
            await sendNotification(
              'trial_expired',
              `trial_${trial.id}_expired`,
              '⚠️ Seu período gratuito terminou',
              'Seu período de teste terminou. Seu acesso foi bloqueado. Toque para verificar as opções disponíveis.',
              '/configuracoes'
            );
          } else if (diffDays === 1) {
            await sendNotification(
              'trial_1day',
              `trial_${trial.id}_1day`,
              '🔔 Seu período gratuito termina amanhã',
              'Seu período de teste termina amanhã. Verifique seu acesso para continuar utilizando o aplicativo.',
              '/configuracoes'
            );
          } else if (diffDays === 3) {
            await sendNotification(
              'trial_3days',
              `trial_${trial.id}_3days`,
              '🔔 Seu período gratuito está terminando',
              'Você ainda possui 3 dias de acesso gratuito ao aplicativo.',
              '/configuracoes'
            );
          }
        }
      }
    }

    return {
      success: true,
      sent: totalNotificationsSent,
      notifications: detailsSent,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro no processamento de notificações';
    return { success: false, sent: 0, notifications: [], error: msg };
  }
}
