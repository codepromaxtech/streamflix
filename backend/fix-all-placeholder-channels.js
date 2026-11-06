const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/streaming_platform',
    },
  },
});

async function fixAllPlaceholderChannels() {
  console.log('🔍 Finding all channels with placeholder -live links...');
  const placeholderChannels = await prisma.iptvChannel.findMany({
    where: {
      streamUrl: {
        contains: '-live',
      },
    },
  });

  console.log(`Found ${placeholderChannels.length} placeholder channels.`);

  for (const ch of placeholderChannels) {
    const searchQuery = encodeURIComponent(`${ch.name} Live`);
    const dynamicSearchEmbed = `https://www.youtube-nocookie.com/embed?listType=search&list=${searchQuery}&autoplay=1`;

    await prisma.iptvChannel.update({
      where: { id: ch.id },
      data: {
        streamUrl: dynamicSearchEmbed,
        isActive: true,
      },
    });

    console.log(`✅ Converted [${ch.name}] -> ${dynamicSearchEmbed}`);
  }

  console.log('🎉 All placeholder channels resolved to resilient live search embeds.');
}

fixAllPlaceholderChannels()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
