import { DrizzleAdapter } from '@auth/drizzle-adapter'
import EmailProvider from 'next-auth/providers/email'
import { db } from '@/db/client'

export const authOptions = {
  adapter: DrizzleAdapter(db),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
}
