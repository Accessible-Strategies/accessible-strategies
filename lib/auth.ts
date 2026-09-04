import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const validUsername = credentials.username === process.env.ADMIN_USERNAME;
        if (!validUsername) {
          return null;
        }

        const validPassword = await bcrypt.compare(
          credentials.password,
          process.env.ADMIN_PASSWORD_HASH ?? ''
        );

        if (!validPassword) {
          return null;
        }

        return { id: '1', name: process.env.ADMIN_USERNAME };
      },
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
};