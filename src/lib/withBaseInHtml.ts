export function withBaseInHtml(html: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  if (normalizedBase === '/') {
    return html;
  }

  return html.replace(/(src|href)="\/(?!\/)([^\"]*)"/g, (_match, attr, path) => {
    return `${attr}="${normalizedBase}${path}"`;
  });
}
