'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, X, Copy, Check, Delete } from 'lucide-react';

interface QuickCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function safeEvalMath(expressionStr: string): number {
  const sanitized = expressionStr.replace(/×/g, '*').replace(/÷/g, '/');
  if (!/^[0-9\.\+\-\*\/ ]+$/.test(sanitized)) {
    return NaN;
  }
  try {
    const fn = new Function(`"use strict"; return (${sanitized});`);
    return fn();
  } catch {
    return NaN;
  }
}

export function QuickCalculatorModal({ isOpen, onClose }: QuickCalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [copied, setCopied] = useState(false);

  const handleNum = useCallback((num: string) => {
    setDisplay((prev) => {
      if (prev === '0' && num !== '.') {
        return num;
      }
      if (num === '.' && prev.includes('.')) {
        return prev;
      }
      if (prev.length < 15) {
        return prev + num;
      }
      return prev;
    });
  }, []);

  const handleOp = useCallback((op: string) => {
    setDisplay((prevDisplay) => {
      setExpression(`${prevDisplay} ${op} `);
      return '0';
    });
  }, []);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setExpression('');
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay((prev) => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      return '0';
    });
  }, []);

  const handleCalculate = useCallback(() => {
    setExpression((prevExpr) => {
      if (!prevExpr) return prevExpr;
      setDisplay((prevDisplay) => {
        const fullExp = prevExpr + prevDisplay;
        const res = safeEvalMath(fullExp);
        if (isNaN(res) || !isFinite(res)) {
          return 'Erro';
        }
        const rounded = Math.round(res * 100000) / 100000;
        return String(rounded);
      });
      return `${prevExpr}${display} =`;
    });
  }, [display]);

  const handlePercent = useCallback(() => {
    setDisplay((prev) => {
      const val = parseFloat(prev) / 100;
      if (isNaN(val)) return 'Erro';
      return String(val);
    });
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [display]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNum(e.key);
      } else if (e.key === '.') {
        handleNum('.');
      } else if (e.key === '+') {
        handleOp('+');
      } else if (e.key === '-') {
        handleOp('-');
      } else if (e.key === '*') {
        handleOp('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOp('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCalculate();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNum, handleOp, handleCalculate, handleBackspace, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="bg-[#0b1329]/95 backdrop-blur-2xl border border-white/10 w-full max-w-xs rounded-[32px] p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Calculator className="w-4 h-4" />
            <span>Calculadora Rápida</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Screen */}
        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-3 text-right space-y-1 shadow-inner min-h-[76px] flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 font-mono truncate h-4">
            {expression || '\u00A0'}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-white/5 transition text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
              title="Copiar resultado"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono truncate tracking-tight">
              {display}
            </div>
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <button
            onClick={handleClear}
            className="p-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-2xl border border-rose-500/30 transition cursor-pointer active:scale-95"
          >
            AC
          </button>
          <button
            onClick={handleBackspace}
            className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-2xl border border-white/10 transition cursor-pointer active:scale-95 flex items-center justify-center"
            title="Apagar caractere"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            onClick={handlePercent}
            className="p-3 bg-white/5 hover:bg-white/10 text-indigo-300 font-bold text-xs rounded-2xl border border-white/10 transition cursor-pointer active:scale-95"
          >
            %
          </button>
          <button
            onClick={() => handleOp('÷')}
            className="p-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold text-sm rounded-2xl border border-indigo-500/30 transition cursor-pointer active:scale-95"
          >
            ÷
          </button>

          {/* Row 2 */}
          <button onClick={() => handleNum('7')} className="p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            7
          </button>
          <button onClick={() => handleNum('8')} className="p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            8
          </button>
          <button onClick={() => handleNum('9')} className="p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            9
          </button>
          <button onClick={() => handleOp('×')} className="p-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold text-sm rounded-2xl border border-indigo-500/30 transition cursor-pointer active:scale-95">
            ×
          </button>

          {/* Row 3 */}
          <button onClick={() => handleNum('4')} className="p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            4
          </button>
          <button onClick={() => handleNum('5')} className="p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            5
          </button>
          <button onClick={() => handleNum('6')} className="p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            6
          </button>
          <button onClick={() => handleOp('-')} className="p-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold text-sm rounded-2xl border border-indigo-500/30 transition cursor-pointer active:scale-95">
            -
          </button>

          {/* Row 4 */}
          <button onClick={() => handleNum('1')} className="p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            1
          </button>
          <button onClick={() => handleNum('2')} className="p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            2
          </button>
          <button onClick={() => handleNum('3')} className="p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            3
          </button>
          <button onClick={() => handleOp('+')} className="p-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold text-sm rounded-2xl border border-indigo-500/30 transition cursor-pointer active:scale-95">
            +
          </button>

          {/* Row 5 */}
          <button onClick={() => handleNum('0')} className="col-span-2 p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            0
          </button>
          <button onClick={() => handleNum('.')} className="p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/5 transition cursor-pointer active:scale-95">
            ,
          </button>
          <button onClick={handleCalculate} className="p-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base rounded-2xl border border-blue-400/30 transition cursor-pointer active:scale-95 shadow-lg shadow-blue-600/30">
            =
          </button>
        </div>
      </div>
    </div>
  );
}
