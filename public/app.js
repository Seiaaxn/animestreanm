// ==================== CONFIG & CONSTANTS ====================
const CONFIG = {
    API_BASE: '/api',
    CACHE_DURATION: 10 * 60 * 1000, // 10 menit
    REQUEST_TIMEOUT: 8000,
    RATE_LIMIT_DELAY: 500, // 500ms antar request
};

// ==================== STATE MANAGEMENT ====================
const state = {
    currentPage: 'home',
    currentGenre: null,
    currentAnime: null,
    cache: new Map(),
    requestQueue: [],
    isRequestPending: false,
    lastRequestTime: 0,
};

// ==================== RATE LIMITER ====================
class RateLimiter {
    constructor(delayMs = 500) {
        this.delayMs = delayMs;
        this.lastRequestTime = 0;
        this.queue = [];
        this.isProcessing = false;
    }

    async execute(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.delayMs) {
            await new Promise(resolve =>
                setTimeout(resolve, this.delayMs - timeSinceLastRequest)
            );
        }

        const { fn, resolve, reject } = this.queue.shift();
        this.lastRequestTime = Date.now();

        try {
            const result = await fn();
            resolve(result);
        } catch (error) {
            reject(error);
        }

        this.isProcessing = false;
        if (this.queue.length > 0) {
            this.process();
        }
    }
}

const rateLimiter = new RateLimiter(CONFIG.RATE_LIMIT_DELAY);

// ==================== CACHE SYSTEM ====================
class CacheManager {
    constructor(duration = CONFIG.CACHE_DURATION) {
        this.duration = duration;
        this.cache = new Map();
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.duration) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    clear() {
        this.cache.clear();
    }

    has(key) {
        return this.get(key) !== null;
    }
}

const cacheManager = new CacheManager();

// ==================== API CLIENT ====================
class APIClient {
    async fetch(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE}${endpoint}`;
        const timeout = options.timeout || CONFIG.REQUEST_TIMEOUT;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            showLoading(true);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            showLoading(false);
            return data;
        } catch (error) {
            showLoading(false);
            if (error.name === 'AbortError') {
                showToast('Request timeout. Silahkan coba lagi.', 'error');
            } else {
                showToast(`Error: ${error.message}`, 'error');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async getHome() {
        const cacheKey = 'home';
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const data = await rateLimiter.execute(() =>
            this.fetch('/home')
        );

        cacheManager.set(cacheKey, data);
        return data;
    }

    async getSchedule() {
        const cacheKey = 'schedule';
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const data = await rateLimiter.execute(() =>
            this.fetch('/schedule')
        );

        cacheManager.set(cacheKey, data);
        return data;
    }

    async getGenres() {
        const cacheKey = 'genres';
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const data = await rateLimiter.execute(() =>
            this.fetch('/genres')
        );

        cacheManager.set(cacheKey, data);
        return data;
    }

    async getGenreAnime(slug, page = 1) {
        const cacheKey = `genre-${slug}-${page}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const data = await rateLimiter.execute(() =>
            this.fetch(`/genre/${slug}?page=${page}`)
        );

        cacheManager.set(cacheKey, data);
        return data;
    }

    async getCompleteAnime(page = 1) {
        const cacheKey = `complete-${page}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const data = await rateLimiter.execute(() =>
            this.fetch(`/complete?page=${page}`)
        );

        cacheManager.set(cacheKey, data);
        return data;
    }

    async getOngoingAnime(page = 1) {
        const cacheKey = `ongoing-${page}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const data = await rateLimiter.execute(() =>
            this.fetch(`/ongoing?page=${page}`)
        );

        cacheManager.set(cacheKey, data);
        return data;
    }

    async searchAnime(query) {
        const cacheKey = `search-${query}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const data = await rateLimiter.execute(() =>
            this.fetch(`/search/${encodeURIComponent(query)}`)
        );

        cacheManager.set(cacheKey, data);
        return data;
    }

    async getAnimeDetail(slug) {
        const cacheKey = `detail-${slug}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const data = await rateLimiter.execute(() =>
            this.fetch(`/anime/${slug}`)
        );

        cacheManager.set(cacheKey, data);
        return data;
    }
}

