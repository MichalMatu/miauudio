import { MediaSessionTrack } from './media-session-track';
import { useEffect, useState } from 'react';
import { IS_NATIVE_APP } from '@/constants/app';
import { useSSR } from '@/hooks/use-ssr';

export function MediaControls() {
  const [mediaControlsEnabled, setMediaControlsEnabled] = useState(false);
  const { isBrowser } = useSSR();

  useEffect(() => {
    if (!isBrowser || IS_NATIVE_APP) return;

    setMediaControlsEnabled('mediaSession' in navigator);
  }, [isBrowser]);

  if (IS_NATIVE_APP || !mediaControlsEnabled) {
    return null;
  }

  return <MediaSessionTrack />;
}
