-- Email verification is now required for email/password sign-in. Accounts that existed before it
-- was introduced are grandfathered in so nobody is locked out.
UPDATE "user" SET emailVerified = 1 WHERE emailVerified = 0;
