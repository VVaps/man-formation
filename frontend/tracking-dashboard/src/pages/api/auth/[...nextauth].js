// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';


export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'text',     placeholder: 'you@domain.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const conn = await mysql.createConnection({
          host:     process.env.DB_HOST,
          user:     process.env.DB_USER,
          port:     process.env.DB_PORT,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE,
        });
        const [rows] = await conn.execute(
          'SELECT * FROM users WHERE email = ?',
          [credentials.email]
        );
        await conn.end();
        if (!rows.length) return null;

        const user = rows[0];
        if (!(await bcrypt.compare(credentials.password, user.password))) {
          return null;
        }
        if (!user.is_verified) {
          throw new Error('Veuillez vérifier votre e‑mail avant de vous connecter.');
        }

        // what’s stored in the JWT
        return { id: user.id, name: user.username, email: user.email };
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  // 🔍 turn on debug so we see a StackTrace instead of “s is not a function”
  debug: true,

  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/auth',
    error:  '/auth',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      return session;
    },
  },
});