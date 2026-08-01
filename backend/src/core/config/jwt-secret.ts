/**
 * SECURITY: single source of truth for the JWT signing secret.
 *
 * Both `AuthModule` (which signs tokens) and `JwtStrategy` (which verifies
 * them) MUST use the exact same secret, or every token this app issues will
 * fail verification. Previously each file had its own `process.env.JWT_SECRET
 * || 'yinglima-enterprise-secret-key-2026'` fallback — same string in both
 * places, which kept logins working, but meant that string was a real,
 * usable production secret sitting in source code (and therefore in git
 * history, in this ZIP, and in anyone's hands who has ever seen this repo).
 * Anyone with that string can forge a valid JWT for ANY user, including an
 * admin, without ever touching a password or a database.
 *
 * This helper removes the fallback entirely. If `JWT_SECRET` isn't set, the
 * app now refuses to start rather than silently running with a secret that
 * is effectively public. That's the correct failure mode for something this
 * sensitive — a misconfigured deployment should be loud and obvious, not a
 * quiet security hole that works fine until someone exploits it.
 */
export function getRequiredJwtSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.trim().length === 0) {
        throw new Error(
            'FATAL: JWT_SECRET environment variable is not set. Refusing to start with a ' +
            'hardcoded/default signing secret, since that would let anyone who has seen ' +
            'this source code forge valid login tokens for any user. Set JWT_SECRET to a ' +
            'long, random, unique value (e.g. `openssl rand -base64 48`) in your .env file ' +
            'before starting the server.',
        );
    }

    if (secret.length < 32) {
        throw new Error(
            'FATAL: JWT_SECRET is set but too short (must be at least 32 characters) to be a ' +
            'safe signing secret. Set it to a long, random, unique value ' +
            '(e.g. `openssl rand -base64 48`) before starting the server.',
        );
    }

    return secret;
}