// Used only to generate the initial Better Auth SQL migration. The live app uses D1.
import { DatabaseSync } from 'node:sqlite';
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: new DatabaseSync(':memory:'),
  emailAndPassword: { enabled: true },
});
