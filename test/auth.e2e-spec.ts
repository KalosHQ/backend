import {
  CanActivate,
  ExecutionContext,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import { VersioningType } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthControllerV1 } from '../src/modules/auth/v1/auth.controller';
import { AuthServiceV1 } from '../src/modules/auth/v1/auth.service';
import { AppConfigService } from '../src/config/config.service';
import { GoogleAuthGuard } from '../src/modules/auth/v1/guards/google-auth.guard';
import { JwtAuthGuard } from '../src/modules/auth/v1/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../src/modules/auth/v1/guards/jwt-refresh.guard';
import { LocalAuthGuard } from '../src/modules/auth/v1/guards/local-auth.guard';
import { DeviceService } from '../src/modules/device/v1/device.service';
import { AuthLogService } from '../src/modules/logging/auth-log.service';
import { MailService } from '../src/modules/mail/mail.service';
import { OtpPurpose, OtpService } from '../src/modules/otp/v1/otp.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

type UserRecord = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  passwordHash: string | null;
  isVerified: boolean;
  role: 'USER';
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  googleId: string | null;
  facebookId: string | null;
};

type DeviceRecord = {
  id: string;
  userId: string;
  deviceId: string;
  refreshTokenHash: string | null;
  lastSeenAt: Date | null;
  createdAt: Date;
};

class InMemoryPrisma {
  public users: UserRecord[] = [];
  public devices: DeviceRecord[] = [];
  public authLogs: Array<Record<string, unknown>> = [];

  public failNext = false;

  user = {
    findFirst: async ({ where }: any) => {
      const or = where?.OR as Array<Record<string, string>> | undefined;
      if (or?.length) {
        return (
          this.users.find((user) =>
            or.some((cond) =>
              Object.entries(cond).every(([key, value]) => (user as any)[key] === value),
            ),
          ) ?? null
        );
      }

      const email = where?.email;
      const phone = where?.phone;
      return (
        this.users.find(
          (user) =>
            (email !== undefined ? user.email === email : true) &&
            (phone !== undefined ? user.phone === phone : true),
        ) ?? null
      );
    },
    findUnique: async ({ where }: any) => {
      const id = where?.id;
      return this.users.find((user) => user.id === id) ?? null;
    },
    create: async ({ data }: any) => {
      if (this.failNext) {
        this.failNext = false;
        throw new Error('db-failure');
      }

      const now = new Date();
      const user: UserRecord = {
        id: `user-${this.users.length + 1}`,
        email: data.email ?? null,
        phone: data.phone ?? null,
        displayName: data.displayName ?? null,
        passwordHash: data.passwordHash ?? null,
        isVerified: data.isVerified ?? false,
        role: 'USER',
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
        googleId: data.googleId ?? null,
        facebookId: data.facebookId ?? null,
      };
      this.users.push(user);
      return user;
    },
    update: async ({ where, data }: any) => {
      const user = this.users.find((entry) => entry.id === where.id);
      if (!user) {
        throw new Error('user-not-found');
      }

      Object.assign(user, data, { updatedAt: new Date() });
      return user;
    },
    deleteMany: async ({ where }: any) => {
      const before = this.users.length;
      this.users = this.users.filter((entry) =>
        where.id ? entry.id !== where.id : true,
      );
      return { count: before - this.users.length };
    },
  };

  device = {
    upsert: async ({ where, update, create }: any) => {
      const { userId, deviceId } = where.userId_deviceId;
      const existing = this.devices.find(
        (entry) => entry.userId === userId && entry.deviceId === deviceId,
      );
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }

      const row: DeviceRecord = {
        id: `device-${this.devices.length + 1}`,
        userId: create.userId,
        deviceId: create.deviceId,
        refreshTokenHash: create.refreshTokenHash,
        lastSeenAt: create.lastSeenAt ?? null,
        createdAt: new Date(),
      };
      this.devices.push(row);
      return row;
    },
    findFirst: async ({ where, select }: any) => {
      const row =
        this.devices.find(
          (entry) => entry.userId === where.userId && entry.deviceId === where.deviceId,
        ) ?? null;
      if (!row) {
        return null;
      }
      if (select?.refreshTokenHash) {
        return { refreshTokenHash: row.refreshTokenHash };
      }
      return row;
    },
    deleteMany: async ({ where }: any) => {
      const before = this.devices.length;
      this.devices = this.devices.filter(
        (entry) =>
          (where.userId ? entry.userId !== where.userId : true) ||
          (where.deviceId ? entry.deviceId !== where.deviceId : false),
      );
      return { count: before - this.devices.length };
    },
    findMany: async ({ where }: any) => {
      return this.devices.filter((entry) => entry.userId === where.userId);
    },
  };

  authLog = {
    create: async ({ data }: any) => {
      this.authLogs.push(data);
      return data;
    },
  };

  $transaction = async (operations: Array<Promise<unknown>>) => {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('db-failure');
    }
    return Promise.all(operations);
  };
}

class InMemoryOtpService {
  private store = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

