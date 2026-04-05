import React, { createContext, useContext, useState, useEffect } from 'react';

export type Provider = 'gemini' | 'openrouter';

export interface ApiConfig {
  provider: Provider;
  apiKey: string;
  model: string;
}

interface ApiConfigContextType {
  config: ApiConfig | null;
  setConfig: (config: ApiConfig | null) => void;
  clearConfig: () => void;
}

const ApiConfigContext = createContext<ApiConfigContextType | undefined>(undefined);

export const ApiConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ApiConfig | null>(() => {
    const saved = localStorage.getItem('api_config');
    return saved ? JSON.parse(saved) : null;
  });

  const clearConfig = () => {
    setConfig(null);
    localStorage.removeItem('api_config');
  };

  useEffect(() => {
    if (config) {
      localStorage.setItem('api_config', JSON.stringify(config));
    } else {
      localStorage.removeItem('api_config');
    }
  }, [config]);

  return (
    <ApiConfigContext.Provider value={{ config, setConfig, clearConfig }}>
      {children}
    </ApiConfigContext.Provider>
  );
};

export const useApiConfig = () => {
  const context = useContext(ApiConfigContext);
  if (!context) {
    throw new Error('useApiConfig must be used within an ApiConfigProvider');
  }
  return context;
};
