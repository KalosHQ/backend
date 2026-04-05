import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';

export enum OtpPurpose {
  VERIFY_EMAIL = 'verify-email',
  PASSWORD_RESET = 'password-reset',
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly redis: Redis;

  constructor(private readonly config: AppConfigService) {
    this.redis = new Redis(this.config.getRedisUrl(), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });

    this.redis.on('error', (error: Error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });
  }

  async generateAndStoreOtp(userId: string, purpose = OtpPurpose.VERIFY_EMAIL) {
    await this.ensureResendAllowed(userId, purpose);
    await this.enforceRequestRateLimit(userId, purpose);

    const otpLength = this.config.getOtpLength();
    const otp = this.generateOtp(otpLength);
    const hash = await bcrypt.hash(otp, this.config.getBcryptSaltRounds());

    const ttlSeconds = this.config.getOtpTtlSeconds();
    await this.set(this.otpKey(userId, purpose), hash, ttlSeconds);
    await this.set(
      this.cooldownKey(userId, purpose),
      '1',
      this.config.getOtpResendCooldownSeconds(),
    );
    await this.expire(
      this.attemptsKey(userId, purpose),
      this.config.getOtpTtlSeconds(),
    );

    return {
      otp,
      ttlSeconds,
    };
  }

  async verifyOtp(
    userId: string,
    otp: string,
    purpose = OtpPurpose.VERIFY_EMAIL,
  ) {
    const hash = await this.get(this.otpKey(userId, purpose));
    if (!hash) return false;

    const attempts = Number((await this.get(this.attemptsKey(userId, purpose))) ?? '0');
    if (attempts >= this.config.getOtpMaxVerifyAttempts()) {
      await this.purgeOtp(userId, purpose);
      throw new UnprocessableEntityException('OTP attempt limit exceeded');
    }

    const isMatch = await bcrypt.compare(otp, hash);
    if (!isMatch) {
      const nextAttempt = attempts + 1;
      await this.setWithKeepTtl(
        this.attemptsKey(userId, purpose),
        String(nextAttempt),
      );

      if (nextAttempt >= this.config.getOtpMaxVerifyAttempts()) {
        await this.purgeOtp(userId, purpose);
      }
      return false;
    }

    await this.purgeOtp(userId, purpose);
    return true;
  }

  async getRemainingCooldownSeconds(
    userId: string,
    purpose = OtpPurpose.VERIFY_EMAIL,
  ) {
    return this.ttl(this.cooldownKey(userId, purpose));
  }

  private generateOtp(length: number) {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return String(randomInt(min, max + 1));
  }

  private async ensureResendAllowed(userId: string, purpose: OtpPurpose) {
    const seconds = await this.getRemainingCooldownSeconds(userId, purpose);
    if (seconds > 0) {
      throw new BadRequestException(
        `Please wait ${seconds}s before requesting another OTP`,
      );
    }
  }

  private async enforceRequestRateLimit(userId: string, purpose: OtpPurpose) {
    const key = this.requestWindowKey(userId, purpose);
    const count = await this.incr(key);
    const ttlSeconds = this.config.getOtpRequestWindowSeconds();
    if (count === 1) {
      await this.expire(key, ttlSeconds);
    }

    if (count > this.config.getOtpMaxRequestsPerWindow()) {
      throw new BadRequestException('Too many OTP requests. Try again later.');
    }
  }

  private otpKey(userId: string, purpose: OtpPurpose) {
    return `auth:otp:${purpose}:${userId}`;
  }

  private cooldownKey(userId: string, purpose: OtpPurpose) {
    return `auth:otp:cooldown:${purpose}:${userId}`;
  }

  private attemptsKey(userId: string, purpose: OtpPurpose) {
    return `auth:otp:attempts:${purpose}:${userId}`;
  }

  private requestWindowKey(userId: string, purpose: OtpPurpose) {
    return `auth:otp:window:${purpose}:${userId}`;
  }

  private async purgeOtp(userId: string, purpose: OtpPurpose) {
    await this.del(this.otpKey(userId, purpose));
    await this.del(this.cooldownKey(userId, purpose));
    await this.del(this.attemptsKey(userId, purpose));
  }

  private async connectIfNeeded() {
    if (this.redis.status === 'ready') {
      return;
    }

    if (this.redis.status !== 'connecting' && this.redis.status !== 'connect') {
      await this.redis.connect();
    }
  }

  private async set(key: string, value: string, ttlSeconds: number) {
    try {
      await this.connectIfNeeded();
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } catch {
      throw new InternalServerErrorException('OTP storage is unavailable');
    }
  }

  private async setWithKeepTtl(key: string, value: string) {
    try {
      await this.connectIfNeeded();
      await this.redis.set(key, value, 'KEEPTTL');
    } catch {
      throw new InternalServerErrorException('OTP storage is unavailable');
    }
  }

  private async incr(key: string) {
    try {
      await this.connectIfNeeded();
      return this.redis.incr(key);
    } catch {
      throw new InternalServerErrorException('OTP storage is unavailable');
    }
  }

  private async expire(key: string, ttlSeconds: number) {
    try {
      await this.connectIfNeeded();
      await this.redis.expire(key, ttlSeconds);
    } catch {
      throw new InternalServerErrorException('OTP storage is unavailable');
    }
  }

  private async get(key: string) {
    try {
      await this.connectIfNeeded();
      return this.redis.get(key);
    } catch {
      throw new InternalServerErrorException('OTP storage is unavailable');
    }
  }

  private async ttl(key: string) {
    try {
      await this.connectIfNeeded();
      const value = await this.redis.ttl(key);
      return value > 0 ? value : 0;
    } catch {
      throw new InternalServerErrorException('OTP storage is unavailable');
    }
  }

  private async del(key: string) {
    try {
      await this.connectIfNeeded();
      await this.redis.del(key);
    } catch {
      throw new InternalServerErrorException('OTP storage is unavailable');
    }
  }
}
