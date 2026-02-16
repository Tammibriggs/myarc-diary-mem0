import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password required");
                }

                await dbConnect();
                const user = await User.findOne({ email: credentials.email });

                if (!user || !user.password) {
                    throw new Error("No user found with this email");
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    throw new Error("Invalid password");
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                };
            }
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            await dbConnect();
            try {
                const existingUser = await User.findOne({ email: user.email });
                if (!existingUser) {
                    await User.create({
                        name: user.name,
                        email: user.email,
                        image: user.image,
                    });
                } else if (account?.provider === 'google') {
                    // Keep Google profile image in sync
                    await User.updateOne(
                        { email: user.email },
                        { $set: { image: user.image } }
                    );
                }
                return true;
            } catch (error) {
                console.error("Error saving user to DB", error);
                return false;
            }
        },
        async session({ session, token }) {

            if (session.user) {
                // @ts-ignore
                session.user.id = token.id as string;
                // @ts-ignore
                session.user.isOnboarded = token.isOnboarded as boolean;
                // @ts-ignore
                session.user.currentFocus = token.currentFocus as string;
                // @ts-ignore
                session.user.themePreference = token.themePreference as string;
            }
            return session;
        },
        async jwt({ token, user, trigger, session }) {
            // Helper to populate token from DB user
            const populateToken = (dbUser: any) => {
                token.id = dbUser._id.toString();
                token.isOnboarded = dbUser.isOnboarded;
                token.currentFocus = dbUser.currentFocus;
                token.themePreference = dbUser.themePreference;
            };

            // 1. Initial sign-in — always fetch fresh from DB
            if (user) {
                await dbConnect();
                const dbUser = await User.findOne({ email: user.email });
                if (dbUser) populateToken(dbUser);
                return token;
            }

            // 2. Client-triggered update (e.g., after onboarding) — whitelist fields
            if (trigger === "update" && session) {
                const allowed = ['isOnboarded', 'currentFocus', 'themePreference'] as const;
                for (const key of allowed) {
                    if (session[key] !== undefined) {
                        token[key] = session[key];
                    }
                }
                return token;
            }


            // 3. Subsequent requests — only re-fetch if not yet onboarded
            if (!token.isOnboarded) {
                await dbConnect();
                const dbUser = await User.findOne({ email: token.email });
                if (dbUser) populateToken(dbUser);
            }

            return token;
        },
    },
    pages: {
        signIn: '/auth',
    },
    session: {
        strategy: "jwt",
    },
});

export { handler as GET, handler as POST };
