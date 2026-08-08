import { useEffect } from 'react';

import { IS_NATIVE_APP } from '@/constants/app';

function isSelectableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  return (
    target.closest('input, textarea, [contenteditable="true"], .selectable') !==
    null
  );
}

function shouldPreventContextMenu(): boolean {
  if (IS_NATIVE_APP) return true;

  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export function usePreventTextSelection() {
  useEffect(() => {
    const preventSelect = (event: Event) => {
      if (isSelectableTarget(event.target)) return;

      event.preventDefault();
    };

    const preventContextMenu = (event: MouseEvent) => {
      if (!shouldPreventContextMenu()) return;
      if (isSelectableTarget(event.target)) return;

      event.preventDefault();
    };

    document.addEventListener('selectstart', preventSelect);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('selectstart', preventSelect);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);
}
