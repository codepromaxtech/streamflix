import { PrismaClient, UserRole, SubscriptionType, SubscriptionStatus, ContentType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding StreamFlix database...');

  const passwordHash = await argon2.hash('password123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // 1. Premium User
  const premiumUser = await prisma.user.upsert({
    where: { email: 'premium@streamflix.com' },
    update: {
      password: passwordHash,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
      role: UserRole.USER,
    },
    create: {
      email: 'premium@streamflix.com',
      name: 'Premium User',
      password: passwordHash,
      role: UserRole.USER,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
      profiles: {
        create: {
          name: 'Premium Profile',
          language: 'en',
          maturityRating: 'TV-MA',
        },
      },
      subscriptions: {
        create: {
          planType: SubscriptionType.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: oneYearFromNow,
        },
      },
    },
  });
  console.log('✔ Premium user seeded:', premiumUser.email);

  // 2. Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@streamflix.com' },
    update: {
      password: passwordHash,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
      role: UserRole.USER,
    },
    create: {
      email: 'demo@streamflix.com',
      name: 'Demo User',
      password: passwordHash,
      role: UserRole.USER,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=256&q=80',
      profiles: {
        create: {
          name: 'Demo Profile',
          language: 'en',
          maturityRating: 'PG-13',
        },
      },
      subscriptions: {
        create: {
          planType: SubscriptionType.FREE,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: oneYearFromNow,
        },
      },
    },
  });
  console.log('✔ Demo user seeded:', demoUser.email);

  // 3. Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@streamflix.com' },
    update: {
      password: passwordHash,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@streamflix.com',
      name: 'Admin User',
      password: passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
      profiles: {
        create: {
          name: 'Admin Profile',
          language: 'en',
          maturityRating: 'TV-MA',
        },
      },
      subscriptions: {
        create: {
          planType: SubscriptionType.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: oneYearFromNow,
        },
      },
    },
  });
  console.log('✔ Admin user seeded:', adminUser.email);

  // 4. Sample Content
  const sampleContents = [
    {
      title: 'Stranger Things',
      description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=640&q=80',
      backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
      trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: 3600,
      releaseDate: new Date('2016-07-15'),
      rating: 8.7,
      maturityRating: 'TV-14',
      language: 'English',
      type: ContentType.SERIES,
      isExclusive: true,
      isPremium: false,
      viewCount: 154200,
      isPublished: true,
      isFeatured: true,
      isTrending: true,
      genre: 'Sci-Fi',
    },
    {
      title: 'Squid Game',
      description: 'Hundreds of cash-strapped players accept a strange invitation to compete in children\'s games for a tempting prize with deadly high stakes.',
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=640&q=80',
      backdrop: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1280&q=80',
      trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 3600,
      releaseDate: new Date('2021-09-17'),
      rating: 8.0,
      maturityRating: 'TV-MA',
      language: 'Korean',
      type: ContentType.SERIES,
      isExclusive: true,
      isPremium: true,
      viewCount: 245000,
      isPublished: true,
      isFeatured: true,
      isTrending: true,
      isApproved: true,
      genre: 'Sci-Fi',
    },
    {
      title: 'Dune: Part Two',
      description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
      thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=640&q=80',
      backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1280&q=80',
      trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: 9960,
      releaseDate: new Date('2024-03-01'),
      rating: 8.8,
      maturityRating: 'PG-13',
      language: 'English',
      type: ContentType.MOVIE,
      isExclusive: false,
      isPremium: true,
      viewCount: 189000,
      isPublished: true,
      isFeatured: true,
      isTrending: true,
      isApproved: true,
      genre: 'Adventure',
    },
    {
      title: 'The Crown',
      description: 'Follows the political rivalries and romance of Queen Elizabeth II\'s reign and the events that shaped the second half of the twentieth century.',
      thumbnail: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=640&q=80',
      backdrop: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=1280&q=80',
      trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: 3600,
      releaseDate: new Date('2023-11-04'),
      rating: 8.7,
      maturityRating: 'TV-MA',
      language: 'English',
      type: ContentType.SERIES,
      isExclusive: true,
      isPremium: true,
      viewCount: 98000,
      isPublished: true,
      isFeatured: true,
      isTrending: true,
      isApproved: true,
      genre: 'Drama',
    },
    {
      title: 'Wednesday',
      description: 'Smart, sarcastic and a little dead inside, Wednesday Addams investigates a murder spree while making new friends — and foes — at Nevermore Academy.',
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=640&q=80',
      backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80',
      trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 3000,
      releaseDate: new Date('2022-11-23'),
      rating: 8.1,
      maturityRating: 'TV-14',
      language: 'English',
      type: ContentType.SERIES,
      isExclusive: true,
      isPremium: false,
      viewCount: 310000,
      isPublished: true,
      isFeatured: true,
      isTrending: true,
      isApproved: true,
      genre: 'Fantasy',
    },
  ];

  for (const c of sampleContents) {
    const existing = await prisma.content.findFirst({ where: { title: c.title } });
    if (!existing) {
      await prisma.content.create({ data: c });
      console.log(`✔ Content created: ${c.title}`);
    }
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
