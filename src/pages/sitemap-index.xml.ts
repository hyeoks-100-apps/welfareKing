import type { APIRoute } from 'astro';
import { CATEGORIES } from '../lib/categories';
import { href } from '../lib/href';
import { PAGE_SIZE, totalPages } from '../lib/pagination';
import { getAllPosts, getPostsByCategory } from '../lib/posts';
import { sortByDeadline } from '../lib/sortPosts';
import { encodeTag } from '../lib/tagCodec';

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export const GET: APIRoute = ({ site }) => {
  const baseSite = site ?? new URL('http://localhost:4321');
  const posts = getAllPosts({ includeDrafts: false });

  const tags = [...new Set(posts.flatMap((post) => post.tags))];
  const regionCodes = [...new Set(posts.flatMap((post) => post.regions))].filter((code) => code !== 'ALL');

  const urls = new Set<string>([
    href('/'),
    href('/search/'),
    href('/updates/'),
    href('/rss.xml'),
    href('/robots.txt'),
    ...posts.map((post) => href(`/p/${post.slug}/`)),
  ]);

  for (const category of CATEGORIES) {
    urls.add(href(`/c/${category.slug}/`));
    urls.add(href(`/c/${category.slug}/deadline/`));

    const latestPages = totalPages(getPostsByCategory(category.slug, { includeDrafts: false }).length, PAGE_SIZE);
    for (let p = 2; p <= latestPages; p += 1) {
      urls.add(href(`/c/${category.slug}/page/${p}/`));
    }

    const deadlinePages = totalPages(sortByDeadline(getPostsByCategory(category.slug, { includeDrafts: false })).length, PAGE_SIZE);
    for (let p = 2; p <= deadlinePages; p += 1) {
      urls.add(href(`/c/${category.slug}/deadline/page/${p}/`));
    }
  }

  for (const tag of tags) {
    const encoded = encodeTag(tag);
    urls.add(href(`/tag/${encoded}/`));
    const pages = totalPages(posts.filter((post) => post.tags.includes(tag)).length, PAGE_SIZE);
    for (let p = 2; p <= pages; p += 1) {
      urls.add(href(`/tag/${encoded}/page/${p}/`));
    }
  }

  for (const code of regionCodes) {
    urls.add(href(`/region/${code}/`));
    const pages = totalPages(posts.filter((post) => post.regions.includes(code) || post.regions.includes('ALL')).length, PAGE_SIZE);
    for (let p = 2; p <= pages; p += 1) {
      urls.add(href(`/region/${code}/page/${p}/`));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls]
    .map((url) => `  <url><loc>${escapeXml(new URL(url, baseSite).toString())}</loc></url>`)
    .join('\n')}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
    },
  });
};
