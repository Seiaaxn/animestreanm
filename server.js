const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const cheerio = require('cheerio');

const app = express();
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // Cache 10 menit

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate Limiter - untuk API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30, // 30 requests per windowMs
  message: 'Terlalu banyak request dari IP ini, silahkan coba lagi nanti',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter - untuk search (lebih ketat)
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 10, // 10 requests per menit
  message: 'Terlalu banyak pencarian, silahkan coba lagi nanti',
  skipSuccessfulRequests: false,
});

// Terapkan limiter
app.use('/api/', apiLimiter);
app.use('/api/search', searchLimiter);

// API Base
const API_BASE = 'https://www.sankavollerei.com';
const TIMEOUT = 8000;

// Helper function untuk fetch dengan timeout
const fetchWithTimeout = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
};

// Helper function untuk parse HTML
const parseHTML = (html) => cheerio.load(html);

// ==================== HOME PAGE ====================
app.get('/api/home', async (req, res) => {
  try {
    const cacheKey = 'home_data';
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const html = await fetchWithTimeout(`${API_BASE}/anime/home`);
    const $ = parseHTML(html);
    
    const featuredAnime = [];
    const trendingAnime = [];
    
    // Parse featured anime
    $('.featured-section, .hero-section').each((idx, el) => {
      if (idx < 5) {
        const title = $(el).find('h2, .title').text().trim();
        const image = $(el).find('img').attr('src');
        const link = $(el).find('a').attr('href');
        const rating = $(el).find('.rating, .score').text().trim();
        
        if (title && image) {
          featuredAnime.push({ title, image, link, rating });
        }
      }
    });

    // Parse trending
    $('.trending, .popular-section, .grid > .card').each((idx, el) => {
      if (idx < 12) {
        const title = $(el).find('h3, .anime-title, .title').text().trim();
        const image = $(el).find('img').attr('src');
        const link = $(el).find('a').attr('href');
        const type = $(el).find('.type, .badge').text().trim();
        const status = $(el).find('.status').text().trim();
        
        if (title && image) {
          trendingAnime.push({ 
            title, 
            image, 
            link, 
            type,
            status,
            slug: link?.split('/').pop()
          });
        }
      }
    });

    const result = {
      featured: featuredAnime.slice(0, 5),
      trending: trendingAnime.slice(0, 12),
      timestamp: new Date()
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/home:', error);
    res.status(500).json({ error: 'Gagal mengambil data home' });
  }
});

// ==================== SCHEDULE ====================
app.get('/api/schedule', async (req, res) => {
  try {
    const cacheKey = 'schedule_data';
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const html = await fetchWithTimeout(`${API_BASE}/anime/schedule`);
    const $ = parseHTML(html);
    
    const schedule = {
      senin: [],
      selasa: [],
      rabu: [],
      kamis: [],
      jumat: [],
      sabtu: [],
      minggu: []
    };

    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    
    days.forEach((day, idx) => {
      $(`.schedule-${day}, [data-day="${day}"], .${day}-anime`).each((i, el) => {
        if (i < 10) {
          const title = $(el).find('h4, .title').text().trim();
          const time = $(el).find('.time').text().trim();
          const image = $(el).find('img').attr('src');
          const link = $(el).find('a').attr('href');
          
          if (title) {
            schedule[day].push({ title, time, image, link });
          }
        }
      });
    });

    const result = { schedule, timestamp: new Date() };
    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/schedule:', error);
    res.status(500).json({ error: 'Gagal mengambil jadwal' });
  }
});

// ==================== GENRE LIST ====================
app.get('/api/genres', async (req, res) => {
  try {
    const cacheKey = 'genres_list';
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const html = await fetchWithTimeout(`${API_BASE}/anime/genre`);
    const $ = parseHTML(html);
    
    const genres = [];
    $('.genre-list a, .genre-item, .genre-tag').each((idx, el) => {
      const name = $(el).text().trim();
      const link = $(el).attr('href');
      const slug = link?.split('/').pop();
      
      if (name && link && idx < 30) {
        genres.push({ name, slug, link, count: 0 });
      }
    });

    const result = { genres, timestamp: new Date() };
    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/genres:', error);
    res.status(500).json({ error: 'Gagal mengambil genre' });
  }
});

// ==================== ANIME BY GENRE ====================
app.get('/api/genre/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = req.query.page || 1;
    
    if (!slug.match(/^[a-z0-9-]+$/)) {
      return res.status(400).json({ error: 'Invalid genre slug' });
    }

    const url = `${API_BASE}/anime/genre/${slug}?page=${page}`;
    const html = await fetchWithTimeout(url);
    const $ = parseHTML(html);
    
    const anime = [];
    $('.grid > .card, .anime-grid .item, .anime-list .entry').each((idx, el) => {
      if (idx < 20) {
        const title = $(el).find('h3, .title').text().trim();
        const image = $(el).find('img').attr('src');
        const link = $(el).find('a').attr('href');
        const type = $(el).find('.type, .badge').text().trim();
        
        if (title && image) {
          anime.push({ title, image, link, type, slug: link?.split('/').pop() });
        }
      }
    });

    const hasNextPage = $('.next, .pagination .next').length > 0;
    
    res.json({
      genre: slug,
      page: parseInt(page),
      anime,
      hasNextPage,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in /api/genre/:slug:', error);
    res.status(500).json({ error: 'Gagal mengambil anime berdasarkan genre' });
  }
});

// ==================== COMPLETE ANIME ====================
app.get('/api/complete', async (req, res) => {
  try {
    const page = req.query.page || 1;
    
    const url = `${API_BASE}/anime/complete-anime?page=${page}`;
    const html = await fetchWithTimeout(url);
    const $ = parseHTML(html);
    
    const anime = [];
    $('.grid > .card, .anime-grid .item').each((idx, el) => {
      if (idx < 20) {
        const title = $(el).find('h3, .title').text().trim();
        const image = $(el).find('img').attr('src');
        const link = $(el).find('a').attr('href');
        const rating = $(el).find('.rating, .score').text().trim();
        
        if (title && image) {
          anime.push({ title, image, link, rating, slug: link?.split('/').pop() });
        }
      }
    });

    res.json({
      type: 'complete',
      page: parseInt(page),
      anime,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in /api/complete:', error);
    res.status(500).json({ error: 'Gagal mengambil anime lengkap' });
  }
});

// ==================== ONGOING ANIME ====================
app.get('/api/ongoing', async (req, res) => {
  try {
    const page = req.query.page || 1;
    
    const url = `${API_BASE}/anime/ongoing-anime?page=${page}`;
    const html = await fetchWithTimeout(url);
    const $ = parseHTML(html);
    
    const anime = [];
    $('.grid > .card, .anime-grid .item').each((idx, el) => {
      if (idx < 20) {
        const title = $(el).find('h3, .title').text().trim();
        const image = $(el).find('img').attr('src');
        const link = $(el).find('a').attr('href');
        const episode = $(el).find('.episode, .ep-count').text().trim();
        
        if (title && image) {
          anime.push({ title, image, link, episode, slug: link?.split('/').pop() });
        }
      }
    });

    res.json({
      type: 'ongoing',
      page: parseInt(page),
      anime,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in /api/ongoing:', error);
    res.status(500).json({ error: 'Gagal mengambil anime berlanjut' });
  }
});

// ==================== SEARCH ====================
app.get('/api/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    if (query.length < 2) {
      return res.status(400).json({ error: 'Query minimal 2 karakter' });
    }

    const sanitizedQuery = encodeURIComponent(query.substring(0, 50));
    const url = `${API_BASE}/anime/search/${sanitizedQuery}`;
    
    const html = await fetchWithTimeout(url);
    const $ = parseHTML(html);
    
    const results = [];
    $('.grid > .card, .anime-grid .item, .search-result').each((idx, el) => {
      if (idx < 15) {
        const title = $(el).find('h3, .title').text().trim();
        const image = $(el).find('img').attr('src');
        const link = $(el).find('a').attr('href');
        const type = $(el).find('.type').text().trim();
        
        if (title && image) {
          results.push({ title, image, link, type, slug: link?.split('/').pop() });
        }
      }
    });

    res.json({
      query,
      results,
      count: results.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in /api/search:', error);
    res.status(500).json({ error: 'Gagal mencari anime' });
  }
});

// ==================== ANIME DETAIL ====================
app.get('/api/anime/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug.match(/^[a-z0-9-]+$/)) {
      return res.status(400).json({ error: 'Invalid anime slug' });
    }

    // Coba berbagai URL pattern
    const urls = [
      `${API_BASE}/anime/anime/${slug}`,
      `${API_BASE}/anime/batch/${slug}`,
    ];

    let html;
    for (const url of urls) {
      try {
        html = await fetchWithTimeout(url);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!html) {
      return res.status(404).json({ error: 'Anime tidak ditemukan' });
    }

    const $ = parseHTML(html);
    
    const detail = {
      title: $('h1, .anime-title').text().trim(),
      image: $('img.poster, .anime-image img').attr('src'),
      rating: $('.rating, .score').text().trim(),
      type: $('.type, .badge').eq(0).text().trim(),
      status: $('.status').text().trim(),
      synopsis: $('.synopsis, .description, .plot').text().trim(),
      year: $('.year').text().trim(),
      season: $('.season').text().trim(),
      studios: [],
      genres: [],
      episodes: [],
      link: `${API_BASE}/anime/${slug}`
    };

    // Parse studios
    $('.studio, [data-studio]').each((idx, el) => {
      const studio = $(el).text().trim();
      if (studio && idx < 3) {
        detail.studios.push(studio);
      }
    });

    // Parse genres
    $('.genre, .genre-tag, .tag-genre').each((idx, el) => {
      const genre = $(el).text().trim();
      if (genre && idx < 10) {
        detail.genres.push(genre);
      }
    });

    // Parse episodes
    $('.episode-list a, .ep-item, .episode-item').each((idx, el) => {
      const epTitle = $(el).text().trim();
      const epLink = $(el).attr('href');
      if (epTitle && idx < 50) {
        detail.episodes.push({ title: epTitle, link: epLink });
      }
    });

    res.json(detail);
  } catch (error) {
    console.error('Error in /api/anime/:slug:', error);
    res.status(500).json({ error: 'Gagal mengambil detail anime' });
  }
});

// ==================== BATCH ANIME ====================
app.get('/api/batch/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const url = `${API_BASE}/anime/batch/${slug}`;
    const html = await fetchWithTimeout(url);
    const $ = parseHTML(html);
    
    const batch = {
      title: $('h1, .anime-title').text().trim(),
      image: $('img.poster').attr('src'),
      description: $('.description, .synopsis').text().trim(),
      totalEpisodes: 0,
      episodes: [],
      downloadLinks: []
    };

    // Parse episodes
    $('.episode-list .item, .episodes a').each((idx, el) => {
      const ep = $(el).text().trim();
      if (ep && idx < 100) {
        batch.episodes.push(ep);
      }
    });

    batch.totalEpisodes = batch.episodes.length;

    res.json(batch);
  } catch (error) {
    console.error('Error in /api/batch/:slug:', error);
    res.status(500).json({ error: 'Gagal mengambil batch anime' });
  }
});

