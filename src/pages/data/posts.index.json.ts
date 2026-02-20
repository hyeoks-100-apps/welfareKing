import type { APIRoute } from 'astro';
import { getAllPosts } from '../../lib/posts';

export const GET: APIRoute = () => {
  const items = getAllPosts({ includeDrafts: false }).map((post) => ({
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    category: post.category,
    tags: post.tags,
    thumbnail: post.thumbnail,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  }));

  return new Response(JSON.stringify(items), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
};
