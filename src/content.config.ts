import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const notionCategory = z.enum([
  'init',
  'stuff',
  'tech',
  'machine-learning',
  'embodied-ai',
  'memory',
]);

const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: notionCategory,
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  type: z.enum(['article', 'series', 'project', 'note']).default('article'),
  series: z.string().optional(),
  order: z.number().optional(),
});

const blogs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blogs' }),
  schema: postSchema,
});

export const collections = { blogs };
