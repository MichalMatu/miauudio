import { useEffect } from 'react';

import { IS_NATIVE_APP } from '@/constants/app';

export function NativeAppReady() {
  useEffect(() => {
    if (!IS_NATIVE_APP) return;

    let cancelled = false;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          document.documentElement.classList.add('native-app-ready');
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
