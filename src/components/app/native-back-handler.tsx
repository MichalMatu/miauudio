import { useEffect } from 'react';

import { IS_NATIVE_APP } from '@/constants/app';
import { closeTopLayer } from '@/lib/modal';

export function NativeBackHandler() {
  useEffect(() => {
    if (!IS_NATIVE_APP) return;

    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;

    const registerListener = async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('backButton', ({ canGoBack }) => {
        if (closeTopLayer()) return;

        if (canGoBack) {
          history.back();
          return;
        }

        void App.minimizeApp();
      });

      if (disposed) {
        await handle.remove();
        return;
      }

      removeListener = () => handle.remove();
    };

    void registerListener().catch(error => {
      console.error(
        'Unable to register the Android Back-button listener.',
        error,
      );
    });

    return () => {
      disposed = true;
      void removeListener?.();
    };
  }, []);

  return null;
}
