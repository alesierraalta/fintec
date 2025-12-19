import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Extracts and validates the authenticated user from a Next.js request
 * 
 * @param request - The Next.js request object
 * @returns The authenticated user ID
 * @throws Error if no token is provided or authentication fails
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   try {
 *     const userId = await getAuthenticatedUser(request);
 *     // Use userId for database queries
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: 'Unauthorized' },
 *       { status: 401 }
 *     );
 *   }
 * }
 * ```
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<string> {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        throw new Error('No authorization token provided');
    }

    // Create a Supabase client with the token
    const supabaseWithAuth = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        }
    );

    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser();

    if (authError || !user) {
        throw new Error('Authentication failed');
    }

    return user.id;
}
