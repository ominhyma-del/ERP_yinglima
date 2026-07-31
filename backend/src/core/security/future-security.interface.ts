/**
 * ── Future Security Architecture Extensions ────────────────────────────────
 *
 * Prepared extension points for MFA (Multi-Factor Authentication), SSO (SAML/OAuth2),
 * LDAP / Active Directory, Device Trust Engine, and API Key / Service Accounts.
 */

export interface MfaProvider {
  generateSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }>;
  verifyCode(userId: string, code: string): Promise<boolean>;
}

export interface SsoProvider {
  id: string;
  name: string; // e.g. Google Workspace, Azure AD, Okta
  getAuthorizationUrl(redirectUri: string): string;
  authenticateCode(code: string): Promise<{ email: string; name: string; externalId: string }>;
}

export interface ApiKeyStore {
  generateApiKey(serviceName: string, scopes: string[]): Promise<{ apiKey: string; keyHash: string }>;
  validateApiKey(apiKey: string): Promise<{ serviceName: string; scopes: string[] } | null>;
}

export interface DeviceTrustEngine {
  isDeviceTrusted(userId: string, deviceFingerprint: string): Promise<boolean>;
  registerDevice(userId: string, deviceFingerprint: string): Promise<void>;
}
