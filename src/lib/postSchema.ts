import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isHttpUrl = (value: string) => /^https?:\/\//.test(value);

export const PostSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  category: z.enum(['youth', 'midlife', 'government', 'smallbiz', 'living-economy']),
  tags: z.array(z.string()),
  thumbnail: z.string().startsWith('/'),
  ogImage: z.string().startsWith('/').optional(),
  publishedAt: z.string().regex(DATE_RE),
  updatedAt: z.string().regex(DATE_RE).optional(),
  status: z.enum(['draft', 'published']),
  contentMd: z.string().min(1),

  regions: z.array(z.string()).default(['ALL']),
  applicationPeriod: z
    .object({
      start: z.string().regex(DATE_RE).optional(),
      end: z.string().regex(DATE_RE).optional(),
      note: z.string().optional(),
    })
    .default({}),
  benefit: z
    .object({
      type: z.enum(['CASH', 'VOUCHER', 'LOAN', 'TAX', 'SERVICE', 'ETC']).optional(),
      amountText: z.string().optional(),
      paymentCycle: z.enum(['ONCE', 'MONTHLY', 'YEARLY', 'ETC']).optional(),
    })
    .default({}),
  eligibility: z.array(z.string()).default([]),
  howToApply: z.array(z.string()).default([]),
  documents: z.array(z.string()).default([]),
  sourceLinks: z
    .array(
      z.object({
        title: z.string().min(1),
        url: z.string().refine(isHttpUrl, 'sourceLinks.url must start with http:// or https://'),
      })
    )
    .default([]),
  contact: z.string().default(''),
  organization: z.string().default(''),
});

export type Post = z.infer<typeof PostSchema>;
