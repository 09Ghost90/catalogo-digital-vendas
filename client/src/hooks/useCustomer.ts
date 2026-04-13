import { useState, useCallback } from 'react';

const CUSTOMER_KEY = 'customer_profile';

export interface CustomerProfile {
  nome: string;
  contato: string;
  endereco: string;
  horarioEntrega: string;
  responsavelRecebimento: string;
  observacoes: string;
}

export interface CustomerCheckout {
  nome: string;
  contato: string;
  endereco: string;
}

const emptyProfile: CustomerProfile = {
  nome: '',
  contato: '',
  endereco: '',
  horarioEntrega: '',
  responsavelRecebimento: '',
  observacoes: '',
};

export function useCustomer() {
  const [profile, setProfile] = useState<CustomerProfile>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return emptyProfile;
  });

  const hasProfile = !!(profile.nome && profile.contato && profile.endereco);

  const saveProfile = useCallback((data: CustomerProfile) => {
    setProfile(data);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data));
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(emptyProfile);
    localStorage.removeItem(CUSTOMER_KEY);
  }, []);

  // Extract checkout fields from the full profile
  const getCheckoutDefaults = useCallback((): CustomerCheckout => {
    return {
      nome: profile.nome,
      contato: profile.contato,
      endereco: profile.endereco,
    };
  }, [profile]);

  return {
    profile,
    hasProfile,
    saveProfile,
    clearProfile,
    getCheckoutDefaults,
  };
}
