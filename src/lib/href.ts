export function href(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  if (path === '/') {
    return normalizedBase;
  }

  const trimmedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${trimmedPath}`;
}
