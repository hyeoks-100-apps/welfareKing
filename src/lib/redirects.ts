import redirectsJson from '../../data/redirects.json';

type RedirectMap = Record<string, string>;

const redirects = (redirectsJson || {}) as RedirectMap;

export function getRedirectTarget(slug: string): string | null {
  const target = redirects[slug];
  return typeof target === 'string' && target ? target : null;
}

export function getAllRedirectSlugs(): string[] {
  return Object.keys(redirects);
}
