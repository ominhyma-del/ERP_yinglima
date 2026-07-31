/**
 * ── Route Access Map ──────────────────────────────────────────────────────
 *
 * Single source of truth for which permission module (see teamStore's
 * PERMISSION_MODULES) gates each URL. `null` means "any authenticated user
 * can view it" (e.g. the Dashboard).
 *
 * Used in two places so they can never drift apart:
 *  - Sidebar.tsx  -> hides nav links the user can't view
 *  - App.tsx      -> guards the actual route, redirecting away if someone
 *                    navigates to a URL directly without permission
 */
export const ROUTE_PERMISSION: Record<string, string | null> = {
  '/dashboard': null,
  '/suppliers': 'suppliers',
  '/localpurchase': 'inquiry',
  '/buyers': 'buyers',
  '/products': 'products',
  '/analytics': null,
  '/team': 'team',
  '/roles': 'roles',
  '/audit-logs': 'roles',
};
