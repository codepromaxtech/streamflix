const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/streaming_platform',
    },
  },
});

const bdChannelsExact = [
  {
    id: 'cmw5brrwx000eg9ykejfij2ol',
    name: 'ATN Bangla',
    streamUrl: 'https://tvsen5.aynaott.com/atnbangla/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=ATN+Bangla+Bangladesh+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crv6m000bgaf5xryd3tje',
    name: 'ATN News',
    streamUrl: 'https://www.youtube.com/watch?v=9nbhvVcZ-ag',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=ATN+News+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crve3000ugaf5q15bw39t',
    name: 'Ananda TV',
    streamUrl: 'https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/anandatv.stream/live-orgin/anandatv.stream/playlist.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Ananda+TV+Bangladesh+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvbo000mgaf5o0kl447c',
    name: 'Asian TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Asian+TV+Bangladesh+Live&autoplay=1',
    backupStreamUrl: 'https://tvsen5.aynaott.com/asiantv/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crv4v000agaf5q10xy6hu',
    name: 'BTV Chittagong',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=BTV+Chittagong+Live&autoplay=1',
    backupStreamUrl: 'https://btv.gov.bd/live-stream.m3u8',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crv3u0008gaf5jt3v3860',
    name: 'BTV National',
    streamUrl: 'https://www.youtube.com/watch?v=ZZGToki85aY',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=BTV+National+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5brrw80009g9ykxyk2ajsu',
    name: 'BTV National & World',
    streamUrl: 'https://www.youtube.com/watch?v=ZZGToki85aY',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=BTV+National+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crv4e0009gaf5fvai76m5',
    name: 'BTV World',
    streamUrl: 'https://www.youtube.com/watch?v=ZZGToki85aY',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=BTV+World+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crv9f000ggaf51fe7zddl',
    name: 'BanglaVision',
    streamUrl: 'https://tvsen5.aynaott.com/banglavision/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=BanglaVision+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvd6000rgaf5e7noh6ah',
    name: 'Bijoy TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Bijoy+TV+Live+Bangla&autoplay=1',
    backupStreamUrl: 'https://tvsen5.aynaott.com/bijoytv/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crval000jgaf54x1am8f0',
    name: 'Boishakhi TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Boishakhi+TV+Live&autoplay=1',
    backupStreamUrl: 'https://boishakhi.sonarbanglatv.com/boishakhi/boishakhitv/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crv7l000cgaf59hrqdvs1',
    name: 'Channel 24',
    streamUrl: 'https://www.youtube.com/watch?v=1wECsnGZcfc',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Channel+24+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvby000ngaf55kznhcds',
    name: 'Channel 9 Bangladesh',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Channel+9+Bangladesh+Live&autoplay=1',
    backupStreamUrl: 'https://tvsen5.aynaott.com/channel9/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5brrw30008g9ykl6via2bg',
    name: 'Channel i',
    streamUrl: 'https://www.youtube.com/watch?v=YQBGtTjwrBI',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Channel+i+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5brrwd000ag9ykm9v0wt0n',
    name: 'DBC News',
    streamUrl: 'https://www.youtube.com/watch?v=k0rJ0g1Ez6I',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=DBC+News+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvc9000ogaf58p0h612e',
    name: 'Deepto TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Deepto+TV+Live&autoplay=1',
    backupStreamUrl: 'https://tvsen5.aynaott.com/deeptotv/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crva9000igaf5kn6tx8r4',
    name: 'Desh TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Desh+TV+Live+Bangladesh&autoplay=1',
    backupStreamUrl: 'https://deshitv.deshitv24.net/live/myStream/playlist.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvcm000pgaf58avtd6hk',
    name: 'Duronto TV (Kids)',
    streamUrl: 'https://tvsen6.aynaott.com/6xyZ3N4oHv2KBJdB6W4p/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Duronto+TV+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5brrvy0007g9yktnjh2py6',
    name: 'Ekattor TV (71 News)',
    streamUrl: 'https://www.youtube.com/watch?v=PE_dt65gvUY',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Ekattor+TV+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crv8t000egaf54y2z92pi',
    name: 'GTV (Gazi Television)',
    streamUrl: 'https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/gazibdz.stream/live-orgin/gazibdz.stream/playlist.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Gazi+Television+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvcz000qgaf51oo1wovd',
    name: 'Gaan Bangla (Music)',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Gaan+Bangla+Wind+of+Change+Live&autoplay=1',
    backupStreamUrl: 'https://tvsen5.aynaott.com/gaanbangla/index.m3u8',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5brrwh000bg9yks10q7fww',
    name: 'Independent Television',
    streamUrl: 'https://www.youtube.com/watch?v=iWq2kH0iq2Q',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Independent+Television+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5brrvn0005g9ykm2jwic5g',
    name: 'Jamuna Television',
    streamUrl: 'https://www.youtube.com/watch?v=BCqGiwKpiKM',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Jamuna+Television+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crv93000fgaf56qj46iqv',
    name: 'Maasranga Television',
    streamUrl: 'https://tvsen5.aynaott.com/maasrangatv/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Maasranga+Television+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvb3000kgaf59dynk6fu',
    name: 'Mohona TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Mohona+Television+Live&autoplay=1',
    backupStreamUrl: 'https://tvsen5.aynaott.com/mohonatv/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvei000vgaf5rqspod04',
    name: 'My TV Bangladesh',
    streamUrl: 'https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/mytv-up-off.stream/live-orgin/mytv-up-off.stream/playlist.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=My+TV+Bangladesh+Live&autoplay=1',
    quality: '480p SD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5brrws000dg9yks4oe5nl6',
    name: 'NTV Bangladesh',
    streamUrl: 'https://tvsen5.aynaott.com/xV4jEKf3D9zc/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=NTV+Bangladesh+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvbc000lgaf5iv57lpvz',
    name: 'Nagorik TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Nagorik+TV+Live&autoplay=1',
    backupStreamUrl: 'https://tvsen5.aynaott.com/nagoriktv/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crv7y000dgaf5mf3q6ria',
    name: 'News24 Bangladesh',
    streamUrl: 'https://www.youtube.com/watch?v=DME0NOvu-ME',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=News24+Bangladesh+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvdr000tgaf522byezgs',
    name: 'Nexus Television',
    streamUrl: 'https://tvsen6.aynaott.com/Epm7WrFa/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Nexus+Television+Live&autoplay=1',
    quality: '576p SD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crv9z000hgaf55o5m1cg1',
    name: 'RTV Bangladesh',
    streamUrl: 'https://tvsen5.aynaott.com/RtvHD/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=RTV+Bangladesh+Live&autoplay=1',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5crvdi000sgaf5vgux6z8v',
    name: 'SA TV',
    streamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=SA+TV+Bangladesh+Live&autoplay=1',
    backupStreamUrl: 'https://tvsen5.aynaott.com/satv/index.m3u8',
    quality: '720p HD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5brrvt0006g9ykmnb46uu3',
    name: 'Somoy News TV',
    streamUrl: 'https://www.youtube.com/watch?v=YCu5ZkiSqco',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=Somoy+News+TV+Live&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
  {
    id: 'cmw5brrwm000cg9yk14zcne71',
    name: 'T Sports Live',
    streamUrl: 'https://tvsen5.aynaott.com/TnMn5kZz8aLm/index.m3u8',
    backupStreamUrl: 'https://www.youtube-nocookie.com/embed?listType=search&list=T+Sports+Live+Bangladesh&autoplay=1',
    quality: '1080p FHD',
    isBdixSupported: true,
  },
];

async function updateBdChannelsExact() {
  console.log('🔄 Updating all 34 Bangladeshi Channels with exact IDs in PostgreSQL...');
  let count = 0;

  for (const item of bdChannelsExact) {
    await prisma.iptvChannel.update({
      where: { id: item.id },
      data: {
        name: item.name,
        streamUrl: item.streamUrl,
        backupStreamUrl: item.backupStreamUrl,
        quality: item.quality,
        isBdixSupported: item.isBdixSupported,
        isActive: true,
      },
    });
    console.log(`✅ [${item.id}] ${item.name} -> ${item.streamUrl}`);
    count++;
  }

  console.log(`🎉 Successfully updated ${count} BD channels with exact IDs.`);
}

updateBdChannelsExact()
  .catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
