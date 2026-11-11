/** Faste lenker og verdier som brukes flere steder i appen. */
export const SITE_URL = '../';
export const REPO_URL = 'https://github.com/RanheimGeriljaTV/Kraft-Promille';
export const ISSUES_URL = `${REPO_URL}/issues/new`;
export const APP_VERSION = __APP_VERSION__;

/** Filer i public/ må hentes relativt til base (./), ikke fra roten. */
export const asset = (file) => `${import.meta.env.BASE_URL}${file}`;
