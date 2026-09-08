import { z } from 'zod';

export const MAX_TITLE_LENGTH = 200;

export const titleSchema = z
  .string({ invalid_type_error: 'Title must be text.' })
  .trim()
  .min(1, 'Title cannot be empty.')
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
});

export const updateDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    // Validated in depth by isTipTapDoc() before it is persisted.
    content: z.unknown().optional(),
  })
  .refine((value) => value.title !== undefined || value.content !== undefined, {
    message: 'Nothing to update. Provide a title or content.',
  });

export const shareDocumentSchema = z.object({
  userId: z.string({ required_error: 'Select a person to share with.' }).trim().min(1, 'Select a person to share with.'),
  permission: z.literal('editor').optional(),
});

export const importDocumentSchema = z.object({
  filename: z.string({ required_error: 'A filename is required.' }).trim().min(1, 'A filename is required.'),
  content: z.string({ required_error: 'File content is required.' }),
});
