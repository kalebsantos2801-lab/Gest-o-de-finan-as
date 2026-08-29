'use client';

import React, { useState, useEffect, useId, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { PIX_CONFIG } from '@/lib/pix';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Wallet, 
  QrCode, 
  Copy, 
  Check, 
  Upload, 
  Sparkles, 
  AlertCircle, 
  Building2, 
  CheckCircle2, 
  FileText, 
  ArrowUpRight, 
  Coins,
  ShieldCheck,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function CarteiraPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <CarteiraContent />
      </Suspense>
    </AuthGuard>
  );
}

function CarteiraContent() {
  const { user, profile, family, trial, requestTrialRelease } = useAuth();
  const searchParams = useSearchParams();
  const planParam = searchParams?.get('plan');
  
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (planParam === 'yearly') {
      setSelectedPlan('yearly');
    } else if (planParam === 'monthly') {
      setSelectedPlan('monthly');
    }
  }, [planParam]);

  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'pay' | 'proof'>('pay');
  const fileInputId = useId();

  const currentPlan = PIX_CONFIG.plans[selectedPlan];

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(currentPlan.copiaECola);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = currentPlan.copiaECola;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('O arquivo deve ter menos de 10MB.');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedFile) {
      setErrorMessage('Por favor, selecione o arquivo do comprovante.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      const fileExt = selectedFile.name.split('.').pop() || 'jpg';
      const cleanFileName = `${user?.id || 'user'}_pix_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${cleanFileName}`;

      let { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError && (uploadError.message?.includes('Bucket not found') || (uploadError as any).name === 'BucketNotFound')) {
        const { error: createError } = await supabase.storage.createBucket('payment-proofs', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        });

        if (createError && !createError.message?.includes('already exists')) {
          throw new Error(`Erro ao inicializar bucket: ${createError.message}`);
        }

        const retry = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, selectedFile);
        uploadError = retry.error;
      }

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update trial_periods table if applicable
      if (trial?.id) {
        await supabase
          .from('trial_periods')
          .update({
            payment_proof_url: publicUrl,
            payment_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', trial.id);
      }

      // Register release request for SuperAdmin
      const reasonText = notes.trim()
        ? `Pagamento PIX ${currentPlan.formattedAmount} realizado. Observação: ${notes.trim()}`
        : `Pagamento PIX ${currentPlan.formattedAmount} realizado (Beneficiário ${PIX_CONFIG.beneficiary}). Comprovante anexado.`;

      const reqRes = await requestTrialRelease(reasonText, publicUrl);
      if (!reqRes.success) {
        console.warn('Notice when saving release request:', reqRes.error);
      }

      setUploadSuccess(true);
      setSelectedFile(null);
      setFilePreview(null);
      setNotes('');
    } catch (err: any) {
      console.error('Error uploading payment proof:', err);
      setErrorMessage(err.message || 'Erro ao enviar comprovante. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Banner de Boas-Vindas */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-2xl text-white shrink-0 shadow-lg shadow-indigo-500/15">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Carteira de Recarga
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Escolha o seu plano de acesso preferido e faça a liberação ou renovação imediata do seu aplicativo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-2 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Status Atual</span>
              <span className={`text-xs font-black uppercase ${
                trial?.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {trial?.status === 'active' ? 'Acesso Ativo' : 'Expirado / Aguardando'}
              </span>
            </div>
          </div>
        </div>

        {/* Layout de Duas Colunas para Planos e Comprovante */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Coluna Esquerda: Planos e QR Code (7 colunas) */}
          <div className="lg:col-span-7 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl space-y-6">
            
            {/* Escolha do Plano */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider">1. Escolha o seu Plano</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plano Mensal */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan('monthly');
                    setUploadSuccess(false);
                  }}
                  className={`p-4 rounded-2xl border transition-all text-left relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
                    selectedPlan === 'monthly'
                      ? 'bg-indigo-600/15 border-indigo-500 shadow-xl shadow-indigo-600/10'
                      : 'bg-slate-950/40 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-xs font-extrabold text-indigo-300">Mensal</span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === 'monthly' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                    }`}>
                      {selectedPlan === 'monthly' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-black text-white">R$ 7,00</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Acesso completo por 1 mês para você e sua família.
                    </p>
                  </div>
                </button>

                {/* Plano Anual */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan('yearly');
                    setUploadSuccess(false);
                  }}
                  className={`p-4 rounded-2xl border transition-all text-left relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
                    selectedPlan === 'yearly'
                      ? 'bg-indigo-600/15 border-indigo-500 shadow-xl shadow-indigo-600/10'
                      : 'bg-slate-950/40 border-white/5 hover:border-white/15'
                  }`}
                >
                  {/* Badge de melhor custo beneficio */}
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl tracking-wider animate-pulse">
                    Melhor Valor
                  </div>

                  <div className="flex justify-between items-start w-full">
                    <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Anual
                    </span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === 'yearly' ? 'border-amber-400 bg-amber-500' : 'border-slate-600'
                    }`}>
                      {selectedPlan === 'yearly' && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-black text-white">R$ 75,00</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Economize e tenha 12 meses garantidos sem interrupções.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Instruções de Pagamento e QR Code */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider">2. Escaneie ou Copie o Pix</h2>
              </div>

              <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-5 flex flex-col md:flex-row items-center gap-6">
                
                {/* QR Code */}
                <div className="bg-white p-3 rounded-[24px] shadow-lg flex-shrink-0">
                  <QRCodeSVG
                    value={currentPlan.copiaECola}
                    size={160}
                    level="H"
                  />
                </div>

                {/* Chave Copia e Cola & Beneficiario */}
                <div className="flex-1 space-y-3.5 w-full">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Beneficiário</span>
                    <span className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      {PIX_CONFIG.beneficiary}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Valor do Plano</span>
                    <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                      {currentPlan.formattedAmount}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Código Pix Copia e Cola</span>
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 truncate flex-1 select-all">
                        {currentPlan.copiaECola}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className={`p-2.5 rounded-xl transition cursor-pointer shrink-0 border ${
                          copiedKey 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/20 shadow-lg'
                        }`}
                      >
                        {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Coluna Direita: Upload do Comprovante (5 colunas) */}
          <div className="lg:col-span-5 bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider">3. Envie o Comprovante</h2>
            </div>

            {uploadSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white">Comprovante enviado com sucesso!</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Nossa equipe do SuperAdmin recebeu seu comprovante no valor de <strong className="text-emerald-300">{currentPlan.formattedAmount}</strong> e fará a liberação instantaneamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadSuccess(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-xl transition border border-white/10 cursor-pointer"
                >
                  Enviar outro comprovante
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Após realizar a transferência no seu banco de preferência, tire um print do comprovante e anexe-o abaixo para acelerar sua liberação.
                </p>

                {errorMessage && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/25 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Upload Area */}
                <div 
                  onClick={() => document.getElementById(fileInputId)?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-indigo-500/40 bg-slate-950/40 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group relative overflow-hidden"
                >
                  <input
                    type="file"
                    id={fileInputId}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />

                  {filePreview ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={filePreview} 
                        alt="Comprovante" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg shadow-lg">
                          Trocar Arquivo
                        </span>
                      </div>
                    </div>
                  ) : selectedFile ? (
                    <div className="py-4 space-y-2">
                      <FileText className="w-8 h-8 text-indigo-400 mx-auto" />
                      <p className="text-xs font-bold text-white truncate max-w-[200px] mx-auto">
                        {selectedFile.name}
                      </p>
                      <span className="text-[10px] text-slate-500 font-bold block">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <div className="w-10 h-10 bg-white/5 group-hover:bg-indigo-500/10 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition mx-auto border border-white/5">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-300">
                        Clique para anexar o Comprovante
                      </p>
                      <span className="text-[10px] text-slate-500">
                        Formatos aceitos: JPG, PNG, PDF (Máx 10MB)
                      </span>
                    </div>
                  )}
                </div>

                {/* Notas / Observação */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                    Observação (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Pagamento referente ao plano anual de R$ 75"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={uploading}
                  />
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleSubmitProof}
                  disabled={uploading || !selectedFile}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wide transition shadow-xl shadow-indigo-600/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processando Comprovante...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar e Enviar para o Painel</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Selo de Segurança */}
            <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase bg-slate-950/20 py-2.5 rounded-xl border border-white/5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Transação 100% segura & Criptografada</span>
            </div>

            {/* Suporte WhatsApp */}
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 fill-current"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.981 14.113.957 11.48.957c-5.43 0-9.85 4.37-9.855 9.799-.001 1.838.497 3.633 1.442 5.216l-.974 3.559 3.655-.959zM18.252 14.9c-.34-.17-2.015-.995-2.327-1.109-.312-.113-.539-.17-.766.17-.227.34-.879 1.109-1.077 1.332-.197.223-.396.252-.736.082-.34-.17-1.436-.53-2.735-1.689-1.01-.9-1.692-2.013-1.89-2.352-.198-.34-.022-.523.148-.692.153-.152.34-.396.51-.595.17-.198.227-.34.34-.566.113-.227.056-.425-.028-.595-.085-.17-.766-1.841-1.049-2.522-.276-.664-.556-.574-.766-.585-.198-.01-.425-.01-.652-.01-.227 0-.595.085-.907.425-.312.34-1.19 1.161-1.19 2.83 0 1.67 1.218 3.284 1.388 3.51.17.227 2.399 3.662 5.811 5.132.812.35 1.446.559 1.94.716.815.258 1.558.222 2.146.135.656-.098 2.015-.823 2.298-1.62.283-.797.283-1.479.198-1.62-.085-.141-.312-.227-.652-.397z" />
                  </svg>
                </div>
                <div className="space-y-0.5 text-left">
                  <h4 className="text-xs font-black text-white">Suporte Financeiro</h4>
                  <p className="text-[10px] text-slate-400">Atendimento via WhatsApp</p>
                </div>
              </div>
              <a
                href="https://wa.me/5532999634583?text=Olá!%20Gostaria%20de%20ajuda%20com%20uma%20recarga%20ou%20liberação%20no%20sistema."
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              >
                Falar com Suporte
              </a>
            </div>

          </div>

        </div>

      </main>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/5532999634583?text=Olá!%20Gostaria%20de%20ajuda%20com%20uma%20recarga%20ou%20liberação%20no%20sistema."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-black py-3 px-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-400/20"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.981 14.113.957 11.48.957c-5.43 0-9.85 4.37-9.855 9.799-.001 1.838.497 3.633 1.442 5.216l-.974 3.559 3.655-.959zM18.252 14.9c-.34-.17-2.015-.995-2.327-1.109-.312-.113-.539-.17-.766.17-.227.34-.879 1.109-1.077 1.332-.197.223-.396.252-.736.082-.34-.17-1.436-.53-2.735-1.689-1.01-.9-1.692-2.013-1.89-2.352-.198-.34-.022-.523.148-.692.153-.152.34-.396.51-.595.17-.198.227-.34.34-.566.113-.227.056-.425-.028-.595-.085-.17-.766-1.841-1.049-2.522-.276-.664-.556-.574-.766-.585-.198-.01-.425-.01-.652-.01-.227 0-.595.085-.907.425-.312.34-1.19 1.161-1.19 2.83 0 1.67 1.218 3.284 1.388 3.51.17.227 2.399 3.662 5.811 5.132.812.35 1.446.559 1.94.716.815.258 1.558.222 2.146.135.656-.098 2.015-.823 2.298-1.62.283-.797.283-1.479.198-1.62-.085-.141-.312-.227-.652-.397z" />
        </svg>
        <span>Suporte</span>
      </a>
    </div>
  );
}
