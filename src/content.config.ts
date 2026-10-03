import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(['journal', 'notes']),
  slug: z.string().optional(),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  type: z.enum(['article', 'series', 'project', 'note']).default('article'),
  series: z.string().optional(),
  order: z.number().optional(),
});

const blogs = defineCollection({
  // Explicit frontmatter slugs keep published URLs stable when files move between categories.
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blogs' }),
  schema: postSchema,
});

export const collections = { blogs };
