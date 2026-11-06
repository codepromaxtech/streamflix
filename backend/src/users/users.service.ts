import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profiles: true,
        subscriptions: { where: { status: 'ACTIVE' } },
        favorites: { include: { content: true } },
        watchHistory: { include: { content: true }, orderBy: { watchedAt: 'desc' }, take: 20 },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, emailVerificationToken, tokenVersion, ...sanitized } = user;
    return sanitized;
  }

  async updateProfile(id: string, data: { name?: string; avatar?: string }) {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });
    const { password, emailVerificationToken, tokenVersion, ...sanitized } = user;
    return sanitized;
  }

  async getFavorites(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { content: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWatchHistory(userId: string) {
    return this.prisma.watchHistory.findMany({
      where: { userId },
      include: { content: true },
      orderBy: { watchedAt: 'desc' },
      take: 50,
    });
  }
}
