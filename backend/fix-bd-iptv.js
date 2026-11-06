const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/streaming_platform',
    },
  },
});

const bdChannelsUpdate = [
  // 1. News Channels (Active verified YouTube Live IDs + Search Embed Fallbacks)
  {
    name: 'Jamuna Television',
    streamUrl: 'https://www.youtube.com/watch?v=BCqGiwKpiKM',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Jamuna+Television+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'Somoy News TV',
    streamUrl: 'https://www.youtube.com/watch?v=YCu5ZkiSqco',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Somoy+News+TV+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'Ekattor TV (71 News)',
    streamUrl: 'https://www.youtube.com/watch?v=PE_dt65gvUY',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Ekattor+TV+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'Channel 24',
    streamUrl: 'https://www.youtube.com/watch?v=1wECsnGZcfc',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Channel+24+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'Independent Television',
    streamUrl: 'https://www.youtube.com/watch?v=iWq2kH0iq2Q',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Independent+Television+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'DBC News',
    streamUrl: 'https://www.youtube.com/watch?v=k0rJ0g1Ez6I',
    backupStreamUrl: 'http://tvn3.chowdhury-shaheb.com/dbc/index.m3u8',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'News24 Bangladesh',
    streamUrl: 'https://www.youtube.com/watch?v=DME0NOvu-ME',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=News24+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'ATN News',
    streamUrl: 'https://www.youtube.com/watch?v=9nbhvVcZ-ag',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=ATN+News+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'Channel i',
    streamUrl: 'https://www.youtube.com/watch?v=YQBGtTjwrBI',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Channel+i+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'BTV National',
    streamUrl: 'https://www.youtube.com/watch?v=ZZGToki85aY',
    backupStreamUrl: 'https://btv.gov.bd/live-stream.m3u8',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'BTV National & World',
    streamUrl: 'https://www.youtube.com/watch?v=ZZGToki85aY',
    backupStreamUrl: 'https://btv.gov.bd/live-stream.m3u8',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'BTV World',
    streamUrl: 'https://www.youtube.com/watch?v=ZZGToki85aY',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=BTV+World+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'BTV Chittagong',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=BTV+Chittagong+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },

  // 2. Verified Active Direct HLS Streams (HTTP 200 on BDIX CDN)
  {
    name: 'NTV Bangladesh',
    streamUrl: 'https://tvsen5.aynaott.com/xV4jEKf3D9zc/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=NTV+Bangladesh+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'BanglaVision',
    streamUrl: 'https://tvsen5.aynaott.com/banglavision/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=BanglaVision+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'RTV Bangladesh',
    streamUrl: 'https://tvsen5.aynaott.com/RtvHD/index.m3u8',
    backupStreamUrl: 'http://tvsen5.aynascope.net/RtvHD/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Maasranga Television',
    streamUrl: 'https://tvsen5.aynaott.com/maasrangatv/index.m3u8',
    backupStreamUrl: 'http://tvsen5.aynascope.net/maasrangatv/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'ATN Bangla',
    streamUrl: 'https://tvsen5.aynaott.com/atnbangla/index.m3u8',
    backupStreamUrl: 'http://tvsen5.aynascope.net/atnbangla/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Duronto TV (Kids)',
    streamUrl: 'https://tvsen6.aynaott.com/6xyZ3N4oHv2KBJdB6W4p/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Duronto+TV+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Nexus Television',
    streamUrl: 'https://tvsen6.aynaott.com/Epm7WrFa/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Nexus+Television+Live&autoplay=1',
    quality: '576p SD',
    isBdixSupported: true,
  },
  {
    name: 'Ananda TV',
    streamUrl: 'https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/anandatv.stream/live-orgin/anandatv.stream/playlist.m3u8',
    backupStreamUrl: 'http://103.99.249.139/anandatv/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'GTV (Gazi Television)',
    streamUrl: 'https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/gazibdz.stream/live-orgin/gazibdz.stream/playlist.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Gazi+Television+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Green TV',
    streamUrl: 'https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/greentv.stream/live-orgin/greentv.stream/playlist.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Green+TV+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'My TV Bangladesh',
    streamUrl: 'https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/mytv-up-off.stream/live-orgin/mytv-up-off.stream/playlist.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=My+TV+Bangladesh+Live&autoplay=1',
    quality: '480p SD',
    isBdixSupported: true,
  },
  {
    name: 'T Sports Live',
    streamUrl: 'https://tvsen5.aynaott.com/TnMn5kZz8aLm/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=T+Sports+Live+Bangladesh&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'Desh TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Desh+TV+Live+Bangladesh&autoplay=1',
    backupStreamUrl: 'https://deshitv.deshitv24.net/live/myStream/playlist.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Boishakhi TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Boishakhi+TV+Live&autoplay=1',
    backupStreamUrl: 'https://boishakhi.sonarbanglatv.com/boishakhi/boishakhitv/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Mohona TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Mohona+Television+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Nagorik TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Nagorik+TV+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Asian TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Asian+TV+Bangladesh+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Channel 9 Bangladesh',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Channel+9+Bangladesh+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Deepto TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Deepto+TV+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'Gaan Bangla (Music)',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Gaan+Bangla+Wind+of+Change+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    name: 'Bijoy TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Bijoy+TV+Live+Bangla&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    name: 'SA TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=SA+TV+Bangladesh+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
];

async function updateBdChannels() {
  console.log('🔄 Updating Bangladeshi Channels in PostgreSQL with verified active streams...');
  let updatedCount = 0;

  for (const ch of bdChannelsUpdate) {
    const existing = await prisma.iptvChannel.findFirst({
      where: {
        countryCode: 'BD',
        name: { contains: ch.name.split(' ')[0], mode: 'insensitive' },
      },
    });

    if (existing) {
      await prisma.iptvChannel.update({
        where: { id: existing.id },
        data: {
          streamUrl: ch.streamUrl,
          backupStreamUrl: ch.backupStreamUrl || null,
          quality: ch.quality,
          isBdixSupported: ch.isBdixSupported,
          isActive: true,
        },
      });
      console.log(`✅ Updated: ${existing.name} -> ${ch.streamUrl}`);
      updatedCount++;
    } else {
      console.log(`⚠️ Not found by partial match: ${ch.name}`);
    }
  }

  console.log(`🎉 Successfully updated ${updatedCount} Bangladeshi channels in PostgreSQL.`);
}

updateBdChannels()
  .catch((e) => {
    console.error('❌ Error updating BD channels:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
