import type { APIRoute } from 'astro';
import { href } from '../lib/href';

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = site ? new URL(href('/sitemap-index.xml'), site).toString() : href('/sitemap-index.xml');

  const body = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${sitemapUrl}`,
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
    },
  });
};
