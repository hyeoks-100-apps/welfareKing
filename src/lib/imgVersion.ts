type PostLike = {
  publishedAt?: string;
  updatedAt?: string;
};

export function imgVersion(post: PostLike): string {
  const baseDate = post.updatedAt || post.publishedAt || '';
  return baseDate.replace(/-/g, '');
}
