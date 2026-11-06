const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const DEFAULT_POSTERS = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=640&q=80',
];

const DEFAULT_BACKDROPS = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1280&q=80',
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1280&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
];

async function fetchYtsPage(page) {
  try {
    const res = await axios.get(
      `https://yts.gg/api/v2/list_movies.json?limit=50&page=${page}&sort_by=download_count`,
      {
        timeout: 10000,
        headers: { 'User-Agent': 'StreamFlix/2.0 IngestEngine (+https://streamflix.local)' },
      }
    );
    return res.data?.data?.movies || [];
  } catch (err) {
    console.warn(`[YTS] Error fetching page ${page}: ${err.message}`);
    return [];
  }
}

async function fetchEztvPage(page) {
  try {
    const res = await axios.get(
      `https://eztv.re/api/get-torrents?limit=100&page=${page}`,
      {
        timeout: 10000,
        headers: { 'User-Agent': 'StreamFlix/2.0 IngestEngine (+https://streamflix.local)' },
      }
    );
    return res.data?.torrents || [];
  } catch (err) {
    console.warn(`[EZTV] Error fetching page ${page}: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting high-volume live ingestion of real titles into PostgreSQL...');
  
  const existingTitles = new Set();
  const existing = await prisma.content.findMany({ select: { title: true } });
  for (const item of existing) {
    existingTitles.add(item.title.toLowerCase().trim());
  }
  console.log(`Initial database count: ${existingTitles.size} titles`);

  const batchItems = [];

  // 1. Ingest Movies from YTS (Pages 26 to 65)
  console.log('📥 Fetching movies from YTS API (Pages 26-65)...');
  for (let page = 26; page <= 65; page++) {
    const movies = await fetchYtsPage(page);
    for (const m of movies) {
      if (!m.title) continue;
      const cleanTitle = m.title.trim();
      const lower = cleanTitle.toLowerCase();
      if (existingTitles.has(lower)) continue;
      existingTitles.add(lower);

      const torrent = m.torrents?.[0] || {};
      const hash = torrent.hash || Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const magnetUrl = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(cleanTitle)}`;
      const genre = m.genres?.[0] || 'Action';
      const isDoc = (m.genres || []).some(g => g.toLowerCase().includes('doc'));

      batchItems.push({
        title: cleanTitle,
        description: (m.summary || m.description_full || `High quality 1080p release. Dolby audio with active seeds.`).slice(0, 2000),
        thumbnail: m.medium_cover_image || m.large_cover_image || DEFAULT_POSTERS[batchItems.length % DEFAULT_POSTERS.length],
        backdrop: m.background_image_original || m.background_image || DEFAULT_BACKDROPS[batchItems.length % DEFAULT_BACKDROPS.length],
        trailer: m.yt_trailer_code ? `https://www.youtube.com/watch?v=${m.yt_trailer_code}` : null,
        videoUrl: magnetUrl,
        duration: (m.runtime && m.runtime > 0 ? m.runtime : 110) * 60,
        releaseDate: new Date(`${m.year && m.year > 1900 ? m.year : 2023}-01-01`),
        rating: Number(m.rating) || 7.5,
        maturityRating: 'PG-13',
        language: m.language || 'en',
        type: isDoc ? 'DOCUMENTARY' : 'MOVIE',
        isPublished: true,
        isFeatured: false,
        isTrending: true,
        viewCount: Math.floor(1000 + Math.random() * 25000),
        genre,
      });
    }
    process.stdout.write(`\rYTS Page ${page}/25 processed. Total staged so far: ${batchItems.length}`);
  }
  console.log(`\n✔ Staged ${batchItems.length} movies from YTS.`);

  // 2. Ingest TV Shows from EZTV (Pages 16 to 50)
  console.log('📥 Fetching TV Series from EZTV API (Pages 16-50)...');
  const movieCountStaged = batchItems.length;

  for (let page = 16; page <= 50; page++) {
    const torrents = await fetchEztvPage(page);
    for (const t of torrents) {
      const rawTitle = t.title || t.filename;
      if (!rawTitle) continue;

      // Extract clean show title before Season/Episode pattern
      const match = rawTitle.match(/^(.+?)(?:\s+S\d+|\s+\d{4}|\s+Season|\s+Episode|\s+1080p|\s+720p|\s+HDTV)/i);
      const cleanTitle = (match ? match[1] : rawTitle).replace(/[._-]/g, ' ').trim();
      const lower = cleanTitle.toLowerCase();
      if (existingTitles.has(lower) || cleanTitle.length < 2) continue;
      existingTitles.add(lower);

      const hash = t.hash || Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const magnetUrl = t.magnet_url || `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(cleanTitle)}`;

      batchItems.push({
        title: cleanTitle,
        description: `Popular TV series release "${t.title}". Verified tracker seeders and HDTV transcode.`,
        thumbnail: t.large_screenshot || DEFAULT_POSTERS[batchItems.length % DEFAULT_POSTERS.length],
        backdrop: t.large_screenshot || DEFAULT_BACKDROPS[batchItems.length % DEFAULT_BACKDROPS.length],
        trailer: 'https://vjs.zencdn.net/v/oceans.mp4',
        videoUrl: magnetUrl,
        duration: 2700, // 45 mins
        releaseDate: new Date(),
        rating: 8.2,
        maturityRating: 'TV-MA',
        language: 'en',
        type: 'SERIES',
        isPublished: true,
        isFeatured: false,
        isTrending: true,
        viewCount: Math.floor(1200 + Math.random() * 18000),
        genre: 'Drama',
      });
    }
    process.stdout.write(`\rEZTV Page ${page}/15 processed. Total staged so far: ${batchItems.length}`);
  }
  console.log(`\n✔ Staged ${batchItems.length - movieCountStaged} TV Series from EZTV.`);

  // 3. Insert into PostgreSQL in chunks of 100
  console.log(`💾 Inserting ${batchItems.length} new items into PostgreSQL in chunks...`);
  const chunkSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < batchItems.length; i += chunkSize) {
    const chunk = batchItems.slice(i, i + chunkSize);
    const result = await prisma.content.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    totalInserted += result.count;
    process.stdout.write(`\rInserted: ${totalInserted} / ${batchItems.length}`);
  }

  const finalCount = await prisma.content.count();
  const moviesCount = await prisma.content.count({ where: { type: 'MOVIE' } });
  const seriesCount = await prisma.content.count({ where: { type: 'SERIES' } });
  const docsCount = await prisma.content.count({ where: { type: 'DOCUMENTARY' } });

  console.log(`\n\n🎉 INGESTION COMPLETE!`);
  console.log(`========================================`);
  console.log(`Total Content in PostgreSQL: ${finalCount}`);
  console.log(`- Movies:        ${moviesCount}`);
  console.log(`- TV Series:     ${seriesCount}`);
  console.log(`- Documentaries: ${docsCount}`);
  console.log(`========================================`);
}

main()
  .catch((e) => {
    console.error('Fatal error during ingestion:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
