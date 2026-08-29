'use client';

import React, { useState, useId, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PIX_CONFIG } from '@/lib/pix';
import { supabase } from '@/lib/supabase';
import { 
  X, 
  Copy, 
  Check, 
  QrCode, 
  Upload, 
  ShieldCheck, 
  Building2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Send,
  Lock
} from 'lucide-react';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
  userName?: string;
  familyId?: string | null;
  trialId?: string;
  onRequestRelease: (reason: string, proofUrl?: string) => Promise<{ success: boolean; error?: string }>;
  onSuccessSubmitted?: () => void;
  initialPlan?: 'monthly' | 'yearly';
}

export function PixPaymentModal({
  isOpen,
  onClose,
  userId,
  trialId,
  onRequestRelease,
  onSuccessSubmitted,
  initialPlan = 'monthly',
}: PixPaymentModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(initialPlan);
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeStep, setActiveStep] = useState<'pay' | 'upload'>('pay');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const fileInputId = useId();

  useEffect(() => {
    if (isOpen && initialPlan) {
      setSelectedPlan(initialPlan);
    }
  }, [isOpen, initialPlan]);

  if (!isOpen) return null;

  const currentPlan = PIX_CONFIG.plans[selectedPlan];

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(currentPlan.copiaECola);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      // Fallback
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
      const cleanFileName = `${userId || 'user'}_pix_${Date.now()}.${fileExt}`;
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

      // Update trial_periods table
      if (trialId) {
        await supabase
          .from('trial_periods')
          .update({
            payment_proof_url: publicUrl,
            payment_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', trialId);
      }

      // Register release request for SuperAdmin
      const reasonText = notes.trim()
        ? `Pagamento PIX ${currentPlan.formattedAmount} realizado. Observação: ${notes.trim()}`
        : `Pagamento PIX ${currentPlan.formattedAmount} realizado (Beneficiário ${PIX_CONFIG.beneficiary}). Comprovante anexado.`;

      const reqRes = await onRequestRelease(reasonText, publicUrl);
      if (!reqRes.success) {
        console.warn('Notice when saving release request:', reqRes.error);
      }

      setUploadSuccess(true);
      if (onSuccessSubmitted) {
        onSuccessSubmitted();
      }
    } catch (err: any) {
      console.error('Error uploading payment proof:', err);
      setErrorMessage(err.message || 'Erro ao enviar comprovante. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl shadow-indigo-500/10 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto"
      >
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-emerald-400">
                <QrCode className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Pagamento via PIX
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {currentPlan.formattedAmount}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Liberação de acesso instantânea após confirmação
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {uploadSuccess ? (
          /* Estado de Sucesso */
          <div className="py-5 text-center space-y-4 relative z-10">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Comprovante Enviado com Sucesso!</h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Seu comprovante de <span className="text-emerald-300 font-bold">{currentPlan.formattedAmount}</span> foi enviado diretamente ao painel do SuperAdmin para liberação da conta.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-emerald-500/20 rounded-2xl p-3 text-left text-xs space-y-1.5 max-w-xs mx-auto">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Próximos Passos:</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Assim que o SuperAdmin confirmar o pagamento no painel, seu acesso será liberado automaticamente.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              Entendido, Fechar Janela
            </button>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            {/* Step Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveStep('pay')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeStep === 'pay'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>1. QR Code & Chave</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('upload')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeStep === 'upload'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>2. Enviar Comprovante</span>
                {selectedFile && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            </div>

            {/* TAB 1: QR CODE AUTÊNTICO & CHAVE ÚNICA */}
            {activeStep === 'pay' && (
              <div className="space-y-3.5">
                {/* Plano Selector inside modal */}
                <div className="bg-slate-950/60 p-2 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block px-1.5 mt-0.5">
                    Selecione o Plano de Recarga:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('monthly')}
                      className={`py-2 px-3 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                        selectedPlan === 'monthly'
                          ? 'bg-indigo-600/20 text-white border-indigo-500/50 shadow-md'
                          : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent'
                      }`}
                    >
                      <span className="text-white text-[11px]">1 Mês (Mensal)</span>
                      <span className="text-[10px] text-emerald-400 font-extrabold">R$ 7,00</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('yearly')}
                      className={`py-2 px-3 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-0.5 cursor-pointer border relative overflow-hidden ${
                        selectedPlan === 'yearly'
                          ? 'bg-indigo-600/20 text-white border-indigo-500/50 shadow-md'
                          : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent'
                      }`}
                    >
                      <span className="text-white text-[11px] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400 animate-pulse animate-duration-1000" />
                        1 Ano (Anual)
                      </span>
                      <span className="text-[10px] text-emerald-400 font-extrabold">R$ 75,00</span>
                    </button>
                  </div>
                </div>

                {/* Authentic PagBank QR Code Card Container */}
                <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3">
                  {/* Outer container with soft gradient border matching the authentic screenshot */}
                  <div className="p-1 rounded-[24px] bg-gradient-to-tr from-[#E6F399] via-[#89EDCE] to-[#4ECDC4] shadow-2xl shadow-black/60 inline-block">
                    <div className="bg-white p-3.5 rounded-[20px] flex items-center justify-center">
                      <QRCodeSVG
                        value={currentPlan.copiaECola}
                        size={190}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  </div>

                  {/* Informações de Valor e Banco */}
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-400 font-medium">Valor a ser pago</span>
                    <div className="text-xl font-black text-white tracking-tight">
                      {currentPlan.formattedAmount}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-indigo-300">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{PIX_CONFIG.beneficiary}</span>
                    </div>
                  </div>
                </div>

                {/* ÚNICA CHAVE PIX PARA COPIAR (Sem duplicidade) */}
                <div className="bg-slate-950/90 border border-indigo-500/30 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Código Pix Copia e Cola
                    </span>
                    <span className="text-emerald-400 font-semibold text-[10px]">Copia e Cola</span>
                  </div>

                  <div className="bg-slate-900 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-white truncate select-all">
                      {currentPlan.copiaECola}
                    </span>
                  </div>

                  {/* Botão de Cópia Único em Destaque (Inspirado no botão PagBank) */}
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className={`w-full py-3 rounded-xl text-xs font-extrabold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                      copiedKey
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                        : 'bg-[#0080c8] hover:bg-[#006ea8] text-white shadow-lg shadow-[#0080c8]/25'
                    }`}
                  >
                    {copiedKey ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Código Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar código Pix</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Botão para Avançar para Envio de Comprovante */}
                <button
                  type="button"
                  onClick={() => setActiveStep('upload')}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/5"
                >
                  <span>Já realizei o pagamento? Anexar Comprovante</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB 2: ENVIO DE COMPROVANTE */}
            {activeStep === 'upload' && (
              <div className="space-y-3.5">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">
                    Selecione a foto ou PDF do comprovante:
                  </span>

                  <label
                    htmlFor={fileInputId}
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                      selectedFile
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-white/15 bg-white/[0.02] hover:border-indigo-500/50 hover:bg-white/[0.04]'
                    }`}
                  >
                    <input
                      id={fileInputId}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="space-y-2 w-full flex flex-col items-center">
                        {filePreview ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={filePreview}
                            alt="Prévia do comprovante"
                            className="max-h-28 rounded-lg border border-white/10 object-contain shadow-md"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-white truncate max-w-xs">{selectedFile.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Clique para alterar
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center mx-auto shadow-md">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Clique para escolher comprovante</p>
                          <p className="text-[10px] text-slate-400">Imagem (PNG, JPG) ou PDF (até 10MB)</p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                {/* Mensagem / Observação */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Mensagem ou observação (opcional):
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Nome da conta PagBank que enviou"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {errorMessage && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 flex items-center gap-2 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveStep('pay')}
                    className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitProof}
                    disabled={uploading || !selectedFile}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando comprovante...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar Comprovante ao Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