const apiClient = new APIClient();

// ==================== UI HELPERS ====================
function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function showToast(message, type = 'error') {
    const toast = document.getElementById('errorToast');
    toast.textContent = message;
    toast.classList.add('active', type);

    setTimeout(() => {
        toast.classList.remove('active', type);
    }, 3000);
}

function switchPage(pageName) {
    // Hide semua page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Tampilkan halaman yang dipilih
    const page = document.getElementById(`${pageName}-page`);
    if (page) {
        page.classList.add('active');
    }

    // Update navbar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');

    // Close mobile menu
    closeMobileMenu();

    state.currentPage = pageName;
}

function closeMobileMenu() {
    const overlay = document.getElementById('mobileMenuOverlay');
    overlay.classList.remove('active');
}

// ==================== ANIME CARD RENDERING ====================
function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.innerHTML = `
        <div style="position: relative;">
            <img src="${anime.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22%3E%3Crect fill=%22%23222%22 width=%22100%22 height=%22150%22/%3E%3C/svg%3E'}" 
                 alt="${anime.title}" class="anime-card-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22%3E%3Crect fill=%22%23222%22 width=%22100%22 height=%22150%22/%3E%3C/svg%3E'">
            <div class="anime-card-overlay">
                <div class="play-button">▶</div>
            </div>
        </div>
        <div class="anime-card-info">
            <div class="anime-card-title">${anime.title}</div>
            <div class="anime-card-meta">
                <span>${anime.type || anime.status || 'Unknown'}</span>
                ${anime.rating ? `<span class="anime-rating">⭐ ${anime.rating}</span>` : ''}
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        const slug = anime.slug || anime.link?.split('/').pop();
        if (slug) {
            loadAnimeDetail(slug);
        }
    });

    return card;
}

// ==================== PAGE LOADERS ====================
async function loadHome() {
    switchPage('home');

    try {
        const data = await apiClient.getHome();

        // Load trending
        const trendingGrid = document.getElementById('trendingGrid');
        trendingGrid.innerHTML = '';
        (data.trending || []).forEach(anime => {
            trendingGrid.appendChild(createAnimeCard(anime));
        });

        // Load ongoing (update terbaru)
        const ongoingGrid = document.getElementById('ongoingGrid');
        ongoingGrid.innerHTML = '';
        (data.featured || []).forEach(anime => {
            ongoingGrid.appendChild(createAnimeCard(anime));
        });

        showToast('Berhasil memuat home', 'success');
    } catch (error) {
        console.error('Error loading home:', error);
    }
}

async function loadOngoing(page = 1) {
    switchPage('ongoing');

    try {
        const data = await apiClient.getOngoingAnime(page);

        const list = document.getElementById('ongoingList');
        list.innerHTML = '';
        (data.anime || []).forEach(anime => {
            list.appendChild(createAnimeCard(anime));
        });

        // Pagination
        updatePagination('ongoingPagination', page, data.anime?.length >= 20, 'ongoing');
    } catch (error) {
        console.error('Error loading ongoing:', error);
    }
}

async function loadComplete(page = 1) {
    switchPage('complete');

    try {
        const data = await apiClient.getCompleteAnime(page);

        const list = document.getElementById('completeList');
        list.innerHTML = '';
        (data.anime || []).forEach(anime => {
            list.appendChild(createAnimeCard(anime));
        });

        // Pagination
        updatePagination('completePagination', page, data.anime?.length >= 20, 'complete');
    } catch (error) {
        console.error('Error loading complete:', error);
    }
}

async function loadGenres() {
    switchPage('genres');

    try {
        const data = await apiClient.getGenres();

        const genresList = document.getElementById('genresList');
        genresList.innerHTML = '';

        (data.genres || []).forEach(genre => {
            const card = document.createElement('div');
            card.className = 'genre-card';
            card.innerHTML = `<div class="genre-name">${genre.name}</div>`;
            card.addEventListener('click', () => loadGenreAnime(genre.slug || genre.name.toLowerCase()));
            genresList.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

async function loadGenreAnime(slug, page = 1) {
    switchPage('complete');

    try {
        const data = await apiClient.getGenreAnime(slug, page);

        const list = document.getElementById('completeList');
        list.innerHTML = '';
        (data.anime || []).forEach(anime => {
            list.appendChild(createAnimeCard(anime));
        });

        state.currentGenre = slug;
        updatePagination('completePagination', page, data.hasNextPage, 'genre', slug);
    } catch (error) {
        console.error('Error loading genre anime:', error);
    }
}

async function loadSchedule() {
    switchPage('schedule');

    try {
        const data = await apiClient.getSchedule();
        const container = document.getElementById('scheduleContainer');
        container.innerHTML = '';

        const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
        const dayNames = {
            senin: 'Senin',
            selasa: 'Selasa',
            rabu: 'Rabu',
            kamis: 'Kamis',
            jumat: 'Jumat',
            sabtu: 'Sabtu',
            minggu: 'Minggu'
        };

        days.forEach(day => {
            const dayAnime = data.schedule[day] || [];
            if (dayAnime.length === 0) return;

            const daySection = document.createElement('div');
            daySection.className = 'schedule-day';

            const title = document.createElement('div');
            title.className = 'schedule-day-title';
            title.innerHTML = `📅 ${dayNames[day]}`;
            daySection.appendChild(title);

            const items = document.createElement('div');
            items.className = 'schedule-items';

            dayAnime.forEach(anime => {
                const item = document.createElement('div');
                item.className = 'schedule-item';
                item.innerHTML = `
                    ${anime.image ? `<img src="${anime.image}" alt="${anime.title}" class="schedule-item-image">` : '<div style="width:60px;height:85px;background:#333;border-radius:6px;"></div>'}
                    <div class="schedule-item-content">
                        <div class="schedule-item-title">${anime.title}</div>
                        ${anime.time ? `<div class="schedule-item-time">⏰ ${anime.time}</div>` : ''}
                    </div>
                `;
                item.addEventListener('click', () => {
                    const slug = anime.link?.split('/').pop();
                    if (slug) loadAnimeDetail(slug);
                });
                items.appendChild(item);
            });

            daySection.appendChild(items);
            container.appendChild(daySection);
        });
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

async function searchAnime(query) {
    if (query.length < 2) {
        showToast('Minimal 2 karakter untuk pencarian', 'error');
        return;
    }

    switchPage('search');
    document.getElementById('searchTerm').textContent = query;

    try {
        const data = await apiClient.searchAnime(query);

        const results = document.getElementById('searchResults');
        results.innerHTML = '';

        if (data.results.length === 0) {
            results.innerHTML = '<div style="text-align:center;padding:2rem;color:#B0B5C1;">Tidak ada hasil yang ditemukan</div>';
            return;
        }

        data.results.forEach(anime => {
            results.appendChild(createAnimeCard(anime));
        });

        showToast(`Ditemukan ${data.count} hasil`, 'success');
    } catch (error) {
        console.error('Error searching anime:', error);
    }
}

async function loadAnimeDetail(slug) {
    switchPage('detail');

    try {
        const data = await apiClient.getAnimeDetail(slug);

        const container = document.getElementById('detailContent');
        container.innerHTML = `
            <div class="detail-header">
                <div class="detail-poster">
                    <img src="${data.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23222%22 width=%22200%22 height=%22300%22/%3E%3C/svg%3E'}" 
                         alt="${data.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23222%22 width=%22200%22 height=%22300%22/%3E%3C/svg%3E'">
                </div>
                <div class="detail-info">
                    <h1>${data.title}</h1>
                    <div class="detail-meta">
                        ${data.type ? `<div class="meta-item"><div class="meta-label">Tipe</div><div class="meta-value">${data.type}</div></div>` : ''}
                        ${data.status ? `<div class="meta-item"><div class="meta-label">Status</div><div class="meta-value">${data.status}</div></div>` : ''}
                        ${data.rating ? `<div class="meta-item"><div class="meta-label">Rating</div><div class="meta-value">⭐ ${data.rating}</div></div>` : ''}
                        ${data.year ? `<div class="meta-item"><div class="meta-label">Tahun</div><div class="meta-value">${data.year}</div></div>` : ''}
                    </div>
                    ${data.synopsis ? `<div class="detail-synopsis">${data.synopsis}</div>` : ''}
                    ${data.genres?.length > 0 ? `
                        <div class="genres-list">
                            ${data.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>

            ${data.episodes && data.episodes.length > 0 ? `
                <div class="episodes-section">
                    <h2 style="margin-bottom:1rem;font-size:1.3rem;color:#FF006E;">Episodes</h2>
                    <div class="episodes-grid">
                        ${data.episodes.map((ep, idx) => `
                            <div class="episode-item" onclick="playEpisode('${ep.link || ''}', ${idx + 1})">
                                <div class="episode-number">${idx + 1}</div>
                                <div class="episode-info">
                                    <div class="episode-title">${ep.title || `Episode ${idx + 1}`}</div>
                                </div>
                                <div class="play-icon">▶</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        window.scrollTo(0, 0);
    } catch (error) {
        console.error('Error loading anime detail:', error);
    }
}

function playEpisode(link, episodeNum) {
    showToast(`Playing Episode ${episodeNum}`, 'success');
    // Integrasi dengan player bisa ditambahkan di sini
    if (link) {
        console.log('Playing:', link);
    }
}

function updatePagination(containerId, currentPage, hasNext, type = '', param = '') {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.textContent = '← Sebelumnya';
        prevBtn.addEventListener('click', () => {
            if (type === 'ongoing') loadOngoing(currentPage - 1);
            else if (type === 'complete') loadComplete(currentPage - 1);
            else if (type === 'genre') loadGenreAnime(param, currentPage - 1);
            window.scrollTo(0, 0);
        });
        container.appendChild(prevBtn);
    }

    const pageInfo = document.createElement('span');
    pageInfo.style.alignSelf = 'center';
    pageInfo.textContent = `Halaman ${currentPage}`;
    container.appendChild(pageInfo);

    if (hasNext) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.textContent = 'Selanjutnya →';
        nextBtn.addEventListener('click', () => {
            if (type === 'ongoing') loadOngoing(currentPage + 1);
            else if (type === 'complete') loadComplete(currentPage + 1);
            else if (type === 'genre') loadGenreAnime(param, currentPage + 1);
            window.scrollTo(0, 0);
        });
        container.appendChild(nextBtn);
    }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;

            switch (page) {
                case 'home':
                    loadHome();
                    break;
                case 'ongoing':
                    loadOngoing();
                    break;
                case 'complete':
                    loadComplete();
                    break;
                case 'genres':
                    loadGenres();
                    break;
                case 'schedule':
                    loadSchedule();
                    break;
            }
        });
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');

    searchBtn?.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            searchAnime(query);
        }
    });

    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchAnime(query);
            }
        }
    });

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

    menuToggle?.addEventListener('click', () => {
        mobileMenuOverlay.classList.toggle('active');
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;

            switch (page) {
                case 'home':
                    loadHome();
                    break;
                case 'ongoing':
                    loadOngoing();
                    break;
                case 'complete':
                    loadComplete();
                    break;
                case 'genres':
                    loadGenres();
                    break;
                case 'schedule':
                    loadSchedule();
                    break;
            }

            closeMobileMenu();
        });
    });

    // Load home on startup
    loadHome();
});
