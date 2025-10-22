import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Validation schemas
const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const signUpSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// User type
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  emailVerified?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Mock user database (replace with real database)
const users: User[] = [
  {
    id: '1',
    name: 'Usuario Demo',
    email: 'demo@fintec.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock password storage (in real app, use database with hashed passwords)
const userPasswords: Record<string, string> = {
  'demo@fintec.com': '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5m4xOlkOG2', // 'demo123'
};

// NextAuth configuration
export const authConfig = {
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    // Credentials provider for email/password
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'tu@email.com'
        },
        password: { 
          label: 'Contraseña', 
          type: 'password',
          placeholder: 'Tu contraseña'
        },
      },
      async authorize(credentials: any) {
        try {
          // Validate input
          const validatedFields = signInSchema.safeParse(credentials);
          
          if (!validatedFields.success) {
            return null;
          }

          const { email, password } = validatedFields.data;

          // Find user (replace with database query)
          const user = users.find(u => u.email === email);
          if (!user) {
            return null;
          }

          // Check password (replace with database password check)
          const storedPassword = userPasswords[email];
          if (!storedPassword) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(password, storedPassword);
          if (!isValidPassword) {
            return null;
          }

          // Return user object
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatar,
          };
        } catch (error) {
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/welcome',
  },

  callbacks: {
    async signIn({ user, account, profile, email, credentials }: any) {
      // Allow OAuth sign-ins
      if (account?.provider === 'google') {
        return true;
      }

      // Allow credential sign-ins if user exists
      if (account?.provider === 'credentials') {
        return !!user;
      }

      return false;
    },

    async redirect({ url, baseUrl }: any) {
      // Allows relative callback URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },

    async session({ session, token }: any) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
      }
      return session;
    },

    async jwt({ token, user, account, profile }: any) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.image,
        };
      }

      return token;
    },
  },

  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  events: {
    async signIn({ user, account, profile, isNewUser }: any) {
    },
    async signOut({ session, token }: any) {
    },
    async createUser({ user }: any) {
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Helper functions for authentication
export const getSession = auth;

export const getCurrentUser = async () => {
  const session = await auth();
  return session?.user;
};

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// User registration function (mock implementation)
export const registerUser = async (userData: z.infer<typeof signUpSchema>): Promise<User | null> => {
  try {
    // Validate input
    const validatedFields = signUpSchema.safeParse(userData);
    
    if (!validatedFields.success) {
      throw new Error('Invalid input data');
    }

    const { name, email, password } = validatedFields.data;

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store user (in real app, save to database)
    users.push(newUser);
    userPasswords[email] = hashedPassword;

    return newUser;
  } catch (error) {
    return null;
  }
};

// Email verification (mock implementation)
export const sendVerificationEmail = async (email: string): Promise<boolean> => {
  try {
    // In real app, send verification email
    return true;
  } catch (error) {
    return false;
  }
};

// Password reset (mock implementation)
export const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
  try {
    // In real app, send password reset email
    return true;
  } catch (error) {
    return false;
  }
};

// Export schemas for use in components
export { signInSchema, signUpSchema };
export type { User };
