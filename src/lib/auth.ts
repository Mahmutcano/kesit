import { betterAuth } from 'better-auth';
import { pool, query } from './db';

const isProduction = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET || 'dev_secret_must_be_32_bytes_long_entropy_key_123',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  user: {
    additionalFields: {
      credit_balance: {
        type: 'number',
        defaultValue: 5,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            // Lifecycle Hook: Insert initial SIGNUP_BONUS of 5 credits into credit_transactions ledger
            await query(
              `INSERT INTO credit_transactions (user_id, amount, type, reference_id, metadata)
               VALUES ($1, $2, 'SIGNUP_BONUS', $3, $4)
               ON CONFLICT (reference_id) DO NOTHING`,
              [
                user.id,
                5,
                `signup_${user.id}`,
                JSON.stringify({ source: 'registration_welcome_credits' }),
              ]
            );
          } catch (err) {
            console.error('[Auth Hook] Failed to insert initial signup credits:', err);
          }
        },
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  advanced: {
    cookiePrefix: 'kesit_auth',
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
    },
  },
  rateLimit: {
    enabled: true,
    max: 10,
    window: 60, // 10 requests per minute
  },
  trustedOrigins: [
    'https://exto.help',
    'http://localhost:3000',
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
});

export type Session = typeof auth.$Infer.Session;
