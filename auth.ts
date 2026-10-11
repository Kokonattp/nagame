// Optional sign-in for Tabi (Auth.js v5): LINE first, Google as the fallback.
// Off until the owner adds the keys on Vercel — without them every page works as before
// (trips stay in the browser) and /api/auth answers 404.
//
//   AUTH_SECRET                         random 32+ chars (e.g. `npx auth secret`)
//   AUTH_LINE_ID, AUTH_LINE_SECRET      LINE Developers → LINE Login channel
//   AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET  Google Cloud → OAuth client (optional)
//
// Privacy: the session keeps only a stable id ("line:<sub>") plus display name and picture.
// No email is stored or sent to the browser.

import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Line from "next-auth/providers/line";

const providers: NextAuthConfig["providers"] = [];
// "openid profile" only: Auth.js asks for email by default, and Tabi does not collect it
const noEmail = { authorization: { params: { scope: "openid profile" } } };
if (process.env.AUTH_LINE_ID && process.env.AUTH_LINE_SECRET) providers.push(Line(noEmail));
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google(noEmail));

export const authEnabled = Boolean(process.env.AUTH_SECRET) && providers.length > 0;
export const authProviders = providers.map((p) => (typeof p === "function" ? p() : p).id);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  trustHost: true,
  callbacks: {
    jwt({ token, account }) {
      if (account) token.uid = `${account.provider}:${account.providerAccountId}`;
      delete token.email;
      return token;
    },
    session({ session, token }) {
      return { ...session, user: { id: String(token.uid ?? ""), name: session.user?.name ?? null, image: session.user?.image ?? null } } as typeof session;
    },
  },
});

/** The signed-in user's stable id, or null (also null when sign-in is not configured). */
export async function currentUserId(): Promise<string | null> {
  if (!authEnabled) return null;
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id && /^(line|google):[\w.-]{1,128}$/.test(id) ? id : null;
}
