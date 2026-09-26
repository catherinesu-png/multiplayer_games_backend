import { Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, UserRole } from './auth.types';
import { LoginDto } from './login.dto';

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async login(dto: LoginDto) {
    if (dto.developmentKey !== this.getDevelopmentKey()) {
      throw new UnauthorizedException('Invalid development credentials');
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid development credentials');
    }

    const currentUser = this.toCurrentUser(user);
    const accessToken = jwt.sign(
      { sub: currentUser.id },
      this.getAuthSecret(),
      { expiresIn: '1h' },
    );

    return { accessToken, user: currentUser };
  }

  async authenticate(accessToken: string): Promise<CurrentUser> {
    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(accessToken, this.getAuthSecret());
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User is not active');
    }

    return this.toCurrentUser(user);
  }

  private toCurrentUser(user: { id: string; email: string; displayName: string; role: string }): CurrentUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as UserRole,
    };
  }

  private getAuthSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('AUTH_SECRET is not configured');
    }
    return secret;
  }

  private getDevelopmentKey(): string {
    const key = process.env.DEV_AUTH_KEY;
    if (!key) {
      throw new InternalServerErrorException('DEV_AUTH_KEY is not configured');
    }
    return key;
  }
}
