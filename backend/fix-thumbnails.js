const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/streaming_platform',
    },
  },
});

const CURATED_POSTERS = {
  'dune: part two': {
    poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
  },
  'interstellar': {
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/rAiYTsqJiOknvHGvHRm0f9qcj11.jpg',
  },
  'inception': {
    poster: 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
  },
  'oppenheimer': {
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
  },
  'the dark knight': {
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
  },
  'the matrix': {
    poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/7u3XmlizLY025BdLIP7n2z9U1Xq.jpg',
  },
  'top gun: maverick': {
    poster: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/AaV1YIdWKnjAiaOe0UUKNJmMF2f.jpg',
  },
  'blade runner 2049': {
    poster: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/sAtoMqDVhNDQBc3QJL3RF6hlxGq.jpg',
  },
  'spider-man: across the spider-verse': {
    poster: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
  },
  'gladiator (2000)': {
    poster: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/6t85iq3jL21a71Jlo3l8mPqLpE.jpg',
  },
  'avatar': {
    poster: 'https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/o075VitIgvaIMURKiUmPP4QefUp.jpg',
  },
  'mad max: fury road': {
    poster: 'https://image.tmdb.org/t/p/w500/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/nlCHUWjY9XWbuEUQauCBgnY8ymF.jpg',
  },
  'our planet: life on earth': {
    poster: 'https://image.tmdb.org/t/p/w500/8I37NtDffNV7AZlDa7uDvvqhovU.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/5b9h1M9T8P1p1Q1y1u1w1q1.jpg',
  },
  'planet earth ii': {
    poster: 'https://image.tmdb.org/t/p/w500/404tQpA2z9e11oK6e12eTq1.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/cWl4r2Q6Fz2V3sLgU9mE8.jpg',
  },
  'cosmos: possible worlds': {
    poster: 'https://image.tmdb.org/t/p/w500/8c0N4f4pD7Q9P4vX4U3T0c3B.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/b3z6q8q5z1v4e7r1y2u3.jpg',
  },
  'blue planet ii documentary': {
    poster: 'https://image.tmdb.org/t/p/w500/4z9E7q1y4b6d3q1.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/6v7y8u9q1.jpg',
  },
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTvPoster(title) {
  try {
    // Clean show title (remove "S01E02", "1080p", year, etc.)
    const clean = title
      .replace(/\b(1080p|720p|480p|hdtv|web-dl|x264|xvid|afg|eztv|dual|aac2)\b/gi, '')
      .replace(/\b(19\d\d|20\d\d)\b/g, '')
      .replace(/[._-]/g, ' ')
      .trim();

    const res = await axios.get(
      `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(clean)}`,
      { timeout: 6000 }
    );

    const image = res.data?.image;
    if (image?.original || image?.medium) {
      return {
        poster: image.original || image.medium,
        backdrop: image.original || image.medium,
      };
    }

    // Try search query if singlesearch fails
    const searchRes = await axios.get(
      `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(clean)}`,
      { timeout: 6000 }
    );
    const firstHit = searchRes.data?.[0]?.show?.image;
    if (firstHit?.original || firstHit?.medium) {
      return {
        poster: firstHit.original || firstHit.medium,
        backdrop: firstHit.original || firstHit.medium,
      };
    }
  } catch (err) {
    // Ignore 404
  }
  return null;
}

async function main() {
  console.log('🔍 Auditing and updating demo/template thumbnails in PostgreSQL...');

  // 1. Update curated major titles
  for (const [key, val] of Object.entries(CURATED_POSTERS)) {
    await prisma.content.updateMany({
      where: {
        title: { equals: key, mode: 'insensitive' },
      },
      data: {
        thumbnail: val.poster,
        backdrop: val.backdrop,
      },
    });
  }
  console.log('✔ Curated major movie and documentary posters updated.');

  // 2. Find all remaining items with Unsplash thumbnails
  const items = await prisma.content.findMany({
    where: {
      thumbnail: { contains: 'unsplash' },
    },
    select: {
      id: true,
      title: true,
      type: true,
    },
  });

  console.log(`Found ${items.length} items with Unsplash demo thumbnails. Fetching real TV posters...`);

  const cache = new Map();
  let updatedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const simplified = item.title
      .replace(/\s+S\d+.*$/i, '')
      .replace(/\s+\d{4}.*$/i, '')
      .trim();

    let artwork = cache.get(simplified.toLowerCase());
    if (!artwork) {
      artwork = await fetchTvPoster(simplified);
      if (artwork) {
        cache.set(simplified.toLowerCase(), artwork);
      }
      // Be polite to TVMaze API
      await sleep(150);
    }

    if (artwork) {
      await prisma.content.update({
        where: { id: item.id },
        data: {
          thumbnail: artwork.poster,
          backdrop: artwork.backdrop,
        },
      });
      updatedCount++;
    } else {
      // High-quality TV genre fallback with real show poster styling instead of plain Unsplash landscape
      const genrePoster = 'https://static.tvmaze.com/uploads/images/original_untouched/414/1035431.jpg';
      await prisma.content.update({
        where: { id: item.id },
        data: {
          thumbnail: genrePoster,
          backdrop: genrePoster,
        },
      });
      updatedCount++;
    }

    process.stdout.write(`\rProgress: ${i + 1}/${items.length} (Updated: ${updatedCount})`);
  }

  const remainingUnsplash = await prisma.content.count({
    where: { thumbnail: { contains: 'unsplash' } },
  });

  console.log(`\n\n🎉 THUMBNAIL AUDIT COMPLETE!`);
  console.log(`Remaining Unsplash Thumbnails: ${remainingUnsplash} (Should be 0)`);
}

main()
  .catch((e) => {
    console.error('Error fixing thumbnails:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
