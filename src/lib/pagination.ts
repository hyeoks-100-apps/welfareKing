export const PAGE_SIZE = 24;

export function totalPages(totalItems: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function sliceByPage<T>(items: T[], page: number, pageSize = PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
