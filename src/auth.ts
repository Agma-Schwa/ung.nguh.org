import NextAuth from 'next-auth'
import Discord from 'next-auth/providers/discord';

declare module 'next-auth' {
    interface Session {
        access_token: string | undefined,
        discord_id?: string
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Discord({
        authorization: {
            params: {
                scope: "identify guilds"
            }
        },
        clientId: process.env.AUTH_DISCORD_ID!,
        clientSecret: process.env.AUTH_DISCORD_SECRET!,
    })],
    callbacks: {
        async jwt({token, account, profile, user}) {
            // During sign-in, 'user' is set; this is when we need to save the access_token etc.
            if (user) return {
                ...token,
                access_token: account?.access_token,
                discord_id: profile?.id
            }

            // Otherwise, we’re fetching an existing token, so take care not to override it.
            return token
        },

        async session({token, session}) {
            session.access_token = token.access_token as string
            session.discord_id = token.discord_id as string
            return session
        }
    },
    trustHost: true,
    secret: process.env.AUTH_SECRET!,
})