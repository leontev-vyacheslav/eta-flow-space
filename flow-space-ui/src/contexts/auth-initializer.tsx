// components/AuthInitializer.tsx
import { useEffect } from 'react';
import { useAuthStore } from './auth-store';

export function AuthInitializer() {
  const initFromStorage = useAuthStore((s) => s.initFromStorage);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return null;
}