import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Game Platform API ready';
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'game-platform-api',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      ...this.getHealth(),
      checks: {
        database: 'ok',
        redis: 'unknown',
        objectStorage: 'unknown',
      },
    };
  }
}
