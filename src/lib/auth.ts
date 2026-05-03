import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isPrivateMode, getAdminCredentials } from "@/lib/app-mode";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = getDb();

        // 私人模式：仅允许管理员登录
        if (isPrivateMode()) {
          const { email, password } = getAdminCredentials();
          if (!email || !password) return null;
          if (credentials.email !== email || credentials.password !== password) return null;

          // 查找或创建管理员
          let user = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (user.length === 0) {
            const id = uuidv4();
            const passwordHash = await bcrypt.hash(password, 10);
            await db.insert(users).values({
              id,
              email,
              name: "管理员",
              passwordHash,
            });
            user = [{ id, email, name: "管理员", passwordHash, createdAt: null }];
          }

          return { id: user[0].id, email: user[0].email, name: user[0].name };
        }

        // 服务模式：通用账号验证
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user.length) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user[0].passwordHash
        );

        if (!isValid) return null;

        return {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
  }
}
