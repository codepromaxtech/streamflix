import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class IptvService {
  private readonly logger = new Logger(IptvService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma as any;
  }

  // 1. Fetch All Channels with Dynamic Filtering from PostgreSQL
  async getChannels(filters: {
    country?: string;
    category?: string;
    peering?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Number(filters.limit) || 100, 200);
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (filters.country && filters.country !== 'ALL') {
      where.OR = [
        { countryCode: { equals: filters.country, mode: 'insensitive' } },
        { country: { equals: filters.country, mode: 'insensitive' } },
      ];
    }

    if (filters.category && filters.category !== 'ALL') {
      where.category = { equals: filters.category, mode: 'insensitive' };
    }

    if (filters.peering && filters.peering !== 'ALL') {
      const p = filters.peering.toUpperCase();
      if (p === 'BDIX') {
        where.isBdixSupported = true;
      } else {
        where.peeringType = { equals: p, mode: 'insensitive' };
      }
    }

    if (filters.search) {
      const q = filters.search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { country: { contains: q, mode: 'insensitive' } },
            { currentProgram: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [channels, total] = await Promise.all([
      this.db.iptvChannel.findMany({
        where,
        orderBy: [{ isBdixSupported: 'desc' }, { viewCount: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.db.iptvChannel.count({ where }),
    ]);

    return {
      channels,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 2. Fetch Channel by ID from DB
  async getChannelById(id: string) {
    const channel = await this.db.iptvChannel.findUnique({ where: { id } });
    if (!channel) {
      throw new NotFoundException(`IPTV Channel with ID "${id}" not found in database.`);
    }

    // Increment view count asynchronously
    this.db.iptvChannel.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(err => this.logger.warn(`Failed to update viewCount for ${id}:`, err));

    return channel;
  }

  // 3. Fetch Distinct Categories Dynamically from DB
  async getCategories(): Promise<string[]> {
    const rows = await this.db.iptvChannel.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map(r => r.category).filter(Boolean);
  }

  // 4. Fetch Distinct Countries Dynamically from DB
  async getCountries(): Promise<{ country: string; countryCode: string; count: number }[]> {
    const channels = await this.db.iptvChannel.findMany({
      where: { isActive: true },
      select: { country: true, countryCode: true },
    });

    const countryMap = new Map<string, { country: string; countryCode: string; count: number }>();

    for (const ch of channels) {
      const code = (ch.countryCode || 'GLOBAL').toUpperCase();
      const name = ch.country || 'Global';
      if (!countryMap.has(code)) {
        countryMap.set(code, { country: name, countryCode: code, count: 0 });
      }
      countryMap.get(code)!.count += 1;
    }

    return Array.from(countryMap.values()).sort((a, b) => b.count - a.count);
  }

  // 5. Fetch Peering Nodes Dynamically from DB
  async getPeeringNodes() {
    return this.db.peeringNode.findMany({
      where: { isActive: true },
      orderBy: { latencyMs: 'asc' },
    });
  }

  // 6. Channel Management (CRUD) in Database
  async createChannel(data: any) {
    return this.db.iptvChannel.create({
      data: {
        name: data.name,
        logo: data.logo || '/placeholder-poster.svg',
        category: data.category || 'General',
        country: data.country || 'Global',
        countryCode: (data.countryCode || 'GLOBAL').toUpperCase(),
        language: data.language || 'English',
        quality: data.quality || '1080p',
        resolution: data.resolution || '1920x1080',
        streamUrl: data.streamUrl,
        backupStreamUrl: data.backupStreamUrl || null,
        isBdixSupported: Boolean(data.isBdixSupported),
        peeringType: (data.peeringType || 'GLOBAL').toUpperCase(),
        currentProgram: data.currentProgram || 'Live Stream Broadcast',
        nextProgram: data.nextProgram || 'Upcoming Program',
        epgTime: data.epgTime || 'LIVE NOW',
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
    });
  }

  async updateChannel(id: string, data: any) {
    return this.db.iptvChannel.update({
      where: { id },
      data,
    });
  }

  async deleteChannel(id: string) {
    return this.db.iptvChannel.delete({ where: { id } });
  }

  // 7. Parse & Import M3U Playlist Directly into PostgreSQL
  parseM3u(content: string) {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const channels: any[] = [];
    let current: any = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#EXTINF:')) {
        const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        const nameMatch = line.match(/,(.+)$/);
        const groupMatch = line.match(/group-title="([^"]+)"/i);
        const countryMatch = line.match(/tvg-country="([^"]+)"/i);

        const name = nameMatch ? nameMatch[1].trim() : 'Live Channel';
        const group = groupMatch ? groupMatch[1].trim() : 'General';
        const logo = logoMatch ? logoMatch[1] : '/placeholder-poster.svg';
        const country = countryMatch ? countryMatch[1].toUpperCase() : 'Custom M3U';

        current = {
          name,
          logo,
          category: group,
          country,
          countryCode: country.length === 2 ? country : 'GLOBAL',
          language: 'Multi',
          quality: '1080p',
          resolution: '1920x1080',
          isBdixSupported: name.toLowerCase().includes('bd') || name.toLowerCase().includes('bangla'),
          peeringType: name.toLowerCase().includes('bd') ? 'BDIX' : 'GLOBAL',
          currentProgram: `${name} Live Stream`,
          nextProgram: 'Live Broadcast',
          epgTime: 'LIVE NOW',
        };
      } else if (line.startsWith('http://') || line.startsWith('https://')) {
        if (current.name) {
          channels.push({
            ...current,
            streamUrl: line,
          });
          current = {};
        }
      }
    }

    return channels;
  }

  async importM3u(input: { url?: string; content?: string }) {
    let rawContent = input.content;

    if (input.url) {
      const res = await axios.get(input.url, {
        timeout: 12000,
        headers: { 'User-Agent': 'StreamFlix-IPTV/2.0' },
      });
      rawContent = res.data;
    }

    if (!rawContent) {
      throw new Error('No M3U content provided to import.');
    }

    const parsed = this.parseM3u(rawContent);
    let imported = 0;

    for (const ch of parsed) {
      const existing = await this.db.iptvChannel.findFirst({
        where: { OR: [{ streamUrl: ch.streamUrl }, { name: ch.name }] },
      });
      if (!existing) {
        await this.db.iptvChannel.create({ data: ch });
        imported++;
      }
    }

    return {
      message: `Successfully processed ${parsed.length} items. Imported ${imported} new channels into database.`,
      importedCount: imported,
      totalParsed: parsed.length,
    };
  }
}
