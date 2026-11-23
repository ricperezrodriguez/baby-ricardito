/** Throws 404 `BABY_NOT_FOUND` when the baby does not exist. Injected into the services that need it. */
export type RequireBaby = (babyId: string) => Promise<void>;
