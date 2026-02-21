import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getAllPosts } from '../lib/posts';

export const GET: APIRoute = (context) => {
  const posts = getAllPosts({ includeDrafts: false }).slice(0, 30);

  return rss({
    title: '복지정보.com RSS',
    description: '복지정보.com 최신 복지/지원금 글 피드',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.title,
      pubDate: new Date(post.publishedAt),
      description: post.summary,
      link: `/p/${post.slug}/`,
    })),
  });
};
