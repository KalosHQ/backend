# Social Login Setup Guide

## Current Status

Social login endpoints (Google and Facebook OAuth) are currently implemented as **placeholders** to allow development to continue without requiring OAuth credentials. The authentication infrastructure uses JWT for access and refresh tokens.

## What's Already Set Up

### JWT Authentication (Fully Implemented)

- ✅ Local authentication (email/phone + password)
- ✅ JWT access tokens (15 minute expiry)
- ✅ JWT refresh tokens (30 day expiry, stored hashed in Device table)
- ✅ Token refresh endpoint
- ✅ Device tracking and management
- ✅ Logout functionality

### Social Login (Placeholder Implementation)

- ⏳ Google OAuth strategy (placeholder)
- ⏳ Facebook OAuth strategy (placeholder)
- ⏳ Social login endpoint (placeholder)

## Enabling Social Login

When you're ready to implement social login, follow these steps:

### 1. Set Up OAuth Apps

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:4000/v1/auth/google/callback`
6. Copy Client ID and Client Secret

#### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URI: `http://localhost:4000/v1/auth/facebook/callback`
5. Copy App ID and App Secret

### 2. Update Environment Variables

Add to your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

### 3. Implement Social Login Logic

#### Update Google Strategy (`src/modules/auth/v1/strategies/google.strategy.ts`)

```typescript
async validate(
  _accessToken: string,
  _refreshToken: string,
  profile: any,
  done: VerifyCallback,
) {
  const { id, emails, displayName } = profile;
  const email = emails?.[0]?.value;

  // Return user data to be processed by auth service
  done(null, {
    socialId: id,
    email,
    displayName,
    provider: 'google'
  });
}
```

#### Update Facebook Strategy (`src/modules/auth/v1/strategies/facebook.strategy.ts`)

```typescript
async validate(
  _accessToken: string,
  _refreshToken: string,
  profile: any,
  done: (error: any, user?: any, info?: any) => void,
) {
  const email = profile.emails?.[0]?.value;

  // Return user data to be processed by auth service
  done(null, {
    socialId: profile.id,
    email,
    displayName: profile.displayName,
    provider: 'facebook',
  });
}
```

#### Update Auth Service (`src/modules/auth/v1/auth.service.ts`)

```typescript
async socialLogin(dto: SocialLoginDto, ip?: string, userAgent?: string) {
  // 1. Verify the OAuth token with the provider
  // 2. Extract user info from the provider
  // 3. Find existing user or create new one

  let user = await this.prisma.user.findFirst({
    where: {
      OR: [
        { email: dto.email },
        {
          socialAccounts: {
            some: {
              provider: dto.provider,
              providerId: dto.providerId,
            }
          }
        }
      ]
    }
  });

  // Create new user if doesn't exist
  if (!user) {
    user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isEmailVerified: true, // OAuth providers verify emails
        socialAccounts: {
          create: {
            provider: dto.provider,
            providerId: dto.providerId,
          }
        }
      }
    });
  }

  // 4. Issue JWT tokens
  return this.issueTokens(user.id, ip, userAgent);
}
```

#### Update Auth Controller (`src/modules/auth/v1/auth.controller.ts`)

```typescript
@Post('social-login')
@UseGuards(JwtAuthGuard) // Or create a social auth guard
async socialLogin(
  @Body() body: SocialLoginDto,
  @Req() req: FastifyRequest,
  @Res({ passthrough: true }) res: FastifyReply,
) {
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  const result = await this.authService.socialLogin(body, ip, userAgent);

  // Set refresh token in HTTP-only cookie
  await res.setCookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: this.config.isProd(),
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return {
    user: result.user,
    accessToken: result.tokens.accessToken,
  };
}
```

### 4. Database Schema

If not already present, add social accounts relationship to your Prisma schema:

```prisma
model User {
  // ... existing fields
  socialAccounts SocialAccount[]
}

model SocialAccount {
  id         String   @id @default(uuid())
  userId     String
  provider   String   // 'google' | 'facebook'
  providerId String   // OAuth provider's user ID
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([provider, providerId])
  @@index([userId])
}
```

Run migration:

```bash
pnpm prisma migrate dev --name add_social_accounts
```

### 5. Testing

Test the OAuth flow:

1. Navigate to `http://localhost:4000/v1/auth/google` (you'll need to add this route)
2. Complete OAuth flow with Google
3. Verify JWT tokens are issued correctly

## Security Considerations

- Always use HTTPS in production
- Validate OAuth tokens server-side
- Store refresh tokens hashed in database
- Implement rate limiting on auth endpoints
- Use secure cookies (httpOnly, secure, sameSite)
- Consider implementing CSRF protection

## Additional Features to Consider

- **Account Linking**: Allow users to link multiple OAuth providers to one account
- **Email Verification**: Send verification emails for accounts created via OAuth without verified email
- **Profile Completion**: Prompt users to complete profile after OAuth signup
- **Token Revocation**: Implement endpoint to revoke all refresh tokens
- **Suspicious Activity**: Log and alert on unusual login patterns

## Resources

- [Passport.js Documentation](http://www.passportjs.org/)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