  async generateAndStoreOtp(userId: string, purpose = OtpPurpose.VERIFY_EMAIL) {
    const otp = '123456';
    const ttlSeconds = 600;
    this.store.set(`${purpose}:${userId}`, {
      otp,
      expiresAt: Date.now() + ttlSeconds * 1000,
      attempts: 0,
    });

    return { otp, ttlSeconds };
  }

  async verifyOtp(userId: string, otp: string, purpose = OtpPurpose.VERIFY_EMAIL) {
    const key = `${purpose}:${userId}`;
    const row = this.store.get(key);
    if (!row) {
      return false;
    }

    if (row.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }

    if (row.otp !== otp) {
      row.attempts += 1;
      if (row.attempts >= 3) {
        this.store.delete(key);
      }
      return false;
    }

    this.store.delete(key);
    return true;
  }

  expireOtpFor(userId: string, purpose = OtpPurpose.VERIFY_EMAIL) {
    const row = this.store.get(`${purpose}:${userId}`);
    if (row) {
      row.expiresAt = Date.now() - 1000;
    }
  }
}

class FakeMailService {
  verificationEmails: Array<Record<string, unknown>> = [];
  confirmationEmails: Array<Record<string, unknown>> = [];
  failNext = false;

  async sendVerificationOtpEmail(params: {
    to: string;
    otp: string;
    displayName?: string | null;
    expiresInMinutes: number;
  }) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('resend-down');
    }
    this.verificationEmails.push(params);
  }

  async sendRegistrationConfirmedEmail(params: { to: string; displayName?: string | null }) {
    this.confirmationEmails.push(params);
  }

  queueRegistrationConfirmedEmail(params: { to: string; displayName?: string | null }) {
    this.confirmationEmails.push(params);
  }
}

