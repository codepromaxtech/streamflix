import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentType } from '@prisma/client';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async findAll(options?: {
    type?: string;
    genreId?: string;
    isFeatured?: boolean;
    isTrending?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { isPublished: true };
    if (options?.type) {
      where.type = options.type as ContentType;
    }
    if (options?.genreId) {
      where.genres = { some: { genreId: options.genreId } };
    }
    if (options?.isFeatured !== undefined) {
      where.isFeatured = options.isFeatured;
    }
    if (options?.isTrending !== undefined) {
      where.isTrending = options.isTrending;
    }

    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: 'desc' },
        include: {
          genres: { include: { genre: true } },
          cast: { include: { person: true } },
          qualityLevels: true,
          episodes: true,
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        genres: { include: { genre: true } },
        cast: { include: { person: true } },
        crew: { include: { person: true } },
        subtitles: true,
        audioTracks: true,
        qualityLevels: true,
        episodes: true,
        reviews: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    // Increment view count
    await this.prisma.content.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return content;
  }

  async getFeatured() {
    return this.prisma.content.findMany({
      where: { isPublished: true, isFeatured: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { genres: { include: { genre: true } } },
    });
  }

  async getTrending() {
    return this.prisma.content.findMany({
      where: { isPublished: true, isTrending: true },
      take: 10,
      orderBy: { viewCount: 'desc' },
      include: { genres: { include: { genre: true } } },
    });
  }

  async getGenres() {
    return this.prisma.genre.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async recordWatchHistory(userId: string, contentId: string, progress: number) {
    return this.prisma.watchHistory.upsert({
      where: {
        userId_contentId: {
          userId,
          contentId,
        },
      },
      update: {
        progress,
        watchedAt: new Date(),
        completed: progress >= 90,
      },
      create: {
        userId,
        contentId,
        progress,
        completed: progress >= 90,
      },
    });
  }

  async toggleFavorite(userId: string, contentId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_contentId: {
          userId,
          contentId,
        },
      },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { favorited: false };
    } else {
      await this.prisma.favorite.create({
        data: { userId, contentId },
      });
      return { favorited: true };
    }
  }
}
