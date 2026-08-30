'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Profile, Family, FamilyMember, TrialPeriod, AdminRole } from '@/types/database';

interface SignUpData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  familyName: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  family: Family | null;
  familyMembers: FamilyMember[];
  trial: TrialPeriod | null;
  adminRole: AdminRole | null;
  isSuperAdmin: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  isTrialExpired: boolean;
  serverTime: Date;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; isSuperAdmin?: boolean }>;
  signUp: (data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  requestTrialRelease: (reason: string, proofUrl?: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [trial, setTrial] = useState<TrialPeriod | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [serverTime, setServerTime] = useState<Date>(new Date());

  // Sync server time (fallback to local time seamlessly)
  const syncServerTime = useCallback(async () => {
    setServerTime(new Date());
  }, []);

  useEffect(() => {
    syncServerTime();
    // Only update root serverTime once every 30 seconds to prevent unnecessary app-wide re-renders
    const interval = setInterval(() => {
      setServerTime(new Date(Date.now() + serverTimeOffset));
    }, 30000);
    return () => clearInterval(interval);
  }, [syncServerTime, serverTimeOffset]);

  // Load profile, family, and trial information for current authenticated user
  const loadUserData = useCallback(async (currentUser: User) => {
    if (!isSupabaseConfigured) return;

    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileErr) {
        console.warn('Error fetching profile:', profileErr.message);
      }

      let currentProfile = profileData;

      if (!currentProfile || !currentProfile.family_id) {
        // Double check: check if the user already has any family member record
        const { data: existingMember } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (existingMember?.family_id) {
          // A family association already exists! Recover and use it instead of creating a new family.
          const { data: recoveredProfile } = await supabase
            .from('profiles')
            .upsert({
              id: currentUser.id,
              full_name: currentProfile?.full_name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuário',
              email: currentProfile?.email || currentUser.email,
              family_id: existingMember.family_id,
              role: currentProfile?.role || 'owner',
              status: currentProfile?.status || 'trial'
            })
            .select()
            .single();
          if (recoveredProfile) currentProfile = recoveredProfile;
        } else {
          // Auto-create Family and Profile if they don't exist (e.g., OAuth login)
          const familyName = currentUser.user_metadata?.family_name || 'Minha Família';
          const { data: newFamily } = await supabase
            .from('families')
            .insert({ name: familyName })
            .select()
            .single();

          if (newFamily) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .upsert({
                id: currentUser.id,
                full_name: currentProfile?.full_name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuário',
                email: currentProfile?.email || currentUser.email,
                family_id: newFamily.id,
                role: currentProfile?.role || 'owner',
                status: currentProfile?.status || 'trial'
              })
              .select()
              .single();
            
            if (newProfile) currentProfile = newProfile;
            
            await supabase.from('family_members').upsert({
              family_id: newFamily.id,
              user_id: currentUser.id,
              member_type: 'Titular',
              permission: 'owner',
            });

            const now = new Date();
            const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            await supabase.from('trial_periods').upsert({
              user_id: currentUser.id,
              family_id: newFamily.id,
              trial_started_at: now.toISOString(),
              trial_expires_at: expiresAt.toISOString(),
              status: 'trial',
            });
          }
        }
      }

      if (currentProfile) {
        setProfile(currentProfile as Profile);

        // 2. Fetch Family
        if (currentProfile.family_id) {
          const { data: familyData } = await supabase
            .from('families')
            .select('*')
            .eq('id', currentProfile.family_id)
            .maybeSingle();
          
          if (familyData) {
            setFamily(familyData as Family);
          }

          // Fetch family members
          const { data: membersData } = await supabase
            .from('family_members')
            .select('*, profile:profiles(*)')
            .eq('family_id', currentProfile.family_id);

          if (membersData) {
            setFamilyMembers(membersData as FamilyMember[]);
          }
        }
      }

      // 3. Fetch Trial Period
      let trialData: TrialPeriod | null = null;
      const { data: userTrial } = await supabase
        .from('trial_periods')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (userTrial) {
        trialData = userTrial as TrialPeriod;
      } else if (currentProfile?.family_id) {
        const { data: familyTrial } = await supabase
          .from('trial_periods')
          .select('*')
          .eq('family_id', currentProfile.family_id)
          .order('created_at', { ascending: false })
          .maybeSingle();
        if (familyTrial) trialData = familyTrial as TrialPeriod;
      }

      if (!trialData) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        trialData = {
          id: currentUser.id,
          user_id: currentUser.id,
          family_id: currentProfile?.family_id || currentUser.id,
          trial_started_at: currentProfile?.created_at || now.toISOString(),
          trial_expires_at: expiresAt.toISOString(),
          status: 'trial',
          is_blocked: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };
        try {
          await supabase.from('trial_periods').upsert({
            user_id: currentUser.id,
            family_id: currentProfile?.family_id || currentUser.id,
            trial_started_at: currentProfile?.created_at || now.toISOString(),
            trial_expires_at: expiresAt.toISOString(),
            status: 'trial',
            is_blocked: false,
          }, { onConflict: 'user_id' });
        } catch {
          // ignore
        }
      }

      setTrial(trialData);

      // 4. Fetch Admin Role (or assign for master admin email kalebsantos2801@gmail.com)
      const isMasterAdminEmail = currentUser.email?.toLowerCase().trim() === 'kalebsantos2801@gmail.com';

      const { data: adminData } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (adminData) {
        setAdminRole(adminData as AdminRole);
      } else if (isMasterAdminEmail) {
        const masterRole: AdminRole = {
          id: currentUser.id,
          user_id: currentUser.id,
          email: currentUser.email || 'kalebsantos2801@gmail.com',
          role: 'superadmin',
          requires_password_change: false,
          created_at: new Date().toISOString()
        };
        try {
          await supabase.from('admin_roles').upsert({
            user_id: currentUser.id,
            email: currentUser.email || 'kalebsantos2801@gmail.com',
            role: 'superadmin',
            requires_password_change: false
          });
        } catch {
          // Ignore silently if table not yet writable
        }
        setAdminRole(masterRole);
      } else {
        setAdminRole(null);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserData(user);
    }
  }, [user, loadUserData]);

  // Handle Supabase Auth state changes & session init
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // Listen to real auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          loadUserData(newSession.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setProfile(null);
        setFamily(null);
        setFamilyMembers([]);
        setTrial(null);
        setAdminRole(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  // Realtime subscription and fast 4-second polling for active user status and trial updates
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    let isMounted = true;

    // Fast polling fallback every 4s to catch any admin actions (block, unblock, trial adjustments)
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const { data: pData } = await supabase
          .from('profiles')
          .select('id, status, role, family_id')
          .eq('id', user.id)
          .maybeSingle();

        if (pData && isMounted) {
          setProfile((prev) => prev ? { ...prev, ...pData } : null);
        }

        const { data: tData } = await supabase
          .from('trial_periods')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .maybeSingle();

        if (tData && isMounted) {
          setTrial(tData as TrialPeriod);
        }
      } catch {
        // Ignore polling errors
      }
    }, 4000);

    const channel = supabase
      .channel(`user-status-channel-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => {
          if (isMounted) loadUserData(user);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trial_periods', filter: `user_id=eq.${user.id}` },
        () => {
          if (isMounted) loadUserData(user);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [user, loadUserData]);

// Helper to translate Supabase Auth errors to friendly Portuguese messages
function translateAuthError(errorMsg: string): string {
  if (!errorMsg) return 'Ocorreu um erro inesperado na autenticação.';
  const lower = errorMsg.toLowerCase();
  
  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Por favor, verifique se o e-mail e a senha digitados estão corretos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'E-mail ainda não foi confirmado. Verifique a caixa de entrada do seu e-mail.';
  }
  if (lower.includes('user not found')) {
    return 'E-mail não encontrado no sistema. Verifique o e-mail digitado ou crie uma conta.';
  }
  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'Este e-mail já está cadastrado no sistema. Tente realizar o login ou redefinir a senha.';
  }
  if (lower.includes('rate limit exceeded') || lower.includes('too many requests')) {
    return 'Muitas tentativas de acesso em pouco tempo. Aguarde alguns instantes e tente novamente.';
  }
  if (lower.includes('password should be at least')) {
    return 'A senha deve conter no mínimo 6 caracteres.';
  }
  return errorMsg;
}

  // Sign In using real Supabase Auth
  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { 
        success: false, 
        error: 'Supabase não está configurado. Defina as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente.' 
      };
    }

    try {
      const cleanEmail = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: translateAuthError(error.message) };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await loadUserData(data.user);

        // Check if user is superadmin
        const isMasterAdminEmail = data.user.email?.toLowerCase().trim() === 'kalebsantos2801@gmail.com';
        const { data: adminData } = await supabase
          .from('admin_roles')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();

        const isSuperAdmin = adminData?.role === 'superadmin' || isMasterAdminEmail;

        return { success: true, isSuperAdmin };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao realizar login';
      return { success: false, error: translateAuthError(msg) };
    }
  };

  // Sign Up: Supabase Auth -> Profile -> Family -> Family Member -> 7-day Trial
  const signUp = async ({ name, email, password, confirmPassword, familyName }: SignUpData) => {
    if (!isSupabaseConfigured) {
      return { 
        success: false, 
        error: 'Supabase não está configurado. Por favor, conecte seu projeto Supabase no arquivo .env.local.' 
      };
    }

    if (!name.trim()) return { success: false, error: 'O nome é obrigatório.' };
    if (!email.trim() || !email.includes('@')) return { success: false, error: 'Insira um e-mail válido.' };
    if (!password || password.length < 6) return { success: false, error: 'A senha deve ter no mínimo 6 caracteres.' };
    if (confirmPassword && password !== confirmPassword) return { success: false, error: 'As senhas não conferem.' };
    if (!familyName.trim()) return { success: false, error: 'O nome da família é obrigatório.' };

    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            family_name: familyName.trim(),
          },
        },
      });

      if (authError) {
        return { success: false, error: translateAuthError(authError.message) };
      }

      const createdUser = authData.user;
      if (!createdUser) {
        return { success: false, error: 'Não foi possível obter os dados do usuário cadastrado.' };
      }

      // 2. Create Family
      const { data: createdFamily, error: familyError } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
        })
        .select()
        .single();

      const familyId = createdFamily?.id || null;
      if (familyError && !familyId) {
        console.warn('Family insert notice:', familyError.message);
      }

      // 3. Create / Upsert Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: createdUser.id,
          full_name: name.trim(),
          email: email.trim(),
          family_id: familyId,
          role: 'owner',
          status: 'trial',
        });

      if (profileError) {
        console.warn('Profile upsert notice:', profileError.message);
      }

      // 4. Create Family Member
      if (familyId) {
        await supabase.from('family_members').upsert({
          family_id: familyId,
          user_id: createdUser.id,
          member_type: 'Titular',
          permission: 'owner',
        });
      }

      // 5. Create 7-day Trial Period
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await supabase.from('trial_periods').upsert({
        user_id: createdUser.id,
        family_id: familyId,
        trial_started_at: now.toISOString(),
        trial_expires_at: expiresAt.toISOString(),
        status: 'trial',
      });

      // Reload state if session already active (e.g. email confirmation off)
      if (authData.session) {
        setSession(authData.session);
        setUser(createdUser);
        await loadUserData(createdUser);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar conta';
      return { success: false, error: msg };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setFamily(null);
    setFamilyMembers([]);
    setTrial(null);
    setAdminRole(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // Reset Password (sends email link)
  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase não configurado.' };
    }
    try {
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/reset-password`
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        return { success: false, error: translateAuthError(error.message) };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao solicitar recuperação de senha';
      return { success: false, error: translateAuthError(msg) };
    }
  };

  // Update Password
  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase não configurado.' };
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: translateAuthError(error.message) };
      }

      // If user had an admin role marked with requires_password_change, clear it
      if (user && adminRole?.requires_password_change) {
        await supabase
          .from('admin_roles')
          .update({ requires_password_change: false })
          .eq('user_id', user.id);
        
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          admin_email: user.email,
          action: 'PASSWORD_INITIAL_CHANGED',
          details: { timestamp: new Date().toISOString() },
        });
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar senha';
      return { success: false, error: msg };
    }
  };

  // Request Trial Release / Extension
  const requestTrialRelease = async (reason: string, proofUrl?: string) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };
    try {
      const resolvedUserName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
      const userFamId = profile?.family_id || family?.id || null;

      // Attempt 1: Full payload with family_id and payment_proof_url
      const payload: Record<string, unknown> = {
        user_id: user.id,
        user_email: user.email || '',
        user_name: resolvedUserName,
        reason: reason.trim() || (proofUrl ? 'Comprovante de pagamento anexado.' : 'Solicitação de liberação.'),
        status: 'pending',
      };

      if (userFamId) payload.family_id = userFamId;
      if (proofUrl) payload.payment_proof_url = proofUrl;

      const { error: insertErr } = await supabase.from('release_requests').insert(payload);

      if (insertErr) {
        console.warn('First insert attempt on release_requests encountered an error, trying standard payload:', insertErr.message);
        
        // Attempt 2: Standard schema columns (user_id, user_email, user_name, reason, status)
        const fallbackPayload = {
          user_id: user.id,
          user_email: user.email || '',
          user_name: resolvedUserName,
          reason: proofUrl ? `${reason.trim()} [Comprovante: ${proofUrl}]` : reason.trim(),
          status: 'pending',
        };

        const { error: fallbackErr } = await supabase.from('release_requests').insert(fallbackPayload);
        if (fallbackErr) {
          console.error('Fallback insert into release_requests failed:', fallbackErr);
          return { success: false, error: fallbackErr.message };
        }
      }

      // Notify Admins/SuperAdmins of the request
      try {
        const adminUserIds = new Set<string>();

        // Fetch from admin_roles
        const { data: adminRolesData } = await supabase
          .from('admin_roles')
          .select('user_id');
        
        if (adminRolesData) {
          adminRolesData.forEach(r => {
            if (r.user_id) adminUserIds.add(r.user_id);
          });
        }

        // Fetch from profiles where is_super_admin is true, or email is kalebsantos2801@gmail.com
        const { data: adminProfilesData } = await supabase
          .from('profiles')
          .select('id')
          .or('is_super_admin.eq.true,role.eq.admin,email.ilike.kalebsantos2801@gmail.com');
        
        if (adminProfilesData) {
          adminProfilesData.forEach(p => {
            if (p.id) adminUserIds.add(p.id);
          });
        }

        if (adminUserIds.size > 0) {
          const notificationsToInsert = Array.from(adminUserIds).map(adminId => ({
            user_id: adminId,
            title: proofUrl ? '💰 Novo Comprovante Enviado' : '🚨 Nova Solicitação de Liberação',
            message: `O usuário ${resolvedUserName} (${user.email || 'Sem email'}) enviou uma solicitação: "${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}"`,
            type: 'trial_release',
            reference_id: user.id,
            target_url: '/admin',
            is_read: false,
          }));

          await supabase.from('notifications').insert(notificationsToInsert);
        }
      } catch (notifErr) {
        console.warn('Could not send notification to admins:', notifErr);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar solicitação';
      return { success: false, error: msg };
    }
  };

  // Check trial expiration against authoritative server time
  const isMasterAdminEmail = user?.email?.toLowerCase().trim() === 'kalebsantos2801@gmail.com' || profile?.email?.toLowerCase().trim() === 'kalebsantos2801@gmail.com';
  const isSuperAdmin = Boolean(adminRole?.role === 'superadmin' || (profile?.role === 'admin' && adminRole) || isMasterAdminEmail);
  
  let isTrialExpired = false;
  if (!isSuperAdmin) {
    if (profile?.status === 'blocked' || trial?.status === 'blocked' || (trial as any)?.is_blocked === true) {
      isTrialExpired = true;
    } else if (profile?.status === 'expired' || trial?.status === 'expired') {
      isTrialExpired = true;
    } else if (trial?.trial_expires_at) {
      const expireTime = new Date(trial.trial_expires_at).getTime();
      const currentMs = serverTime.getTime();
      if (!isNaN(expireTime) && expireTime > 0 && currentMs >= expireTime) {
        isTrialExpired = true;
      }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    family,
    familyMembers,
    trial,
    adminRole,
    isSuperAdmin,
    loading,
    isAuthenticated: Boolean(user && session),
    isTrialExpired,
    serverTime,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    requestTrialRelease,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