// ==================== STREAMING SERVER ====================
app.get('/api/stream/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[A-Z0-9-]+$/)) {
      return res.status(400).json({ error: 'Invalid server ID' });
    }

    const url = `${API_BASE}/anime/server/${id}`;
    const html = await fetchWithTimeout(url);
    const $ = parseHTML(html);
    
    const stream = {
      id,
      title: $('h1').text().trim(),
      description: $('.description').text().trim(),
      players: [],
      quality: ['480p', '720p', '1080p']
    };

    // Parse player embeds
    $('iframe, .player, .embed').each((idx, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && idx < 5) {
        stream.players.push({ 
          type: 'embed',
          source: src,
          quality: ['auto']
        });
      }
    });

    res.json(stream);
  } catch (error) {
    console.error('Error in /api/stream/:id:', error);
    res.status(500).json({ error: 'Gagal mengambil stream' });
  }
});

// ==================== UNLIMITED CONTENT ====================
app.get('/api/unlimited', async (req, res) => {
  try {
    const page = req.query.page || 1;
    
    const url = `${API_BASE}/anime/unlimited?page=${page}`;
    const html = await fetchWithTimeout(url);
    const $ = parseHTML(html);
    
    const unlimited = [];
    $('.grid > .card, .item').each((idx, el) => {
      if (idx < 20) {
        const title = $(el).find('h3, .title').text().trim();
        const image = $(el).find('img').attr('src');
        const link = $(el).find('a').attr('href');
        
        if (title && image) {
          unlimited.push({ title, image, link, slug: link?.split('/').pop() });
        }
      }
    });

    res.json({
      type: 'unlimited',
      page: parseInt(page),
      anime: unlimited,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in /api/unlimited:', error);
    res.status(500).json({ error: 'Gagal mengambil unlimited' });
  }
});

// ==================== CACHE STATS ====================
app.get('/api/cache-stats', (req, res) => {
  const keys = cache.keys();
  res.json({
    cached_items: keys.length,
    keys: keys,
    stats: cache.getStats()
  });
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Server berjalan dengan baik',
    timestamp: new Date()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`API tersedia di http://localhost:${PORT}/api`);
  console.log('Rate limiting aktif untuk mencegah spam');
});
  
