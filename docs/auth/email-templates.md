# Supabase Email Template Configuration

This guide walks you through configuring custom email templates for FinTec's Supabase authentication system.

## Why This Matters

FinTec currently uses **Supabase's default email templates**. While functional, they lack branding and custom messaging. Custom templates improve user trust and provide a consistent experience.

## Accessing Email Template Settings

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your FinTec project
3. Navigate to **Authentication** → **Email Templates** in the left sidebar
4. Or go directly to: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/templates`

## Required Email Templates

### 1. Confirm Signup (Email Verification)

**Triggered when:** A new user registers with `supabase.auth.signUp()`

**Required content:**

- Subject: `Confirmá tu cuenta en FinTec`
- Body should include:
  - Welcome message in Spanish
  - Clear call-to-action button/link (`{{ .ConfirmationURL }}`)
  - Expiration notice (links expire in 24 hours by default)
  - FinTec branding

**Template variables available:**

- `{{ .ConfirmationURL }}` — The URL the user clicks to confirm their email
- `{{ .Token }}` — The confirmation token
- `{{ .TokenHash }}` — Hashed version of the token
- `{{ .SiteURL }}` — Your site URL
- `{{ .Email }}` — User's email address

### 2. Invite User

**Triggered when:** An admin invites a user via `supabase.auth.admin.inviteUserByEmail()`

**Template variables:**

- `{{ .ConfirmationURL }}` — URL for the user to set their password
- `{{ .Token }}` — The invite token
- `{{ .SiteURL }}` — Your site URL
- `{{ .Email }}` — User's email address

### 3. Magic Link

**Triggered when:** A user logs in via magic link (if enabled)

**Template variables:**

- `{{ .MagicLinkURL }}` or `{{ .Token }}` — The magic link URL or token
- `{{ .SiteURL }}` — Your site URL
- `{{ .Email }}` — User's email address

### 4. Reset Password

**Triggered when:** A user requests password reset via `supabase.auth.resetPasswordForEmail()`

**Required content:**

- Subject: `Restablecé tu contraseña en FinTec`
- Body should include:
  - Clear warning that someone requested a password reset
  - Call-to-action button/link (`{{ .ConfirmationURL }}`)
  - Expiration notice (links expire in 1 hour by default)
  - "If you didn't request this, ignore this email" notice
  - FinTec branding

**Template variables:**

- `{{ .ConfirmationURL }}` — The URL for resetting the password
- `{{ .Token }}` — The reset token
- `{{ .SiteURL }}` — Your site URL
- `{{ .Email }}` — User's email address

### 5. Email Change Confirmation

**Triggered when:** A user changes their email address

**Template variables:**

- `{{ .ConfirmationURL }}` — URL to confirm the new email
- `{{ .Token }}` — The confirmation token
- `{{ .SiteURL }}` — Your site URL
- `{{ .Email }}` — User's new email address
- `{{ .NewEmail }}` — The new email address being confirmed

## Required Auth Project Settings

In **Authentication** → **URL Configuration**:

| Setting                  | Value                                                                           | Notes                                            |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| Site URL                 | `http://localhost:3000` (dev) / `https://your-domain.com` (prod)                | Base URL for redirects                           |
| Additional Redirect URLs | `http://localhost:3000/auth/reset-password`, `http://localhost:3000/auth/login` | Allow these URLs for auth redirects              |
| Email Confirmations      | ✅ Enabled                                                                      | Users must verify email before accessing the app |
| Secure password change   | ✅ Enabled                                                                      | Requires existing session to change password     |

## Password Policy Configuration

In **Authentication** → **Providers** → **Email**:

| Setting                    | Recommended Value                 |
| -------------------------- | --------------------------------- |
| Minimum password length    | 8 characters                      |
| Require uppercase          | ✅ Yes                            |
| Require lowercase          | ✅ Yes                            |
| Require numbers            | ✅ Yes                            |
| Require special characters | Optional (not currently enforced) |

**Note:** FinTec's frontend validation now requires 8+ characters with uppercase, lowercase, and digits. Ensure Supabase's password policy matches these requirements to avoid inconsistency between frontend and backend validation.

## Testing Email Delivery

### Development

1. In Supabase Dashboard → **Authentication** → **Settings**
2. Under **Email Auth**, you can enable/disable email confirmations
3. For local testing, you may want to temporarily disable email confirmations to test the full flow

### Production

1. Use Supabase's built-in email service (SendGrid/Resend integration)
2. Or configure a custom SMTP server in **Authentication** → **Settings** → **SMTP Settings**
3. Test by registering a new account and checking email delivery

## Template Customization Tips

1. **Use HTML templates** — Supabase supports full HTML email templates
2. **Keep it responsive** — Many users check email on mobile devices
3. **Include plain text fallback** — Some email clients don't render HTML
4. **Test across email clients** — Use tools like Litmus or Email on Acid
5. **Match FinTec branding** — Use the same colors, fonts, and tone as the app

## Infrastructure as Code (Future)

Currently, email templates are configured manually in the Supabase Dashboard. For team collaboration and CI/CD, consider:

1. Using the [Supabase CLI](https://supabase.com/docs/reference/cli/introduction) to manage project configuration
2. Storing email templates in version control
3. Using Supabase's Management API to deploy templates automatically

Example with Supabase CLI:

```bash
supabase init
supabase link --project-ref YOUR_PROJECT_REF
# Email templates are not yet supported via config.toml, but this is the direction
```

## Current FinTec Setup

- **Email Provider:** Supabase default (SendGrid)
- **Email Confirmations:** Enabled
- **Password Reset:** Enabled with redirect to `/auth/reset-password`
- **Custom Templates:** ❌ Not yet configured (using Supabase defaults)
- **SMTP:** Supabase managed
