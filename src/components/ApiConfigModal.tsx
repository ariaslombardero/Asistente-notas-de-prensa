import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useApiConfig, Provider } from '../context/ApiConfigContext';
import { X, Key, ExternalLink, Info, ShieldCheck, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

interface ApiConfigModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  t: any;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ open, onOpenChange, t }) => {
  const { config, setConfig } = useApiConfig();
  const [provider, setProvider] = useState<Provider>(config?.provider || 'gemini');
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [model, setModel] = useState(config?.model || 'gemini-3.1-flash-lite-preview');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when config changes (e.g. when cleared)
  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setApiKey(config.apiKey);
      setModel(config.model);
    } else {
      setApiKey('');
    }
  }, [config]);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setIsValidating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      await ai.models.generateContent({
        model: model === 'custom' ? 'gemini-3.1-flash-lite-preview' : model,
        contents: "test",
      });
      setConfig({ provider, apiKey, model });
      if (onOpenChange) onOpenChange(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "API Key inválida o error de conexión.";
      setError(`Error: ${errorMessage}`);
    } finally {
      setIsValidating(false);
    }
  };

  const geminiModels = [
    { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview (Recomendado)' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
    { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
  ];

  const isConfigured = !!config;

  return (
    <Dialog.Root open={open !== undefined ? open : !isConfigured} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-0 rounded-2xl shadow-2xl z-50 w-[95%] max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <Dialog.Title className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-[#da291c]" />
                {t.apiConfigTitle}
              </Dialog.Title>
              {onOpenChange && (
                <button 
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <Dialog.Description className="text-sm text-slate-500">
              {t.apiConfigDesc}
            </Dialog.Description>
          </div>
          
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                {t.securityNote}
              </p>
            </div>

            <div className="space-y-4">
              <div className="hidden">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{t.providerLabel}</label>
                <select 
                  value={provider} 
                  onChange={(e) => {
                    const newProvider = e.target.value as Provider;
                    setProvider(newProvider);
                    setModel(newProvider === 'gemini' ? 'gemini-3.1-flash-lite-preview' : '');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#da291c] focus:border-[#da291c] outline-none transition-all"
                >
                  <option value="gemini">{t.geminiRecommended}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{t.apiKeyLabel}</label>
                <div className="relative">
                  <input 
                    type={showKey ? "text" : "password"}
                    value={apiKey} 
                    onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                    className={cn("w-full bg-slate-50 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#da291c] focus:border-[#da291c] outline-none transition-all pr-10", error ? "border-red-500" : "border-slate-200")}
                    placeholder={t.apiKeyPlaceholder}
                  />
                  {isValidating ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                  ) : (
                    <Key 
                      className={cn("absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer transition-colors", error ? "text-red-500" : "text-slate-400 hover:text-[#da291c]")}
                      onMouseEnter={() => setShowKey(true)}
                      onMouseLeave={() => setShowKey(false)}
                      onFocus={() => setShowKey(true)}
                      onBlur={() => setShowKey(false)}
                    />
                  )}
                </div>
                {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{t.modelLabel}</label>
                <select 
                  value={model} 
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#da291c] focus:border-[#da291c] outline-none transition-all"
                >
                  {geminiModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  <option value="custom">{t.customModel}</option>
                </select>
                {model === 'custom' && (
                  <input 
                    type="text" 
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#da291c] focus:border-[#da291c] outline-none transition-all"
                    placeholder={t.modelPlaceholder}
                  />
                )}
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-3">
                <Info className="w-3.5 h-3.5 text-[#da291c]" />
                {t.howToGetApiKey}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors group"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">Google Gemini</span>
                    <span className="text-[10px] text-slate-500">{t.geminiFree}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#da291c] transition-colors" />
                </a>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
            <button 
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.saveConfig}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
