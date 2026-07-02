import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { LoginDto } from './dto/login.dto';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';

type AuthTokens = { access_token: string; refresh_token: string };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(newUser: RegisterDto): Promise<AuthTokens> {
    const exists = await this.findUserByEmail(newUser.email);
    if (exists)
      throw new ConflictException('An account with this email already exists.');

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(newUser.password, salt);
    const user = await this.createUser(newUser, hash);

    return this.generateTokens(user.id, user.name, user.role);
  }

  async registerDriver(dto: RegisterDriverDto): Promise<AuthTokens> {
    const exists = await this.findUserByEmail(dto.email);
    if (exists)
      throw new ConflictException('An account with this email already exists.');

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(dto.password, salt);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hash,
          name: dto.name,
          role: Role.DRIVER,
        },
      });
      await tx.taxi.create({
        data: {
          userId: user.id,
          kennzeichen: dto.kennzeichen,
          model: dto.model,
        },
      });
      return this.generateTokens(user.id, user.name, user.role);
    });
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.findUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user.id, user.name, user.role);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);

    try {
      const record = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, name: true, role: true } } },
      });

      if (!record || record.expiresAt < new Date()) {
        if (record) {
          await this.prisma.refreshToken
            .delete({ where: { id: record.id } })
            .catch(() => {});
        }
        throw new UnauthorizedException('Refresh token is invalid or expired.');
      }

      // Token rotation: old token is invalidated, a new pair is issued
      await this.prisma.refreshToken.delete({ where: { id: record.id } });
      return this.generateTokens(
        record.user.id,
        record.user.name,
        record.user.role,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.throwDatabaseConnectionError(error);
    }
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    try {
      // deleteMany never throws if the record doesn't exist (already logged out)
      await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    } catch (error) {
      this.throwDatabaseConnectionError(error);
    }
  }

  private async generateTokens(
    userId: number,
    name: string,
    role: Role,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, username: name, role };
    const access_token = await this.jwt.signAsync(payload);
    const refresh_token = randomBytes(40).toString('hex');
    await this.saveRefreshToken(userId, refresh_token);
    return { access_token, refresh_token };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async saveRefreshToken(userId: number, token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    try {
      await this.prisma.refreshToken.create({
        data: { userId, tokenHash, expiresAt },
      });
    } catch (error) {
      this.throwDatabaseConnectionError(error);
    }
  }

  private async findUserByEmail(email: string) {
    try {
      return await this.prisma.user.findUnique({ where: { email } });
    } catch (error) {
      this.throwDatabaseConnectionError(error);
    }
  }

  private async createUser(newUser: RegisterDto, passwordHash: string) {
    try {
      return await this.prisma.user.create({
        data: {
          name: newUser.name,
          email: newUser.email,
          password: passwordHash,
        },
      });
    } catch (error) {
      this.throwDatabaseConnectionError(error);
    }
  }

  private throwDatabaseConnectionError(error: unknown): never {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      message.includes('database') ||
      message.includes('connect') ||
      message.includes('econnrefused')
    ) {
      throw new ServiceUnavailableException(
        'Database connection refused. Start PostgreSQL and check DATABASE_URL.',
      );
    }

    throw error;
  }
}
