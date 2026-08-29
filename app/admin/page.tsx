
'use client';

import { CountdownTimer } from "./CountdownTimer";
import React, { useState, useEffect, useCallback, useMemo } from 'react';

function formatToDateTimeLocal(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Profile, TrialPeriod, ReleaseRequest, AuditLog } from '@/types/database';
import { 
  ShieldCheck, 
  Users, 
  Clock, 
  Ban, 
  CheckCircle2, 
  Activity, 
  Search, 
  RefreshCw, 
  Loader2, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  UserCheck, 
  Mail, 
  Sliders, 
  Settings2, 
  Check, 
  X, 
  Calendar,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Sparkles
} from 'lucide-react';

interface ExtendedProfile extends Profile {
  auth_confirmed?: boolean;
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}

function AdminDashboardContent() {
  const { user, serverTime } = useAuth();

  // Management tabs
  const [activeTab, setActiveTab] = useState<'users' | 'time_control' | 'requests' | 'audit' | 'system_rules'>('users');
  
  const [users, setUsers] = useState<ExtendedProfile[]>([]);
  const [trialPeriods, setTrialPeriods] = useState<Record<string, TrialPeriod>>({});
  const [requests, setRequests] = useState<ReleaseRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'expired'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'owner' | 'member'>('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<ExtendedProfile | null>(null);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [customDays, setCustomDays] = useState<number>(30);
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  // Global trial policies state
  const [defaultTrialDays, setDefaultTrialDays] = useState<number>(14);
  const [autoLockOnExpire, setAutoLockOnExpire] = useState<boolean>(true);
  const [policySaved, setPolicySaved] = useState(false);

    useEffect(() => {
    if (timeModalOpen && selectedUser) {
      const familyId = selectedUser.family_id || selectedUser.id;
      const current = trialPeriods[familyId] || trialPeriods[selectedUser.id];
      const initialDate = current?.trial_expires_at 
        ? new Date(current.trial_expires_at) 
        : new Date(serverTime.getTime() + 24 * 60 * 60 * 1000);
      setCustomExpiryDate(formatToDateTimeLocal(initialDate));
    }
  }, [timeModalOpen, selectedUser, trialPeriods, serverTime]);

  useEffect(() => {
    const savedDays = localStorage.getItem('finanzza_default_trial_days');
    if (savedDays) setDefaultTrialDays(Number(savedDays));
    const savedAutoLock = localStorage.getItem('finanzza_auto_lock_expire');
    if (savedAutoLock !== null) setAutoLockOnExpire(savedAutoLock === 'true');
  }, []);

  const handleSavePolicies = () => {
    localStorage.setItem('finanzza_default_trial_days', String(defaultTrialDays));
    localStorage.setItem('finanzza_auto_lock_expire', String(autoLockOnExpire));
    setPolicySaved(true);
    setTimeout(() => setPolicySaved(false), 3000);
  };

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load profiles
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      let loadedProfiles: ExtendedProfile[] = [];
      if (profData) {
        loadedProfiles = profData as ExtendedProfile[];
        setUsers(loadedProfiles);
      } else if (profErr) {
        console.error('Error fetching profiles:', profErr);
      }

      // 2. Load trial periods
      const { data: trialData } = await supabase
        .from('trial_periods')
        .select('*');
      if (trialData) {
        const map: Record<string, TrialPeriod> = {};
        trialData.forEach((t: TrialPeriod) => {
          if (t.family_id) map[t.family_id] = t;
          if (t.user_id) map[t.user_id] = t;
        });
        setTrialPeriods(map);
      }

      // 3. Load Release Requests
      const { data: reqData, error: reqErr } = await supabase
        .from('release_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (reqErr) {
        console.warn('Notice loading release_requests:', reqErr.message);
      }

      let allRequests: ReleaseRequest[] = (reqData as ReleaseRequest[]) || [];

      // Consolidate any payment proofs uploaded to trial_periods that might not have a release_requests row
      if (trialData) {
        trialData.forEach((t: any) => {
          if (t.payment_proof_url) {
            const alreadyExists = allRequests.some(r => r.payment_proof_url === t.payment_proof_url || (r.user_id === t.user_id && r.status === 'pending'));
            if (!alreadyExists) {
              const matchedProf = loadedProfiles.find(p => p.id === t.user_id || (t.family_id && p.family_id === t.family_id));
              allRequests.push({
                id: `trial_${t.id}`,
                family_id: t.family_id || matchedProf?.family_id || null,
                user_id: t.user_id || matchedProf?.id || '',
                user_email: matchedProf?.email || 'Usuário',
                user_name: matchedProf?.full_name || matchedProf?.email?.split('@')[0] || 'Usuário',
                reason: 'Comprovante de pagamento PIX anexado no bloqueio de teste',
                payment_proof_url: t.payment_proof_url,
                status: t.payment_status === 'approved' ? 'approved' : t.payment_status === 'rejected' ? 'rejected' : 'pending',
                created_at: t.updated_at || t.created_at || new Date().toISOString()
              });
            }
          }
        });
      }

      setRequests(allRequests);

      // 4. Load Audit Logs
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (auditData) setAuditLogs(auditData as AuditLog[]);
    } catch (err) {
      console.error('Error loading admin management data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();

    // Supabase Realtime synchronization for release requests and trial periods
    const channel = supabase
      .channel('admin-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'release_requests' }, () => {
        loadAdminData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trial_periods' }, () => {
        loadAdminData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAdminData]);

  // Record Audit Log Helper
  const logAudit = async (action: string, targetFamilyId?: string | null, targetUserId?: string | null, details?: Record<string, unknown>) => {
    try {
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        admin_email: user?.email || 'kalebsantos2801@gmail.com',
        action,
        target_family_id: targetFamilyId || null,
        target_user_id: targetUserId || null,
        details: details || {},
      });
    } catch (err) {
      console.error('Error recording audit log:', err);
    }
  };

  // 1. ALTERAR PAPEL / ROLE DO USUÁRIO
  const handleChangeRole = async (targetUser: ExtendedProfile, newRole: string) => {
    setActionLoading(`role_${targetUser.id}`);
    try {
      await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUser.id);

      if (newRole === 'admin') {
        await supabase
          .from('admin_roles')
          .upsert({
            user_id: targetUser.id,
            email: targetUser.email,
            role: 'superadmin',
            requires_password_change: false
          });
      } else {
        await supabase
          .from('admin_roles')
          .delete()
          .eq('user_id', targetUser.id);
      }

      await logAudit('CHANGE_USER_ROLE', targetUser.family_id, targetUser.id, {
        oldRole: targetUser.role,
        newRole,
        userEmail: targetUser.email,
      });

      await loadAdminData();
    } catch (err) {
      console.error('Error changing role:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // 2. BLOQUEIO E DESBLOQUEIO DE USUÁRIO
  const handleToggleBlock = (targetUser: ExtendedProfile, currentBlocked: boolean) => {
    const familyId = targetUser.family_id || targetUser.id;
    const actionLabel = currentBlocked ? 'Desbloquear' : 'Bloquear';
    const newStatus = currentBlocked ? 'active' : 'blocked';
    
    setConfirmationModal({
      isOpen: true,
      title: `${actionLabel} Acesso do Usuário`,
      description: currentBlocked
        ? `Tem certeza que deseja DESBLOQUEAR o usuário "${targetUser.full_name}" (${targetUser.email})? O acesso às funções será restabelecido imediatamente.`
        : `Tem certeza que deseja BLOQUEAR o usuário "${targetUser.full_name}" (${targetUser.email})? O usuário será impedido de acessar o sistema até ser desbloqueado.`,
      confirmLabel: actionLabel,
      variant: currentBlocked ? 'primary' : 'danger',
      onConfirm: async () => {
        setActionLoading(`block_${targetUser.id}`);
        try {
          // 1. Atualizar perfil do usuário
          const { error: profErr } = await supabase
            .from('profiles')
            .update({ 
              status: newStatus,
              updated_at: new Date().toISOString() 
            })
            .eq('id', targetUser.id);

          if (profErr) {
            console.error('Erro ao atualizar status em profiles:', profErr);
          }

          // Se tiver família, atualizar todos os membros da família também
          if (targetUser.family_id) {
            await supabase
              .from('profiles')
              .update({ 
                status: newStatus,
                updated_at: new Date().toISOString() 
              })
              .eq('family_id', targetUser.family_id);
          }

          // 2. Atualizar tabela trial_periods
          const existingTrial = trialPeriods[targetUser.id] || trialPeriods[familyId];
          const trialPayload: any = {
            user_id: targetUser.id,
            status: newStatus,
            is_blocked: !currentBlocked,
            updated_at: new Date().toISOString()
          };
          if (existingTrial?.id) trialPayload.id = existingTrial.id;
          if (familyId) trialPayload.family_id = familyId;

          const { error: trialErr } = await supabase
            .from('trial_periods')
            .upsert(trialPayload, { onConflict: 'user_id' });

          if (trialErr) {
            console.error('Erro ao atualizar trial_periods:', trialErr);
          }

          await logAudit(currentBlocked ? 'UNBLOCK_USER' : 'BLOCK_USER', familyId, targetUser.id, {
            userEmail: targetUser.email,
            userName: targetUser.full_name,
            blocked: !currentBlocked
          });

          await loadAdminData();
        } catch (err) {
          console.error('Error toggling block:', err);
        } finally {
          setActionLoading(null);
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 3. AJUSTE DE TEMPO / LICENÇA
  const handleApplyTimeAdjustment = async () => {
    if (!selectedUser) return;
    const target = selectedUser;
    const familyId = target.family_id || target.id;
    
    setActionLoading(`time_${target.id}`);
    try {
      let finalExpiryDate: string;

      if (customExpiryDate) {
        finalExpiryDate = new Date(customExpiryDate).toISOString();
      } else {
        const current = trialPeriods[familyId] || trialPeriods[target.id];
        const baseDate = current?.trial_expires_at && new Date(current.trial_expires_at).getTime() > serverTime.getTime()
          ? new Date(current.trial_expires_at)
          : new Date(serverTime.getTime());
        finalExpiryDate = new Date(baseDate.getTime() + customDays * 24 * 60 * 60 * 1000).toISOString();
      }

      const existingTrial = trialPeriods[target.id] || trialPeriods[familyId];
      const trialPayload: any = {
        user_id: target.id,
        family_id: familyId,
        trial_expires_at: finalExpiryDate,
        status: 'active',
        is_blocked: false,
        updated_at: new Date().toISOString()
      };
      if (existingTrial?.id) trialPayload.id = existingTrial.id;

      await supabase
        .from('trial_periods')
        .upsert(trialPayload, { onConflict: 'user_id' });

      await supabase
        .from('profiles')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', target.id);

      if (target.family_id) {
        await supabase
          .from('profiles')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('family_id', target.family_id);
      }

      await logAudit('ADJUST_TRIAL_TIME', familyId, target.id, {
        userEmail: target.email,
        customDays: customExpiryDate ? null : customDays,
        newExpiry: finalExpiryDate,
      });

      setTimeModalOpen(false);
      setSelectedUser(null);
      setCustomExpiryDate('');
      await loadAdminData();
    } catch (err) {
      console.error('Error applying time adjustment:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // 4. ATRIBUIÇÃO RÁPIDA DE DIAS DE TESTE
  const handleQuickAddTime = (targetUser: ExtendedProfile, minutes: number) => {
    const familyId = targetUser.family_id || targetUser.id;
    const current = trialPeriods[familyId] || trialPeriods[targetUser.id];
    const baseDate = current?.trial_expires_at && new Date(current.trial_expires_at).getTime() > serverTime.getTime()
      ? new Date(current.trial_expires_at)
      : new Date(serverTime.getTime());
    const newExpiry = new Date(baseDate.getTime() + minutes * 60 * 1000);

    setConfirmationModal({
      isOpen: true,
      title: `Confirmar Ajuste de Tempo`,
      description: `Deseja ajustar o tempo de acesso de "${targetUser.full_name}" (${targetUser.email})? O novo término será em ${newExpiry.toLocaleString('pt-BR')}.`,
      confirmLabel: `Confirmar Ajuste`,
      variant: 'primary',
      onConfirm: async () => {
        setActionLoading(`quick_${targetUser.id}_${minutes}`);
        try {
          const existingTrial = trialPeriods[targetUser.id] || trialPeriods[familyId];
          const trialPayload: any = {
            user_id: targetUser.id,
            family_id: familyId,
            trial_expires_at: newExpiry.toISOString(),
            status: 'active',
            is_blocked: false,
            updated_at: new Date().toISOString()
          };
          if (existingTrial?.id) trialPayload.id = existingTrial.id;

          await supabase
            .from('trial_periods')
            .upsert(trialPayload, { onConflict: 'user_id' });

          await supabase
            .from('profiles')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', targetUser.id);

          await logAudit('QUICK_ADD_DAYS', familyId, targetUser.id, {
            userEmail: targetUser.email,
            minutesAdded: minutes,
            newExpiry: newExpiry.toISOString()
          });

          await loadAdminData();
        } catch (err) {
          console.error('Error adding quick days:', err);
        } finally {
          setActionLoading(null);
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 5. EXPIRAR OU ZERAR TEMPO DE TESTE IMEDIATAMENTE
  const handleExpireImmediately = (targetUser: ExtendedProfile) => {
    const familyId = targetUser.family_id || targetUser.id;
    const nowPast = new Date(serverTime.getTime() - 60000).toISOString();

    setConfirmationModal({
      isOpen: true,
      title: 'Expirar Licença Imediatamente',
      description: `Tem certeza que deseja encerrar o período de teste de "${targetUser.full_name}" agora? A tela de bloqueio por tempo expirado será exibida para ele.`,
      confirmLabel: 'Expirar Imediatamente',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(`expire_${targetUser.id}`);
        try {
          const existingTrial = trialPeriods[targetUser.id] || trialPeriods[familyId];
          const trialPayload: any = {
            user_id: targetUser.id,
            family_id: familyId,
            trial_expires_at: nowPast,
            status: 'expired',
            updated_at: new Date().toISOString()
          };
          if (existingTrial?.id) trialPayload.id = existingTrial.id;

          await supabase
            .from('trial_periods')
            .upsert(trialPayload, { onConflict: 'user_id' });

          await supabase
            .from('profiles')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('id', targetUser.id);

          await logAudit('EXPIRE_TRIAL_NOW', familyId, targetUser.id, {
            userEmail: targetUser.email,
            expiredAt: nowPast
          });

          await loadAdminData();
        } catch (err) {
          console.error('Error expiring trial:', err);
        } finally {
          setActionLoading(null);
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 6. APROVAÇÃO / RECUSA DE SOLICITAÇÕES
  const handleRequestAction = async (requestId: string, familyId: string | null | undefined, userEmail: string, action: 'approved' | 'rejected', days: number = 365) => {
    setActionLoading(`req_${requestId}`);
    try {
      const targetReq = requests.find(r => r.id === requestId);
      let targetUserId = targetReq?.user_id;
      let targetFamilyId = familyId || targetReq?.family_id;

      if (!targetFamilyId && targetUserId) {
        const p = users.find(u => u.id === targetUserId);
        targetFamilyId = p?.family_id || p?.id;
      }
      if (!targetUserId && targetFamilyId) {
        const p = users.find(u => u.family_id === targetFamilyId || u.id === targetFamilyId);
        targetUserId = p?.id;
      }

      // If it's a real release_requests database record
      if (!requestId.startsWith('trial_')) {
        if (action === 'rejected') {
          const { error: deleteError } = await supabase
            .from('release_requests')
            .delete()
            .eq('id', requestId);
            
          if (deleteError) {
            console.warn('Notice when deleting rejected release_request:', deleteError.message);
          }
        } else {
          const { error: updateError } = await supabase
            .from('release_requests')
            .update({
              status: action,
              resolved_at: new Date().toISOString(),
              resolved_by: user?.id || null
            })
            .eq('id', requestId);
            
          if (updateError) {
            console.warn('Notice when updating release_request status:', updateError.message);
          }
        }
      }

      if (action === 'approved') {
        const newExpiry = new Date(serverTime.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
        
        // Update / Upsert trial_periods
        if (targetFamilyId) {
          await supabase
            .from('trial_periods')
            .upsert({
              family_id: targetFamilyId,
              trial_expires_at: newExpiry,
              status: 'active',
              is_blocked: false,
              payment_status: 'approved',
              payment_proof_url: null, // Clear on approval too just in case
              updated_at: new Date().toISOString()
            }, { onConflict: 'family_id' });
        }

        if (targetUserId) {
          await supabase
            .from('trial_periods')
            .upsert({
              user_id: targetUserId,
              family_id: targetFamilyId || undefined,
              trial_expires_at: newExpiry,
              status: 'active',
              is_blocked: false,
              payment_status: 'approved',
              payment_proof_url: null, // Clear on approval too just in case
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

          // Also set profile status to active
          await supabase
            .from('profiles')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', targetUserId);
        }
      } else if (action === 'rejected') {
        if (targetFamilyId) {
          await supabase
            .from('trial_periods')
            .update({ 
              payment_status: 'rejected', 
              payment_proof_url: null, // Set to null so it does not reappear/load as request
              updated_at: new Date().toISOString() 
            })
            .eq('family_id', targetFamilyId);
        }
        if (targetUserId) {
          await supabase
            .from('trial_periods')
            .update({ 
              payment_status: 'rejected', 
              payment_proof_url: null, // Set to null so it does not reappear/load as request
              updated_at: new Date().toISOString() 
            })
            .eq('user_id', targetUserId);
        }

        // Auto delete any corresponding release_requests for safety to ensure it is deleted automatically
        if (targetUserId) {
          await supabase
            .from('release_requests')
            .delete()
            .eq('user_id', targetUserId);
        }
        if (targetFamilyId) {
          await supabase
            .from('release_requests')
            .delete()
            .eq('family_id', targetFamilyId);
        }
      }

      await logAudit(action === 'approved' ? 'APPROVE_RELEASE_REQUEST' : 'REJECT_RELEASE_REQUEST', targetFamilyId, targetUserId, {
        requestId,
        userEmail,
        action,
        daysGranted: action === 'approved' ? days : 0
      });

      await loadAdminData();
    } catch (err) {
      console.error('Error resolving request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Filtragem de Usuários
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const familyId = u.family_id || u.id;
      const trial = trialPeriods[familyId] || trialPeriods[u.id];
      const isExpired = trial?.trial_expires_at ? new Date(trial.trial_expires_at).getTime() < serverTime.getTime() : false;
      const isBlocked = trial?.is_blocked || u.status === 'blocked';

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = !isBlocked && !isExpired;
      if (statusFilter === 'blocked') matchesStatus = !!isBlocked;
      if (statusFilter === 'expired') matchesStatus = !!isExpired && !isBlocked;

      let matchesRole = true;
      if (roleFilter !== 'all') matchesRole = u.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter, trialPeriods, serverTime]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    let activeCount = 0;
    let blockedCount = 0;
    let expiredCount = 0;
    let adminCount = 0;

    users.forEach(u => {
      if (u.role === 'admin') adminCount++;
      const familyId = u.family_id || u.id;
      const trial = trialPeriods[familyId] || trialPeriods[u.id];
      const isBlocked = trial?.is_blocked || u.status === 'blocked';
      const isExpired = trial?.trial_expires_at ? new Date(trial.trial_expires_at).getTime() < serverTime.getTime() : false;

      if (isBlocked) blockedCount++;
      else if (isExpired) expiredCount++;
      else activeCount++;
    });

    return {
      total: users.length,
      active: activeCount,
      blocked: blockedCount,
      expired: expiredCount,
      admins: adminCount,
      pendingRequests: requests.filter(r => r.status === 'pending').length
    };
  }, [users, trialPeriods, serverTime, requests]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col selection:bg-amber-500/30 overflow-x-hidden">
      {/* Header dedicado com menu ao clicar no nome para sair */}
      <AdminHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        
        {/* Banner de Identificação Administrativa */}
        <div className="bg-gradient-to-r from-slate-900/95 via-amber-950/25 to-slate-900/95 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-amber-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Módulo de Gestão Central
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-400 text-xs border border-white/10">
                  Total: <strong className="text-white">{stats.total}</strong> contas
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Painel Administrativo & Gestão de Contas
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                Controle irrestrito de usuários, configuração de períodos de teste, bloqueio/desbloqueio imediato, alteração de permissões e auditoria.
              </p>
            </div>

            <button
              onClick={loadAdminData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer self-start sm:self-auto shadow-lg shadow-amber-500/20 active:scale-[0.98] shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar Dados</span>
            </button>
          </div>

          {/* Cards de Métricas de Gestão */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-5 pt-5 border-t border-white/10">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                Usuários Ativos
              </span>
              <span className="text-xl font-extrabold text-emerald-400 mt-1 block">
                {stats.active}
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                Bloqueados
              </span>
              <span className="text-xl font-extrabold text-rose-400 mt-1 block">
                {stats.blocked}
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Testes Expirados
              </span>
              <span className="text-xl font-extrabold text-amber-400 mt-1 block">
                {stats.expired}
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Solicitações
              </span>
              <span className="text-xl font-extrabold text-indigo-300 mt-1 block">
                {stats.pendingRequests}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Abas Exclusiva de Gestão */}
        <div className="flex border-b border-white/10 text-sm gap-1 sm:gap-2 overflow-x-auto pb-px scrollbar-thin">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-3.5 sm:px-4 font-bold text-xs transition cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gerenciar Usuários & Acessos ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('time_control')}
            className={`pb-3 px-3.5 sm:px-4 font-bold text-xs transition cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'time_control'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Controle de Tempo & Licenças</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 px-3.5 sm:px-4 font-bold text-xs transition cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'requests'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Solicitações ({stats.pendingRequests})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 px-3.5 sm:px-4 font-bold text-xs transition cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Auditoria ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('system_rules')}
            className={`pb-3 px-3.5 sm:px-4 font-bold text-xs transition cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'system_rules'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Políticas do Sistema</span>
          </button>
        </div>

        {/* ABA 1: GERENCIAR USUÁRIOS & ACESSOS */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-2xl">
            {/* Filtros de busca */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 sm:gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome ou e-mail..."
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-white/[0.04] border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="all" className="bg-slate-900 text-white">Status: Todos</option>
                  <option value="active" className="bg-slate-900 text-white">Apenas Ativos</option>
                  <option value="blocked" className="bg-slate-900 text-white">Apenas Bloqueados</option>
                  <option value="expired" className="bg-slate-900 text-white">Apenas Expirados</option>
                </select>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="bg-white/[0.04] border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="all" className="bg-slate-900 text-white">Cargo: Todos</option>
                  <option value="admin" className="bg-slate-900 text-white">SuperAdmin / Admin</option>
                  <option value="owner" className="bg-slate-900 text-white">Proprietário (Owner)</option>
                  <option value="member" className="bg-slate-900 text-white">Membro</option>
                </select>
              </div>
            </div>

            {/* Tabela de Usuários */}
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs">Carregando usuários registrados no Supabase...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs bg-white/[0.02] rounded-2xl border border-white/5">
                Nenhum usuário corresponde aos filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/5 rounded-2xl">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-white/[0.03] text-slate-400 font-bold border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Usuário / E-mail</th>
                      <th className="p-3.5">Papel de Acesso</th>
                      <th className="p-3.5">Status de Acesso</th>
                      <th className="p-3.5">Expiração da Licença</th>
                      <th className="p-3.5 text-right">Ações Administrativas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => {
                      const familyId = u.family_id || u.id;
                      const trial = trialPeriods[familyId] || trialPeriods[u.id];
                      const isExpired = trial?.trial_expires_at ? new Date(trial.trial_expires_at).getTime() < serverTime.getTime() : false;
                      const isBlocked = trial?.is_blocked || u.status === 'blocked';
                      const isTargetMaster = u.email?.toLowerCase() === 'kalebsantos2801@gmail.com';

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition group">
                          {/* Coluna 1: Usuário */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                                {u.full_name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-100 flex items-center gap-1.5 truncate">
                                  {u.full_name}
                                  {isTargetMaster && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase shrink-0">
                                      Master
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Coluna 2: Papel / Role Selector */}
                          <td className="p-3.5">
                            <select
                              value={u.role}
                              disabled={isTargetMaster || actionLoading === `role_${u.id}`}
                              onChange={(e) => handleChangeRole(u, e.target.value)}
                              className="bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 cursor-pointer"
                            >
                              <option value="admin" className="bg-slate-900 text-amber-300 font-bold">Admin (SuperAdmin)</option>
                              <option value="owner" className="bg-slate-900 text-white">Owner (Gestor Família)</option>
                              <option value="member" className="bg-slate-900 text-white">Member (Membro)</option>
                              <option value="viewer" className="bg-slate-900 text-white">Viewer (Leitura)</option>
                            </select>
                          </td>

                          {/* Coluna 3: Status */}
                          <td className="p-3.5">
                            {isBlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-black">
                                <Ban className="w-3 h-3" />
                                BLOQUEADO
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black">
                                <Clock className="w-3 h-3" />
                                EXPIRADO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                                <CheckCircle2 className="w-3 h-3" />
                                ATIVO
                              </span>
                            )}
                          </td>

                          {/* Coluna 4: Expiração */}
                          <td className="p-3.5 font-mono text-slate-300">
                            {trial?.trial_expires_at ? (
                              <div>
                                <span className={isExpired ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                                  {new Date(trial.trial_expires_at).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="block text-[10px] text-slate-500">
                                  {new Date(trial.trial_expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Padrão / Ilimitado</span>
                            )}
                          </td>

                          {/* Coluna 5: Ações */}
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {/* Ajustar Tempo */}
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setTimeModalOpen(true);
                                }}
                                title="Configurar tempo de teste específico"
                                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Clock className="w-3 h-3" />
                                <span>Ajustar Tempo</span>
                              </button>

                              {/* Bloquear / Desbloquear */}
                              {!isTargetMaster && (
                                <button
                                  onClick={() => handleToggleBlock(u, !!isBlocked)}
                                  disabled={actionLoading === `block_${u.id}`}
                                  title={isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário imediatamente'}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                    isBlocked
                                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {isBlocked ? <Unlock className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                                  <span>{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: CONTROLE RÁPIDO DE TEMPO & LICENÇAS */}
        {activeTab === 'time_control' && (
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-6 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Gerenciamento Rápido de Prazos e Expirações
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adicione horas ou minutos manualmente para ajuste fino de acesso ou force a expiração.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => {
                const familyId = u.family_id || u.id;
                const isTargetMaster = u.email?.toLowerCase() === 'superadmin123@gmail.com';
                const trial = trialPeriods[familyId] || trialPeriods[u.id];
                const isExpired = trial?.trial_expires_at ? new Date(trial.trial_expires_at).getTime() < serverTime.getTime() : false;
                const isBlocked = trial?.is_blocked || u.status === 'blocked';

                return (
                  <div key={u.id} className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3.5 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-100 text-xs truncate">
                          {u.full_name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {u.email}
                        </p>
                      </div>

                      {isBlocked ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-black shrink-0">
                          BLOQUEADO
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black shrink-0">
                          EXPIRADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black shrink-0">
                          ATIVO
                        </span>
                      )}
                    </div>

                    <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 flex flex-col gap-1 text-xs">
                      <div className="flex justify-between w-full items-center">
                        <span className="text-slate-400 text-[11px]">Vencimento Oficial:</span>
                        <strong className="text-slate-200 font-mono">
                          {trial?.trial_expires_at ? new Date(trial.trial_expires_at).toLocaleString('pt-BR') : 'Indeterminado'}
                        </strong>
                      </div>
                      <div className="flex justify-between w-full items-center pt-2 border-t border-white/5 mt-1">
                        <span className="text-slate-400 text-[11px] font-bold text-amber-500">Tempo Restante:</span>
                        <CountdownTimer expiresAt={trial?.trial_expires_at || null} />
                      </div>
                    </div>

                    {/* Ajuste manual estilo relógio */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <button
                        onClick={() => handleQuickAddTime(u, -60)}
                        className="px-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[10px] font-bold rounded-lg transition text-center cursor-pointer flex flex-col items-center justify-center leading-tight"
                      >
                        <span>-1</span><span>Hora</span>
                      </button>
                      <button
                        onClick={() => handleQuickAddTime(u, -30)}
                        className="px-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[10px] font-bold rounded-lg transition text-center cursor-pointer flex flex-col items-center justify-center leading-tight"
                      >
                        <span>-30</span><span>Min</span>
                      </button>
                      <button
                        onClick={() => handleQuickAddTime(u, 30)}
                        className="px-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-lg transition text-center cursor-pointer flex flex-col items-center justify-center leading-tight"
                      >
                        <span>+30</span><span>Min</span>
                      </button>
                      <button
                        onClick={() => handleQuickAddTime(u, 60)}
                        className="px-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-lg transition text-center cursor-pointer flex flex-col items-center justify-center leading-tight"
                      >
                        <span>+1</span><span>Hora</span>
                      </button>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-white/5">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setTimeModalOpen(true);
                        }}
                        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-bold rounded-lg border border-white/5 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Sliders className="w-3 h-3 text-amber-400" />
                        Data Exata
                      </button>

                      <button
                        onClick={() => handleExpireImmediately(u)}
                        title="Zerar tempo e forçar tela de expiração"
                        className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-bold rounded-lg border border-rose-500/20 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        Expirar Agora
                      </button>
                    </div>

                    {!isTargetMaster && (
                      <button
                        onClick={() => handleToggleBlock(u, !!isBlocked)}
                        disabled={actionLoading === `block_${u.id}`}
                        title={isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário imediatamente'}
                        className={`w-full py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isBlocked
                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isBlocked ? <Unlock className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                        <span>{isBlocked ? 'Desbloquear Usuário' : 'Bloquear Usuário'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 3: SOLICITAÇÕES DE LIBERAÇÃO */}
        {activeTab === 'requests' && (
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-6 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  Solicitações de Liberação e Comprovantes PIX
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mensagens e comprovantes enviados por usuários solicitando liberação de acesso e assinaturas.
                </p>
              </div>

              {/* Filtros de Status das Solicitações */}
              <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-2xl border border-white/5 self-start sm:self-center overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setRequestStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    requestStatusFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todas ({requests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    requestStatusFilter === 'pending'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Pendentes</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/40 font-black">
                    {requests.filter(r => r.status === 'pending').length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestStatusFilter('approved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    requestStatusFilter === 'approved'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Aprovadas ({requests.filter(r => r.status === 'approved').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestStatusFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    requestStatusFilter === 'rejected'
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Recusadas ({requests.filter(r => r.status === 'rejected').length})
                </button>
                <button
                  type="button"
                  onClick={loadAdminData}
                  title="Atualizar solicitações"
                  className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-white/5 ml-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs font-medium">Buscando solicitações no banco de dados...</span>
              </div>
            ) : requests.filter(r => requestStatusFilter === 'all' ? true : r.status === requestStatusFilter).length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs bg-white/[0.02] rounded-3xl border border-white/5 space-y-2">
                <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-300">Nenhuma solicitação encontrada neste filtro.</p>
                <p className="text-[11px] text-slate-500">
                  {requestStatusFilter === 'pending' 
                    ? 'Não há novos pedidos ou comprovantes aguardando liberação no momento.' 
                    : 'Não há registros cadastrados para a categoria selecionada.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests
                  .filter(r => requestStatusFilter === 'all' ? true : r.status === requestStatusFilter)
                  .map((req) => {
                    const isPending = req.status === 'pending';
                    const isApproved = req.status === 'approved';
                    const isRejected = req.status === 'rejected';

                    return (
                      <div 
                        key={req.id} 
                        className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                          isPending 
                            ? 'bg-slate-950/60 border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/5' 
                            : isApproved
                            ? 'bg-slate-950/40 border-emerald-500/20'
                            : 'bg-slate-950/40 border-rose-500/20'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          {/* Info do Usuário */}
                          <div className="space-y-3 min-w-0 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-amber-300 font-black text-xs shrink-0">
                                {(req.user_name || req.user_email || 'U')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-xs">
                                    {req.user_name || 'Usuário'}
                                  </span>
                                  <span className="text-slate-400 text-xs font-mono">
                                    ({req.user_email})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span>Enviado em: {new Date(req.created_at).toLocaleString('pt-BR')}</span>
                                  {req.family_id && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-slate-400">Família: {req.family_id.slice(0, 8)}...</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="ml-auto sm:ml-0">
                                {isPending && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Pendente
                                  </span>
                                )}
                                {isApproved && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Aprovada
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                    <X className="w-3 h-3" /> Recusada
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Motivo / Mensagem */}
                            <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 text-xs text-slate-300 leading-relaxed">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mensagem enviada:</span>
                              &ldquo;{req.reason}&rdquo;
                            </div>

                            {/* Anexo de Comprovante de Pagamento */}
                            {req.payment_proof_url && (
                              <div className="bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                    <FileCheck className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-emerald-300 block">Comprovante PIX Anexado</span>
                                    <span className="text-[10px] text-slate-400 truncate block">Clique para inspecionar o comprovante</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewProofUrl(req.payment_proof_url || null)}
                                    className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Visualizar</span>
                                  </button>
                                  <a
                                    href={req.payment_proof_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 transition"
                                    title="Abrir em nova aba"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Ações de Aprovação / Recusa */}
                          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                            <button
                              type="button"
                              onClick={() => handleRequestAction(req.id, req.family_id, req.user_email, 'approved', 365)}
                              disabled={actionLoading === `req_${req.id}`}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition shadow-lg shadow-emerald-600/25 border border-emerald-400/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {actionLoading === `req_${req.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>Aprovar (+1 Ano)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRequestAction(req.id, req.family_id, req.user_email, 'approved', 30)}
                              disabled={actionLoading === `req_${req.id}`}
                              className="px-4 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 rounded-xl text-xs font-bold transition border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aprovar (+30 Dias)</span>
                            </button>

                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleRequestAction(req.id, req.family_id, req.user_email, 'rejected')}
                                disabled={actionLoading === `req_${req.id}`}
                                className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition border border-rose-400/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Recusar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ABA 4: AUDITORIA DE AÇÕES */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Trilha de Auditoria e Segurança de Administrador
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Histórico imutável de todas as ações executadas pelo SuperAdmin no sistema.
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs bg-white/[0.02] rounded-2xl border border-white/5">
                Nenhum registro de auditoria no histórico recente.
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px] font-black uppercase">
                          {log.action}
                        </span>
                        <span className="text-xs font-mono text-slate-300 truncate">
                          {log.admin_email || 'SuperAdmin'}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-[11px] text-slate-400 mt-1 font-mono break-all">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap shrink-0">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 5: POLÍTICAS & PRAZOS GLOBAIS */}
        {activeTab === 'system_rules' && (
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-6 space-y-6 shadow-2xl max-w-3xl">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-400" />
                Configurações de Regras Globais e Prazos Padrão
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina os parâmetros aplicados por padrão para novos cadastros e políticas de bloqueio do sistema.
              </p>
            </div>

            <div className="space-y-5 bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-5">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Tempo Padrão de Teste para Novos Usuários (Dias)
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={defaultTrialDays}
                    onChange={(e) => setDefaultTrialDays(Number(e.target.value))}
                    className="w-28 px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <span className="text-xs text-slate-400">
                    dias corridos a partir da data de criação da conta.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5 gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">
                    Bloquear Acesso Automático ao Expirar Prazo
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Exibe a tela de bloqueio e requer solicitação de liberação assim que o tempo de teste termina.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoLockOnExpire}
                  onChange={(e) => setAutoLockOnExpire(e.target.checked)}
                  className="w-5 h-5 rounded bg-white/[0.04] border-white/10 text-amber-500 focus:ring-amber-500/50 cursor-pointer shrink-0"
                />
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={handleSavePolicies}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  Salvar Políticas do Sistema
                </button>
                {policySaved && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Configurações salvas com sucesso!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE AJUSTE PRECISO DE TEMPO */}
      {timeModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-white tracking-tight">Configurar Tempo de Acesso</h3>
                  <p className="text-xs text-slate-400 truncate">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTimeModalOpen(false);
                  setSelectedUser(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 hover:bg-white/5 rounded-xl transition shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* STATUS ATUAL E CRONÔMETRO */}
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between w-full items-center">
                  <span className="text-slate-400 font-medium">Vencimento Atual:</span>
                  <strong className="text-slate-200 font-mono">
                    {(() => {
                      const t = trialPeriods[selectedUser.family_id || selectedUser.id] || trialPeriods[selectedUser.id];
                      return t?.trial_expires_at ? new Date(t.trial_expires_at).toLocaleString('pt-BR') : 'Indeterminado';
                    })()}
                  </strong>
                </div>
                <div className="flex justify-between w-full items-center pt-2.5 border-t border-white/5">
                  <span className="text-slate-400 font-bold text-amber-500">Tempo Restante:</span>
                  {(() => {
                    const t = trialPeriods[selectedUser.family_id || selectedUser.id] || trialPeriods[selectedUser.id];
                    return <CountdownTimer expiresAt={t?.trial_expires_at || null} />;
                  })()}
                </div>
              </div>

              {/* SELETOR REFATORADO DE DIA, HORA E MINUTO */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Escolher Dia e Horário do Término</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* SELETOR DE DATA */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400/80" />
                      Data (Dia / Mês / Ano)
                    </span>
                    <input
                      type="date"
                      value={customExpiryDate.split('T')[0] || ''}
                      onChange={(e) => {
                        const dateVal = e.target.value;
                        const timeVal = customExpiryDate.split('T')[1] || '12:00';
                        setCustomExpiryDate(`${dateVal}T${timeVal}`);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-950/80 border border-white/10 focus:border-amber-500 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition cursor-pointer [color-scheme:dark]"
                    />
                  </div>

                  {/* SELETOR DE HORA E MINUTO */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400/80" />
                      Horário (Hora : Minuto)
                    </span>
                    <input
                      type="time"
                      value={customExpiryDate.split('T')[1] || '12:00'}
                      onChange={(e) => {
                        const dateVal = customExpiryDate.split('T')[0] || new Date().toISOString().slice(0, 10);
                        const timeVal = e.target.value;
                        setCustomExpiryDate(`${dateVal}T${timeVal}`);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-950/80 border border-white/10 focus:border-amber-500 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* PREVIEW CARD DO NOVO VENCIMENTO */}
                {customExpiryDate && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5 rounded-2xl border border-amber-500/25 flex items-center gap-3 mt-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="text-xs min-w-0">
                      <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider block">Novo Término Programado</span>
                      <strong className="text-slate-100 font-mono text-xs block truncate mt-0.5">
                        {(() => {
                          const d = new Date(customExpiryDate);
                          return isNaN(d.getTime()) 
                            ? 'Selecione data e hora válidas' 
                            : `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                        })()}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="flex gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setTimeModalOpen(false);
                  setSelectedUser(null);
                }}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyTimeAdjustment}
                disabled={actionLoading !== null || !customExpiryDate}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Confirmar Novo Término</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE COMPROVANTE */}
      {previewProofUrl && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">Comprovante de Pagamento PIX</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Original</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewProofUrl(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-slate-950/80 border border-white/5 p-2 flex items-center justify-center min-h-[300px]">
              {previewProofUrl.endsWith('.pdf') ? (
                <iframe
                  src={previewProofUrl}
                  className="w-full h-[500px] rounded-xl border-0"
                  title="Comprovante PDF"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewProofUrl}
                  alt="Comprovante de pagamento"
                  className="max-h-[550px] w-auto object-contain rounded-xl shadow-lg"
                />
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENÉRICO DE CONFIRMAÇÃO DE AÇÕES CRÍTICAS */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                confirmationModal.variant === 'danger'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white">{confirmationModal.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{confirmationModal.description}</p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmationModal.onConfirm()}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                  confirmationModal.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                {confirmationModal.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
        
        {/* Spacer to prevent content from hiding behind the fixed bottom bar */}
        <div className="h-16 w-full shrink-0"></div>

        {/* Barra de Funções Administrativas - Fixed Bottom */}
        <div className="fixed bottom-0 left-0 w-full p-2 sm:p-3 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40 flex justify-center items-center gap-3 sm:gap-4">
          <button 
            title="Solicitações"
            onClick={() => { setActiveTab('requests'); window.scrollTo(0,0); }} 
            className={`relative p-3 sm:p-3.5 rounded-full transition-all border ${activeTab === 'requests' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-slate-300 hover:text-white border-white/5 hover:border-white/10 hover:bg-white/10'}`}
          >
            <Mail className="w-5 h-5" /> 
            {stats.pendingRequests > 0 && <span className="absolute -top-1 -right-1 bg-indigo-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold border border-slate-900">{stats.pendingRequests}</span>}
          </button>
          
          <button 
            title="Bloqueios"
            onClick={() => { setActiveTab('users'); setStatusFilter('blocked'); window.scrollTo(0,0); }} 
            className={`relative p-3 sm:p-3.5 rounded-full transition-all border ${activeTab === 'users' && statusFilter === 'blocked' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-white/5 text-slate-300 hover:text-white border-white/5 hover:border-white/10 hover:bg-white/10'}`}
          >
            <Ban className="w-5 h-5" /> 
            {stats.blocked > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold border border-slate-900">{stats.blocked}</span>}
          </button>
          
          <button 
            title="Usuários Ativos"
            onClick={() => { setActiveTab('users'); setStatusFilter('active'); window.scrollTo(0,0); }} 
            className={`p-3 sm:p-3.5 rounded-full transition-all border ${activeTab === 'users' && statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-slate-300 hover:text-white border-white/5 hover:border-white/10 hover:bg-white/10'}`}
          >
            <UserCheck className="w-5 h-5" /> 
          </button>
          
          <button 
            title="Testes Expirados"
            onClick={() => { setActiveTab('users'); setStatusFilter('expired'); window.scrollTo(0,0); }} 
            className={`p-3 sm:p-3.5 rounded-full transition-all border ${activeTab === 'users' && statusFilter === 'expired' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/5 text-slate-300 hover:text-white border-white/5 hover:border-white/10 hover:bg-white/10'}`}
          >
            <Clock className="w-5 h-5" /> 
          </button>
          
          <div className="w-px h-6 bg-white/10 mx-1"></div>
          
          <button title="Recarregar" onClick={loadAdminData} className="p-3 sm:p-3.5 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-all border border-transparent hover:bg-slate-700">
            <RefreshCw className="w-5 h-5" /> 
          </button>
        </div>
    </div>
  );
}
