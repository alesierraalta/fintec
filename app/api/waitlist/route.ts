import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkWaitlistRateLimit } from '@/lib/waitlist/rate-limiter';
import { WaitlistSchema } from '@/lib/validations/schemas';
import { z } from 'zod';

export async function POST(request: NextRequest) {
    try {
        // 1. Rate Limiting Check
        // Use IP address as identifier, fallback to 'unknown' if not present
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const { success: rateLimitSuccess } = await checkWaitlistRateLimit(ip);

        if (!rateLimitSuccess) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        // 2. Parse Request Body
        const body = await request.json();

        // 3. Honeypot Check (Anti-bot)
        // If 'honeypot' field is present and filled, silently reject
        if (body.honeypot) {
            // Return success to confuse the bot, but don't save anything
            return NextResponse.json({ success: true, message: 'Thank you for joining!' }, { status: 201 });
        }

        // 4. Validate Input with Zod
        const validationResult = WaitlistSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid email address', details: validationResult.error.format() },
                { status: 400 }
            );
        }

        const { email } = validationResult.data;

        // 5. Create Supabase client and insert into database
        const supabase = await createClient();

        // Using simple INSERT approach as per RLS policy
        const { error: dbError } = await supabase
            .from('waitlist')
            .insert([
                {
                    email,
                    source: 'landing',
                    referrer: body.referrer || null
                }
            ]);

        // Handle Supabase errors
        if (dbError) {
            // Check for duplicate key violation (code 23505)
            if (dbError.code === '23505') {
                return NextResponse.json(
                    { error: 'Email already registered' },
                    { status: 409 }
                );
            }

            console.error('Waitlist DB Error:', dbError);
            return NextResponse.json(
                { error: 'Failed to join waitlist. Please try again.' },
                { status: 500 }
            );
        }

        // 6. Success Response
        return NextResponse.json(
            { success: true, message: 'Welcome to the waitlist!' },
            { status: 201 }
        );

    } catch (error) {
        console.error('Waitlist API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
