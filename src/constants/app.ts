import packageMetadata from '../../package.json';

export const APP_NAME = 'Miauudio';
export const APP_DESCRIPTION =
  'Create personal ambient scenes for focus and relaxation.';
export const APP_VERSION = packageMetadata.version;
export const SUPPORT_EMAIL = 'meehow939@gmail.com';

export const IS_NATIVE_APP = import.meta.env.PUBLIC_APP_TARGET === 'native';
