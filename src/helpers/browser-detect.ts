let safari: boolean | undefined;

export function isSafari(): boolean {
  if (safari !== undefined) return safari;

  // Source: https://github.com/goldfire/howler.js/blob/v2.2.4/src/howler.core.js#L270
  safari =
    navigator.userAgent.includes('Safari') &&
    !navigator.userAgent.includes('Chrome');

  return safari;
}
