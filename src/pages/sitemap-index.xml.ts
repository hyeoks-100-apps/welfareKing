import type { APIRoute } from 'astro';
import { CATEGORIES } from '../lib/categories';
import { href } from '../lib/href';
import { getAllPosts } from '../lib/posts';

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export const GET: APIRoute = ({ site }) => {
  const baseSite = site ?? new URL('http://localhost:4321');
  const posts = getAllPosts({ includeDrafts: false });

  const urls = [
    href('/'),
    href('/search/'),
    href('/rss.xml'),
    href('/robots.txt'),
    ...CATEGORIES.map((category) => href(`/c/${category.slug}/`)),
    ...posts.map((post) => href(`/p/${post.slug}/`)),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => {
      const loc = new URL(url, baseSite).toString();
      return `  <url><loc>${escapeXml(loc)}</loc></url>`;
    })
    .join('\n')}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
    },
  });
};
