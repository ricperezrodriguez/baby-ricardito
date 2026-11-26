import type { RequireBaby } from './common/baby-guard';
import type { Database } from './database/prisma';
import type { PreferenceRepository } from './modules/preferences/preference.repository';

/** What every module receives when it registers its routes. */
export interface AppContext {
  database: Database;
  requireBaby: RequireBaby;
  preferences: PreferenceRepository;
}
