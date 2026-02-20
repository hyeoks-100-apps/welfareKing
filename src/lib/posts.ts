import type { CategorySlug } from './categories';
import { PostSchema, type Post } from './postSchema';

type PostOptions = {
  includeDrafts?: boolean;
};

const postModules = import.meta.glob('../../data/posts/*.json', {
  eager: true,
}) as Record<string, { default: unknown }>;

const parsedPosts: Post[] = Object.entries(postModules).map(([filePath, module]) => {
  const parsed = PostSchema.safeParse(module.default);

  if (!parsed.success) {
    console.error(`[posts] Invalid post data in ${filePath}`);
    console.error(parsed.error.format());
    throw new Error(`[posts] Invalid post JSON schema: ${filePath}`);
  }

  if (parsed.data.id !== parsed.data.slug) {
    console.error(`[posts] id and slug mismatch in ${filePath}`);
    throw new Error(`[posts] id must match slug: ${filePath}`);
  }

  return parsed.data;
});

function sortByPublishedAtDesc(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getAllPosts(opts: PostOptions = {}): Post[] {
  const includeDrafts = opts.includeDrafts ?? import.meta.env.DEV;
  const visiblePosts = includeDrafts
    ? parsedPosts
    : parsedPosts.filter((post) => post.status === 'published');

  return sortByPublishedAtDesc(visiblePosts);
}

export function getPostsByCategory(category: CategorySlug, opts: PostOptions = {}): Post[] {
  return getAllPosts(opts).filter((post) => post.category === category);
}

export function getPostBySlug(slug: string, opts: PostOptions = {}): Post | undefined {
  return getAllPosts(opts).find((post) => post.slug === slug);
}
