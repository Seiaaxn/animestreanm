# AnimeStream - Platform Streaming Anime Premium

![AnimeStream](https://img.shields.io/badge/Version-1.0.0-brightgreen)
![Node](https://img.shields.io/badge/Node-14+-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

Platform streaming anime yang responsif dengan UI profesional seperti wibuku dan animeplay. Dibangun dengan Node.js, Express, dan frontend modern dengan desain mobile-first.

## ✨ Fitur Utama

- ✅ **Responsive Design** - Desain mobile-first yang sempurna di semua perangkat
- ✅ **Rate Limiting** - Proteksi terhadap spam dan overload dengan rate limiter built-in
- ✅ **Smart Caching** - Caching otomatis untuk performa optimal (10 menit TTL)
- ✅ **API Integration** - Integrasi dengan sankavollerei.com untuk konten anime
- ✅ **Search Functionality** - Pencarian anime dengan hasil real-time
- ✅ **Schedule Tracking** - Jadwal rilis anime per hari
- ✅ **Genre Filtering** - Filter anime berdasarkan genre favorit
- ✅ **Professional UI** - Design yang elegan dan user-friendly
- ✅ **Zero Dependencies Issues** - Dependency management yang clean

## 🎨 Design Highlights

### Modern Aesthetics
- Gradient primary colors (Hot Pink #FF006E - Orange #FB5607)
- Dark theme dengan accent cyan (#00D9FF)
- Typography menggunakan Poppins & Playfair Display
- Smooth animations dan transitions

### Mobile Optimization
- Navbar responsive dengan hamburger menu
- Grid layout yang adaptive
- Touch-friendly components
- Optimized untuk layar mulai dari 320px

### Performance
- Rate limiting untuk API calls
- Client-side caching 10 menit
- Lazy loading untuk images
- Request queue management

## 📋 Struktur Project

```
animestream/
├── server.js              # Backend Express server
├── package.json          # Dependencies
├── .env                  # Environment variables
├── README.md             # Dokumentasi ini
└── public/
    ├── index.html        # HTML structure
    ├── styles.css        # CSS styling
    ├── app.js            # JavaScript logic
    └── favicon.ico       # (opsional)
```

## 🚀 Instalasi & Setup

### Prerequisites
- Node.js v14 atau lebih tinggi
- npm atau yarn
- Internet connection

### Langkah Instalasi

1. **Clone atau download project**
   ```bash
   # Jika dari git
   git clone <repository-url>
   cd animestream
   
   # Atau extract jika download ZIP
   unzip animestream.zip
   cd animestream
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   # File .env sudah tersedia, cek konfigurasi:
   cat .env
   
   # Default values sudah cocok untuk development
   ```

4. **Start server**
   ```bash
   # Production
   npm start
   
   # Development dengan auto-reload
   npm run dev
   ```

5. **Buka di browser**
   ```
   http://localhost:3000
   ```

## 📡 API Endpoints

### Home Page
```
GET /api/home
```
Response: Featured anime & trending

### Schedule
```
GET /api/schedule
```
Response: Jadwal anime per hari (senin-minggu)

### Genres
```
GET /api/genres
```
Response: List semua genre

### Genre Anime
```
GET /api/genre/:slug?page=1
```
Response: Anime berdasarkan genre dengan pagination

### Complete Anime
```
GET /api/complete?page=1
```
Response: Anime yang sudah selesai dengan pagination

### Ongoing Anime
```
GET /api/ongoing?page=1
```
Response: Anime yang masih berlanjut dengan pagination

### Search
```
GET /api/search/:query
```
Response: Hasil pencarian anime (max 2-50 karakter)

### Anime Detail
```
GET /api/anime/:slug
```
Response: Detail lengkap anime dan episodes

### Batch Anime
```
GET /api/batch/:slug
```
Response: Informasi batch download

### Stream Server
```
GET /api/stream/:id
```
Response: Server streaming dan embed player

### Health Check
```
GET /api/health
```
Response: Status server

### Cache Stats
```
GET /api/cache-stats
```
Response: Informasi cache yang tersimpan

## 🔒 Rate Limiting

### Configuration
```javascript
// API General - 15 menit window
Max 30 requests per 15 minutes

// Search Specific - 1 menit window
Max 10 requests per minute
```

### Implementation
- Automatic queue management
- Request delay (500ms default)
- Client-side & server-side limiting
- Error handling untuk rate limit exceeded

## 💾 Caching System

### Cache Manager
```javascript
// Durasi cache: 10 menit
// Auto-invalidation setelah 10 menit
// Per-endpoint caching
```

### Cached Endpoints
- Home data
- Schedule
- Genres
- Anime details
- Search results
- Genre anime listings

## 🎯 Fitur Frontend

### Navigation
- Sticky navbar dengan logo gradient
- Desktop menu + mobile hamburger
- Active state indicator
- Quick search bar

### Content Display
- Featured slider section
- Trending anime grid
- Schedule dengan day grouping
- Genre selection grid
- Search results page
- Detail page dengan episodes

### Interactivity
- Click-to-play episodes
- Genre filtering
- Pagination navigation
- Mobile menu toggle
- Toast notifications
- Loading states

## 📱 Responsive Breakpoints

```css
Desktop:    > 1024px (full features)
Tablet:     768px - 1024px (adjusted layout)
Mobile:     480px - 768px (optimized layout)
Small:      < 480px (minimal layout)
```

## 🔧 Customization

### Mengubah Colors
Edit `:root` di `styles.css`:
```css
:root {
    --primary-color: #FF006E;      /* Pink */
    --secondary-color: #FB5607;    /* Orange */
    --accent-color: #00D9FF;       /* Cyan */
    --dark-bg: #0A0E27;            /* Dark blue */
    /* ... */
}
```

### Mengubah Rate Limits
Edit `server.js`:
```javascript
// API limiter - ubah windowMs & max
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 menit
  max: 30,                   // maksimal 30 requests
});

// Search limiter - lebih ketat
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 menit
  max: 10,                   // maksimal 10 requests
});
```

### Mengubah Cache Duration
Edit `app.js`:
```javascript
const CONFIG = {
    CACHE_DURATION: 10 * 60 * 1000,  // 10 menit (ubah di sini)
    REQUEST_TIMEOUT: 8000,           // 8 detik
    RATE_LIMIT_DELAY: 500,           // 500ms antar request
};
```

## 📊 Performance Tips

1. **Browser Cache**
   - Client-side cache 10 menit
   - Server-side cache 10 menit
   - Total response time: <2 detik rata-rata

2. **Optimization**
   - Image lazy loading
   - CSS animations GPU-accelerated
   - Minimal JavaScript bundle
   - Efficient DOM updates

3. **Network**
   - Rate limiting mencegah overload
   - Request queuing otomatis
   - Timeout handling 8 detik
   - Error retry mechanism

## 🐛 Troubleshooting

### Server tidak start
```bash
# Check port 3000 tidak digunakan
lsof -i :3000

# Ubah port di .env
PORT=3001
```

### API error / timeout
```
- Check internet connection
- Verify API source (sankavollerei.com) accessible
- Increase timeout di .env: API_TIMEOUT=15000
- Check rate limiting tidak terlewati
```

### CSS/JS tidak load
```
- Clear browser cache (Ctrl+Shift+Del)
- Restart server
- Check public folder permissions
```

### Search tidak bekerja
```
- Query harus minimal 2 karakter
- Search rate limit: max 10 per menit
- Check search limiter di server.js
```

## 📚 API Response Examples

### GET /api/home
```json
{
  "featured": [
    {
      "title": "Anime Title",
      "image": "https://...",
      "link": "/anime/anime-title",
      "rating": "8.5"
    }
  ],
  "trending": [...]
}
```

### GET /api/search/boruto
```json
{
  "query": "boruto",
  "results": [
    {
      "title": "Boruto: Naruto Next Generations",
      "image": "https://...",
      "link": "/anime/boruto-naruto-next-generations",
      "type": "TV",
      "slug": "boruto-naruto-next-generations"
    }
  ],
  "count": 5
}
```

### GET /api/anime/enen-shouboutai-season-3
```json
{
  "title": "Enen Shouboutai Season 3",
  "image": "https://...",
  "rating": "8.7",
  "type": "TV",
  "status": "Ongoing",
  "synopsis": "...",
  "year": "2024",
  "studios": ["Studio David", "Square Enix"],
  "genres": ["Action", "Supernatural", "Drama"],
  "episodes": [
    {
      "title": "Episode 1",
      "link": "/anime/episode/..."
    }
  ]
}
```

## 🔐 Security Considerations

1. **Rate Limiting**
   - Prevents DDoS attacks
   - Protects API from spam
   - Fair usage policy

2. **Input Validation**
   - Query sanitization
   - Slug validation
   - Page number validation

3. **CORS**
   - Enabled untuk localhost
   - Configurable untuk production

## 📦 Dependencies

```json
{
  "express": "4.18.2",          // Web framework
  "axios": "1.6.2",             // HTTP client
  "cors": "2.8.5",              // CORS middleware
  "express-rate-limit": "7.1.5",// Rate limiter
  "node-cache": "5.1.2",        // In-memory cache
  "cheerio": "1.0.0-rc.12",     // HTML parser
  "dotenv": "16.3.1"            // Environment loader
}
```

## 🎓 Learning Resources

- [Express.js Docs](https://expressjs.com/)
- [Cheerio Parser](https://cheerio.js.org/)
- [Rate Limiting Best Practices](https://owasp.org/www-community/attacks/Denial_of_Service)
- [CSS Grid & Flexbox](https://developer.mozilla.org/en-US/docs/Learn/CSS)
- [Web Performance](https://web.dev/performance/)

## 📝 License

MIT License - Feel free to use for personal & commercial projects

## 👥 Support

Jika ada masalah atau saran:
1. Check dokumentasi di atas
2. Check console browser untuk error message
3. Check server logs untuk API errors
4. Restart server dan clear cache

## 🎉 Fitur Ekstra (Bisa Ditambahkan)

- [ ] User authentication (login/register)
- [ ] Watchlist/bookmark
- [ ] User ratings & reviews
- [ ] Recommendation system
- [ ] Offline viewing
- [ ] Night mode toggle
- [ ] Multiple language support
- [ ] Video player integration
- [ ] Download management
- [ ] Social sharing

---

**Enjoy using AnimeStream!** 🎬✨

Last Updated: 2024
Version: 1.0.0
