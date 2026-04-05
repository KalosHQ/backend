import { CanActivate, ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import { VersioningType } from '@nestjs/common';
import { AuthControllerV1 } from '../src/modules/auth/v1/auth.controller';
import { AuthServiceV1 } from '../src/modules/auth/v1/auth.service';
import { AppConfigService } from '../src/config/config.service';
import { GoogleAuthGuard } from '../src/modules/auth/v1/guards/google-auth.guard';
import { JwtAuthGuard } from '../src/modules/auth/v1/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../src/modules/auth/v1/guards/jwt-refresh.guard';
import { LocalAuthGuard } from '../src/modules/auth/v1/guards/local-auth.guard';

describe('AuthControllerV1 (e2e)', () => {
  let app: NestFastifyApplication;

  const authService = {
    createAuthInitToken: jest.fn(
      (flow: 'login' | 'register', deviceId?: string) => ({
        token: `${flow}-init-token`,
        flow,
        deviceId,
        expiresInSeconds: 300,
      }),
    ),
    register: jest.fn(async () => ({
      user: { id: 'user-1', email: 'new@example.com' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })),
    login: jest.fn(async () => ({
      user: { id: 'user-1', email: 'new@example.com' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })),
    socialLogin: jest.fn(async () => ({
      user: { id: 'user-1', email: 'google@example.com' },
      accessToken: 'google-access-token',
      refreshToken: 'google-refresh-token',
    })),
    refreshTokens: jest.fn(async () => ({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    })),
    logout: jest.fn(async () => ({ success: true })),
    currentAuthenticatedUser: jest.fn(async () => ({
      id: 'user-1',
      email: 'new@example.com',
    })),
    listDevices: jest.fn(async () => [{ deviceId: 'device-1' }]),
    verifyOtp: jest.fn(async () => ({ success: true })),
  };

  const configService = {
    getNodeEnv: jest.fn(() => 'test'),
  };

  const localGuard: CanActivate = {
    canActivate: (context: ExecutionContext) => {
      const req = context
        .switchToHttp()
        .getRequest<{ user?: { id: string } }>();
      req.user = { id: 'user-1' };
      return true;
    },
  };

  const jwtAuthGuard: CanActivate = {
    canActivate: (context: ExecutionContext) => {
      const req = context
        .switchToHttp()
        .getRequest<{ user?: { sub: string } }>();
      req.user = { sub: 'user-1' };
      return true;
    },
  };

  const jwtRefreshGuard: CanActivate = {
    canActivate: (context: ExecutionContext) => {
      const req = context
        .switchToHttp()
        .getRequest<{ user?: { sub: string } }>();
      req.user = { sub: 'user-1' };
      return true;
    },
  };

  const googleAuthGuard: CanActivate = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest<{
        user?: { providerId: string; email: string; name: string };
      }>();
      req.user = {
        providerId: 'google-provider-1',
        email: 'google@example.com',
        name: 'Google User',
      };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthControllerV1],
      providers: [
        { provide: AuthServiceV1, useValue: authService },
        { provide: AppConfigService, useValue: configService },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue(localGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtAuthGuard)
      .overrideGuard(JwtRefreshGuard)
      .useValue(jwtRefreshGuard)
      .overrideGuard(GoogleAuthGuard)
      .useValue(googleAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(cookie, { secret: 'test-cookie-secret' });
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/auth/register/init', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register/init',
      payload: { deviceId: 'device-1' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      token: 'register-init-token',
      flow: 'register',
      expiresInSeconds: 300,
    });
    expect(authService.createAuthInitToken).toHaveBeenCalledWith(
      'register',
      'device-1',
    );
  });

  it('POST /v1/auth/login/init', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login/init',
      payload: { deviceId: 'device-1' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      token: 'login-init-token',
      flow: 'login',
      expiresInSeconds: 300,
    });
    expect(authService.createAuthInitToken).toHaveBeenCalledWith(
      'login',
      'device-1',
    );
  });

  it('POST /v1/auth/register', async () => {
    const body = {
      email: 'new@example.com',
      password: 'SecurePass123!',
      displayName: 'New User',
      deviceId: 'device-1',
      initToken: 'register-init-token',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      headers: { 'user-agent': 'e2e-test-agent' },
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    expect(authService.register).toHaveBeenCalledWith(
      body,
      expect.any(String),
      'e2e-test-agent',
    );
    expect(res.json()).toEqual({
      user: { id: 'user-1', email: 'new@example.com' },
      accessToken: 'access-token',
    });
    expect(String(res.headers['set-cookie'])).toContain(
      'refreshToken=refresh-token',
    );
  });

  it('POST /v1/auth/login', async () => {
    const body = {
      email: 'new@example.com',
      password: 'SecurePass123!',
      initToken: 'login-init-token',
      deviceId: 'device-1',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'user-agent': 'e2e-test-agent' },
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    expect(authService.login).toHaveBeenCalledWith(
      'user-1',
      'device-1',
      'login-init-token',
      expect.any(String),
      'e2e-test-agent',
    );
    expect(res.json()).toEqual({
      user: { id: 'user-1', email: 'new@example.com' },
      accessToken: 'access-token',
    });
    expect(String(res.headers['set-cookie'])).toContain(
      'refreshToken=refresh-token',
    );
  });

  it('GET /v1/auth/google', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/auth/google' });
    expect(res.statusCode).toBe(200);
  });

  it('GET /v1/auth/google/callback', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/google/callback',
      headers: { 'user-agent': 'e2e-test-agent' },
    });

    expect(res.statusCode).toBe(200);
    expect(authService.socialLogin).toHaveBeenCalledWith(
      {
        provider: 'google',
        socialId: 'google-provider-1',
        email: 'google@example.com',
        displayName: 'Google User',
        deviceId: 'google-oauth',
      },
      expect.any(String),
      'e2e-test-agent',
    );
    expect(res.json()).toEqual({
      user: { id: 'user-1', email: 'google@example.com' },
      accessToken: 'google-access-token',
    });
    expect(String(res.headers['set-cookie'])).toContain(
      'refreshToken=google-refresh-token',
    );
  });

  it('POST /v1/auth/refresh returns 400 when token/device are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /v1/auth/refresh', async () => {
    const body = { refreshToken: 'refresh-token', deviceId: 'device-1' };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    expect(authService.refreshTokens).toHaveBeenCalledWith('user-1', body);
    expect(res.json()).toEqual({ accessToken: 'new-access-token' });
    expect(String(res.headers['set-cookie'])).toContain(
      'refreshToken=new-refresh-token',
    );
  });

  it('POST /v1/auth/logout', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      payload: { deviceId: 'device-1' },
    });

    expect(res.statusCode).toBe(201);
    expect(authService.logout).toHaveBeenCalledWith('user-1', {
      deviceId: 'device-1',
    });
    expect(res.json()).toEqual({ success: true });
  });

  it('GET /v1/auth/me', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/auth/me' });

    expect(res.statusCode).toBe(200);
    expect(authService.currentAuthenticatedUser).toHaveBeenCalledWith('user-1');
    expect(res.json()).toEqual({ id: 'user-1', email: 'new@example.com' });
  });

  it('GET /v1/auth/devices', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/auth/devices' });

    expect(res.statusCode).toBe(200);
    expect(authService.listDevices).toHaveBeenCalledWith('user-1');
    expect(res.json()).toEqual([{ deviceId: 'device-1' }]);
  });

  it('POST /v1/auth/verify-otp', async () => {
    const body = { otp: '123456' };
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-otp',
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    expect(authService.verifyOtp).toHaveBeenCalledWith('user-1', body);
    expect(res.json()).toEqual({ success: true });
  });
});
