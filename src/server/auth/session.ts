import "server-only";

export class AuthenticationRequired extends Error {
  constructor() {
    super("인증된 세션이 필요해요.");
    this.name = "AuthenticationRequired";
  }
}

/** Implement with a server-side provider that verifies signatures/session state.
 * userId is our internal app.users ID, mapped from the verified issuer + subject.
 * Never implement this by accepting a user ID or role from a header/body/query.
 */
export interface SessionProvider {
  getVerifiedSession(): Promise<{ userId: string; expiresAt: number; verifiedEmail?: string } | null>;
}

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireSession(provider: SessionProvider) {
  const session = await provider.getVerifiedSession();
  if (!session || !uuidPattern.test(session.userId) || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
    throw new AuthenticationRequired();
  }
  return Object.freeze({ userId: session.userId, expiresAt: session.expiresAt, verifiedEmail: session.verifiedEmail });
}