describe('Auth flows (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: InMemoryPrisma;
  let otp: InMemoryOtpService;
  let mail: FakeMailService;

  const configService = {
    getNodeEnv: jest.fn(() => 'test'),
    getJwtAccessTokenSecret: jest.fn(() => 'test-access-secret'),
    getJwtAccessExpiresIn: jest.fn(() => '15m'),
    getJwtRefreshTokenSecret: jest.fn(() => 'test-refresh-secret'),
    getJwtRefreshExpiresIn: jest.fn(() => '30d'),
    getBcryptSaltRounds: jest.fn(() => 4),
  };

  const localGuard: CanActivate = {
    canActivate: async (context: ExecutionContext) => {
      const req = context
        .switchToHttp()
        .getRequest<{ body: { email?: string; phone?: string; password: string }; user?: { id: string } }>();

      const identifier = req.body.email ?? req.body.phone;
      if (!identifier) {
        throw new UnprocessableEntityException('Invalid credentials');
      }

      const user = await (authServiceRef as AuthServiceV1).validateUser(
        identifier,
        req.body.password,
      );
      req.user = { id: user.id };
      return true;
    },
  };

  const passGuard: CanActivate = { canActivate: () => true };
  let authServiceRef: AuthServiceV1;

  beforeEach(async () => {
    prisma = new InMemoryPrisma();
    otp = new InMemoryOtpService();
    mail = new FakeMailService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [AuthControllerV1],
      providers: [
        AuthServiceV1,
        DeviceService,
        AuthLogService,
        { provide: PrismaService, useValue: prisma },
        { provide: OtpService, useValue: otp },
        { provide: MailService, useValue: mail },
        { provide: AppConfigService, useValue: configService },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue(localGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(JwtRefreshGuard)
      .useValue(passGuard)
      .overrideGuard(GoogleAuthGuard)
      .useValue(passGuard)
      .compile();

    authServiceRef = moduleFixture.get(AuthServiceV1);

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(cookie, { secret: 'test-cookie-secret' });
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('successful registration -> otp -> verification flow (200)', async () => {
    const init = await app.inject({
      method: 'POST',
      url: '/v1/auth/register/init',
      payload: { deviceId: 'device-1' },
    });
    expect(init.statusCode).toBe(201);

    const register = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'new@example.com',
        password: 'SecurePass123!',
        displayName: 'New User',
        deviceId: 'device-1',
        initToken: init.json().token,
      },
    });

    expect(register.statusCode).toBe(200);
    expect(register.json()).toMatchObject({
      requiresOtpVerification: true,
      otpExpiresInSeconds: 600,
    });
    expect(prisma.users).toHaveLength(1);
    expect(prisma.users[0].isVerified).toBe(false);
    expect(mail.verificationEmails).toHaveLength(1);

    const verify = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-otp',
      payload: {
        email: 'new@example.com',
        otp: '123456',
      },
    });

    expect(verify.statusCode).toBe(200);
    expect(verify.json()).toEqual({ success: true });
    expect(prisma.users[0].isVerified).toBe(true);
    expect(mail.confirmationEmails).toHaveLength(1);
  });

  it('returns 400 for missing fields and invalid email format', async () => {
    const missing = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {},
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toMatchObject({
      success: false,
      statusCode: 400,
      path: '/v1/auth/register',
    });

    const invalidEmail = await app.inject({
      method: 'POST',
      url: '/v1/auth/resend-otp',
      payload: { email: 'not-an-email' },
    });
    expect(invalidEmail.statusCode).toBe(400);
  });

  it('rolls back user/device records when register fails after user creation', async () => {
    const init = await app.inject({
      method: 'POST',
      url: '/v1/auth/register/init',
      payload: { deviceId: 'device-rollback' },
    });
    expect(init.statusCode).toBe(201);

    mail.failNext = true;

    const register = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'rollback@example.com',
        password: 'SecurePass123!',
        displayName: 'Rollback User',
        deviceId: 'device-rollback',
        initToken: init.json().token,
      },
    });

    expect(register.statusCode).toBe(500);
    expect(prisma.users).toHaveLength(0);
    expect(prisma.devices).toHaveLength(0);
  });

  it('returns 422 for wrong otp and expired otp', async () => {
    const init = await app.inject({
      method: 'POST',
      url: '/v1/auth/register/init',
      payload: { deviceId: 'device-1' },
    });

    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'verify@example.com',
        password: 'SecurePass123!',
        deviceId: 'device-1',
        initToken: init.json().token,
      },
    });

    const wrongOtp = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-otp',
      payload: { email: 'verify@example.com', otp: '000000' },
    });
    expect(wrongOtp.statusCode).toBe(422);

    otp.expireOtpFor('user-1', OtpPurpose.VERIFY_EMAIL);
    const expiredOtp = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-otp',
      payload: { email: 'verify@example.com', otp: '123456' },
    });
    expect(expiredOtp.statusCode).toBe(422);
  });

  it('returns 422 for invalid credentials', async () => {
    const registerInit = await app.inject({
      method: 'POST',
      url: '/v1/auth/register/init',
      payload: { deviceId: 'device-2' },
    });

    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'login@example.com',
        password: 'SecurePass123!',
        deviceId: 'device-2',
        initToken: registerInit.json().token,
      },
    });

    prisma.users[0].isVerified = true;

    const loginInit = await app.inject({
      method: 'POST',
      url: '/v1/auth/login/init',
      payload: { deviceId: 'device-2' },
    });

    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'login@example.com',
        password: 'wrong-password',
        deviceId: 'device-2',
        initToken: loginInit.json().token,
      },
    });

    expect(login.statusCode).toBe(422);
    expect(login.json()).toMatchObject({
      success: false,
      statusCode: 422,
    });
  });

  it('returns 404 for otp verification and password reset on unknown email', async () => {
    const verify = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-otp',
      payload: { email: 'missing@example.com', otp: '123456' },
    });
    expect(verify.statusCode).toBe(404);

    const reset = await app.inject({
      method: 'POST',
      url: '/v1/auth/password-reset/request',
      payload: { email: 'missing@example.com' },
    });
    expect(reset.statusCode).toBe(404);
  });

  it('supports password reset and revokes existing devices', async () => {
    const init = await app.inject({
      method: 'POST',
      url: '/v1/auth/register/init',
      payload: { deviceId: 'device-3' },
    });

    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'reset@example.com',
        password: 'SecurePass123!',
        deviceId: 'device-3',
        initToken: init.json().token,
      },
    });

    prisma.users[0].isVerified = true;
    prisma.devices.push({
      id: 'device-x',
      userId: prisma.users[0].id,
      deviceId: 'old-device',
      refreshTokenHash: 'hash',
      lastSeenAt: new Date(),
      createdAt: new Date(),
    });

    const request = await app.inject({
      method: 'POST',
      url: '/v1/auth/password-reset/request',
      payload: { email: 'reset@example.com' },
    });
    expect(request.statusCode).toBe(200);

    const confirm = await app.inject({
      method: 'POST',
      url: '/v1/auth/password-reset/confirm',
      payload: {
        email: 'reset@example.com',
        otp: '123456',
        newPassword: 'NewSecurePass456!',
      },
    });

    expect(confirm.statusCode).toBe(200);
    expect(prisma.devices).toHaveLength(0);

    const passwordMatches = await bcrypt.compare(
      'NewSecurePass456!',
      prisma.users[0].passwordHash as string,
    );
    expect(passwordMatches).toBe(true);
  });

  it('returns 500 for email failure and database failure', async () => {
    const init = await app.inject({
      method: 'POST',
      url: '/v1/auth/register/init',
      payload: { deviceId: 'device-4' },
    });

    mail.failNext = true;
    const emailFailure = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'fail-email@example.com',
        password: 'SecurePass123!',
        deviceId: 'device-4',
        initToken: init.json().token,
      },
    });
    expect(emailFailure.statusCode).toBe(500);
    expect(emailFailure.json()).toMatchObject({
      success: false,
      statusCode: 500,
      path: '/v1/auth/register',
    });

    const init2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register/init',
      payload: { deviceId: 'device-5' },
    });

    prisma.failNext = true;
    const dbFailure = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'fail-db@example.com',
        password: 'SecurePass123!',
        deviceId: 'device-5',
        initToken: init2.json().token,
      },
    });

    expect(dbFailure.statusCode).toBe(500);
    expect(dbFailure.json()).toMatchObject({
      success: false,
      statusCode: 500,
      path: '/v1/auth/register',
    });
  });
});
