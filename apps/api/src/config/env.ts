import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  /** Folder of the uploaded photos (a Docker volume in production). */
  PHOTOS_DIR: z.string().min(1).default('storage/photos'),
});

export type Env = z.infer<typeof EnvSchema>;

/** Validates the environment once at startup so a bad value fails fast. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}
