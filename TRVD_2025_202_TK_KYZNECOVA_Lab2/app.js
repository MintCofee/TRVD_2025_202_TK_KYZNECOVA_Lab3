const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Проміжне ПЗ для логування
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Мокова база даних
let tabs = [
    {
        id: 1,
        title: "Nothing Else Matters",
        artist: "Metallica",
        difficulty: "intermediate",
        genre: "metal",
        tabContent: `e|-----------------|
B|-----------------|
G|-----------------|
D|-----------------|
A|-----------------|
E|0-3-5-----------|`,
        capo: 0,
        tuning: "Standard",
        author: "admin",
        createdAt: "2023-10-15",
        likes: 120,
        views: 1500
    },
    {
        id: 2,
        title: "Wish You Were Here",
        artist: "Pink Floyd",
        difficulty: "beginner",
        genre: "rock",
        tabContent: `e|-----------------|
B|-----------------|
G|-----------------|
D|-----------------|
A|-----------------|
E|0-2-3-2-0-------|`,
        capo: 2,
        tuning: "Standard",
        author: "user1",
        createdAt: "2023-10-10",
        likes: 89,
        views: 1200
    }
];

let songs = [
    {
        id: 1,
        title: "Smoke on the Water",
        artist: "Deep Purple",
        year: 1972,
        album: "Machine Head",
        chords: ["G", "C", "D", "Em"],
        duration: "5:40",
        tabId: 3
    },
    {
        id: 2,
        title: "Stairway to Heaven",
        artist: "Led Zeppelin",
        year: 1971,
        album: "Led Zeppelin IV",
        chords: ["Am", "C", "D", "F", "G"],
        duration: "8:02",
        tabId: 4
    }
];

let users = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@guitartabs.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq2V8U1QH2RZ5.1Pzq8QfTk7J1qW1y', // "admin123"
        role: 'admin',
        joinDate: '2023-01-15',
        favorites: [1, 2]
    },
    {
        id: 2,
        username: 'guitar_lover',
        email: 'user@example.com',
        password: '$2a$10$YourHashedPasswordHere', // "password123"
        role: 'user',
        joinDate: '2023-03-20',
        favorites: [1]
    }
];

// Middleware для перевірки JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: 'Токен не надано. Будь ласка, увійдіть в систему.' 
        });
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false,
                error: 'Недійсний або прострочений токен' 
            });
        }
        req.user = user;
        next();
    });
};

// Middleware для перевірки ролі адміна
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'Доступ заборонено. Потрібні права адміністратора.' 
        });
    }
    next();
};

// ==================== АВТОРИЗАЦІЯ ====================

// Реєстрація
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    // Валідація
    const errors = [];
    if (!username || username.trim().length < 3) {
        errors.push('Ім\'я користувача має містити принаймні 3 символи');
    }
    if (!email || !email.includes('@')) {
        errors.push('Введіть коректний email');
    }
    if (!password || password.length < 6) {
        errors.push('Пароль має містити принаймні 6 символів');
    }
    if (users.find(u => u.username === username)) {
        errors.push('Користувач з таким іменем вже існує');
    }
    if (users.find(u => u.email === email)) {
        errors.push('Користувач з таким email вже існує');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false,
            errors 
        });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: users.length + 1,
            username: username.trim(),
            email: email.trim(),
            password: hashedPassword,
            role: 'user',
            joinDate: new Date().toISOString().split('T')[0],
            favorites: []
        };
        
        users.push(newUser);
        
        // Створюємо JWT токен
        const token = jwt.sign(
            { 
                id: newUser.id, 
                username: newUser.username,
                email: newUser.email,
                role: newUser.role 
            },
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            success: true,
            message: 'Реєстрація успішна',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            },
            token
        });
    } catch (error) {
        console.error('Помилка реєстрації:', error);
        res.status(500).json({ 
            success: false,
            error: 'Помилка сервера при реєстрації' 
        });
    }
});

// Логін
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false,
            error: "Логін та пароль обов'язкові" 
        });
    }
    
    const user = users.find(u => u.username === username || u.email === username);
    
    if (!user) {
        return res.status(401).json({ 
            success: false,
            error: 'Невірний логін або пароль' 
        });
    }
    
    try {
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Невірний логін або пароль' 
            });
        }
        
        // Створюємо JWT токен
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                email: user.email,
                role: user.role 
            },
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: 'Вхід успішний',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Помилка входу:', error);
        res.status(500).json({ 
            success: false,
            error: 'Помилка сервера' 
        });
    }
});

// ==================== CRUD ДЛЯ ТАБУЛАТУР ====================

// GET /api/tabs - Отримати всі табулатури (публічний доступ)
app.get('/api/tabs', (req, res) => {
    const { search, genre, difficulty, artist, sortBy = 'newest' } = req.query;
    
    let filteredTabs = [...tabs];
    
    // Фільтрація
    if (search) {
        const searchLower = search.toLowerCase();
        filteredTabs = filteredTabs.filter(tab => 
            tab.title.toLowerCase().includes(searchLower) ||
            tab.artist.toLowerCase().includes(searchLower)
        );
    }
    
    if (genre) {
        filteredTabs = filteredTabs.filter(tab => tab.genre === genre);
    }
    
    if (difficulty) {
        filteredTabs = filteredTabs.filter(tab => tab.difficulty === difficulty);
    }
    
    if (artist) {
        filteredTabs = filteredTabs.filter(tab => tab.artist === artist);
    }
    
    // Сортування
    if (sortBy === 'newest') {
        filteredTabs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'popular') {
        filteredTabs.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'likes') {
        filteredTabs.sort((a, b) => b.likes - a.likes);
    }
    
    res.json({
        success: true,
        count: filteredTabs.length,
        tabs: filteredTabs
    });
});

// GET /api/tabs/:id - Отримати одну табулатуру (публічний доступ)
app.get('/api/tabs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const tab = tabs.find(t => t.id === id);
    
    if (!tab) {
        return res.status(404).json({ 
            success: false,
            error: 'Табулатура не знайдена' 
        });
    }
    
    // Збільшуємо кількість переглядів
    tab.views = (tab.views || 0) + 1;
    
    res.json({
        success: true,
        tab
    });
});

// POST /api/tabs - Створити нову табулатуру (потрібна авторизація)
app.post('/api/tabs', authenticateToken, (req, res) => {
    const { title, artist, difficulty, genre, tabContent, capo, tuning } = req.body;
    
    // Валідація
    const errors = [];
    
    if (!title || title.trim().length < 2) {
        errors.push('Назва пісні має містити принаймні 2 символи');
    }
    
    if (!artist || artist.trim().length < 2) {
        errors.push('Виконавець має містити принаймні 2 символи');
    }
    
    if (!difficulty || !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
        errors.push('Рівень складності має бути: beginner, intermediate або advanced');
    }
    
    if (!genre || !['rock', 'metal', 'pop', 'blues', 'jazz', 'folk', 'country'].includes(genre)) {
        errors.push('Невірний жанр');
    }
    
    if (!tabContent || tabContent.trim().length < 10) {
        errors.push('Вміст табулатури занадто короткий');
    }
    
    if (capo && (isNaN(capo) || capo < 0 || capo > 12)) {
        errors.push('Капо має бути від 0 до 12');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false,
            errors 
        });
    }
    
    const newTab = {
        id: tabs.length > 0 ? Math.max(...tabs.map(t => t.id)) + 1 : 1,
        title: title.trim(),
        artist: artist.trim(),
        difficulty,
        genre,
        tabContent: tabContent.trim(),
        capo: capo ? parseInt(capo) : 0,
        tuning: tuning || 'Standard',
        author: req.user.username,
        createdAt: new Date().toISOString().split('T')[0],
        likes: 0,
        views: 0
    };
    
    tabs.push(newTab);
    
    res.status(201).json({
        success: true,
        message: 'Табулатура успішно створена',
        tab: newTab
    });
});

// PUT /api/tabs/:id - Оновити табулатуру (авторизація + автор або адмін)
app.put('/api/tabs/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const tabIndex = tabs.findIndex(t => t.id === id);
    
    if (tabIndex === -1) {
        return res.status(404).json({ 
            success: false,
            error: 'Табулатура не знайдена' 
        });
    }
    
    // Перевірка прав доступу
    if (tabs[tabIndex].author !== req.user.username && req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'Ви не маєте прав для редагування цієї табулатури' 
        });
    }
    
    const { title, artist, difficulty, genre, tabContent, capo, tuning } = req.body;
    
    // Валідація
    const errors = [];
    
    if (title && title.trim().length < 2) {
        errors.push('Назва пісні має містити принаймні 2 символи');
    }
    
    if (artist && artist.trim().length < 2) {
        errors.push('Виконавець має містити принаймні 2 символи');
    }
    
    if (difficulty && !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
        errors.push('Рівень складності має бути: beginner, intermediate або advanced');
    }
    
    if (genre && !['rock', 'metal', 'pop', 'blues', 'jazz', 'folk', 'country'].includes(genre)) {
        errors.push('Невірний жанр');
    }
    
    if (tabContent && tabContent.trim().length < 10) {
        errors.push('Вміст табулатури занадто короткий');
    }
    
    if (capo && (isNaN(capo) || capo < 0 || capo > 12)) {
        errors.push('Капо має бути від 0 до 12');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false,
            errors 
        });
    }
    
    // Оновлення даних
    tabs[tabIndex] = {
        ...tabs[tabIndex],
        title: title ? title.trim() : tabs[tabIndex].title,
        artist: artist ? artist.trim() : tabs[tabIndex].artist,
        difficulty: difficulty || tabs[tabIndex].difficulty,
        genre: genre || tabs[tabIndex].genre,
        tabContent: tabContent ? tabContent.trim() : tabs[tabIndex].tabContent,
        capo: capo ? parseInt(capo) : tabs[tabIndex].capo,
        tuning: tuning || tabs[tabIndex].tuning
    };
    
    res.json({
        success: true,
        message: 'Табулатура успішно оновлена',
        tab: tabs[tabIndex]
    });
});

// DELETE /api/tabs/:id - Видалити табулатуру (авторизація + автор або адмін)
app.delete('/api/tabs/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const tabIndex = tabs.findIndex(t => t.id === id);
    
    if (tabIndex === -1) {
        return res.status(404).json({ 
            success: false,
            error: 'Табулатура не знайдена' 
        });
    }
    
    // Перевірка прав доступу
    if (tabs[tabIndex].author !== req.user.username && req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'Ви не маєте прав для видалення цієї табулатури' 
        });
    }
    
    const deletedTab = tabs.splice(tabIndex, 1)[0];
    
    res.json({
        success: true,
        message: 'Табулатура успішно видалена',
        tab: deletedTab
    });
});

// POST /api/tabs/:id/like - Поставити лайк (авторизація)
app.post('/api/tabs/:id/like', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const tabIndex = tabs.findIndex(t => t.id === id);
    
    if (tabIndex === -1) {
        return res.status(404).json({ 
            success: false,
            error: 'Табулатура не знайдена' 
        });
    }
    
    tabs[tabIndex].likes = (tabs[tabIndex].likes || 0) + 1;
    
    res.json({
        success: true,
        message: 'Лайк додано',
        likes: tabs[tabIndex].likes
    });
});

// POST /api/tabs/:id/favorite - Додати до обраного (авторизація)
app.post('/api/tabs/:id/favorite', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const tab = tabs.find(t => t.id === id);
    
    if (!tab) {
        return res.status(404).json({ 
            success: false,
            error: 'Табулатура не знайдена' 
        });
    }
    
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
        return res.status(404).json({ 
            success: false,
            error: 'Користувач не знайдений' 
        });
    }
    
    if (!users[userIndex].favorites.includes(id)) {
        users[userIndex].favorites.push(id);
    }
    
    res.json({
        success: true,
        message: 'Додано до обраного',
        favorites: users[userIndex].favorites
    });
});

// ==================== CRUD ДЛЯ ПІСЕНЬ ====================

// GET /api/songs - Отримати всі пісні
app.get('/api/songs', (req, res) => {
    const { artist, album, year } = req.query;
    
    let filteredSongs = [...songs];
    
    if (artist) {
        filteredSongs = filteredSongs.filter(song => 
            song.artist.toLowerCase().includes(artist.toLowerCase())
        );
    }
    
    if (album) {
        filteredSongs = filteredSongs.filter(song => 
            song.album.toLowerCase().includes(album.toLowerCase())
        );
    }
    
    if (year) {
        filteredSongs = filteredSongs.filter(song => song.year == year);
    }
    
    res.json({
        success: true,
        count: filteredSongs.length,
        songs: filteredSongs
    });
});

// GET /api/songs/:id - Отримати одну пісню
app.get('/api/songs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const song = songs.find(s => s.id === id);
    
    if (!song) {
        return res.status(404).json({ 
            success: false,
            error: 'Пісня не знайдена' 
        });
    }
    
    res.json({
        success: true,
        song
    });
});

// POST /api/songs - Створити нову пісню (тільки адмін)
app.post('/api/songs', authenticateToken, requireAdmin, (req, res) => {
    const { title, artist, year, album, chords, duration, tabId } = req.body;
    
    // Валідація
    const errors = [];
    
    if (!title || title.trim().length < 2) {
        errors.push('Назва пісні має містити принаймні 2 символи');
    }
    
    if (!artist || artist.trim().length < 2) {
        errors.push('Виконавець має містити принаймні 2 символи');
    }
    
    if (!year || isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
        errors.push('Рік має бути від 1900 до поточного року');
    }
    
    if (tabId && !tabs.find(t => t.id === parseInt(tabId))) {
        errors.push('Табулатура з таким ID не існує');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false,
            errors 
        });
    }
    
    const newSong = {
        id: songs.length > 0 ? Math.max(...songs.map(s => s.id)) + 1 : 1,
        title: title.trim(),
        artist: artist.trim(),
        year: parseInt(year),
        album: album ? album.trim() : '',
        chords: chords || [],
        duration: duration || '',
        tabId: tabId ? parseInt(tabId) : null
    };
    
    songs.push(newSong);
    
    res.status(201).json({
        success: true,
        message: 'Пісня успішно створена',
        song: newSong
    });
});

// ==================== КОРИСТУВАЧІ ====================

// GET /api/users/me - Отримати інформацію про поточного користувача
app.get('/api/users/me', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
        return res.status(404).json({ 
            success: false,
            error: 'Користувач не знайдений' 
        });
    }
    
    // Без пароля
    const { password, ...userWithoutPassword } = user;
    
    res.json({
        success: true,
        user: userWithoutPassword
    });
});

// GET /api/users/me/favorites - Отримати обрані табулатури
app.get('/api/users/me/favorites', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
        return res.status(404).json({ 
            success: false,
            error: 'Користувач не знайдений' 
        });
    }
    
    const favoriteTabs = tabs.filter(tab => user.favorites.includes(tab.id));
    
    res.json({
        success: true,
        favorites: favoriteTabs
    });
});

// ==================== СТАТИСТИКА ====================

// GET /api/stats - Статистика (тільки адмін)
app.get('/api/stats', authenticateToken, requireAdmin, (req, res) => {
    const totalTabs = tabs.length;
    const totalSongs = songs.length;
    const totalUsers = users.length;
    
    const genreStats = tabs.reduce((acc, tab) => {
        acc[tab.genre] = (acc[tab.genre] || 0) + 1;
        return acc;
    }, {});
    
    const difficultyStats = tabs.reduce((acc, tab) => {
        acc[tab.difficulty] = (acc[tab.difficulty] || 0) + 1;
        return acc;
    }, {});
    
    const totalViews = tabs.reduce((sum, tab) => sum + (tab.views || 0), 0);
    const totalLikes = tabs.reduce((sum, tab) => sum + (tab.likes || 0), 0);
    
    res.json({
        success: true,
        stats: {
            totalTabs,
            totalSongs,
            totalUsers,
            totalViews,
            totalLikes,
            genreStats,
            difficultyStats,
            averageLikesPerTab: totalLikes / totalTabs || 0,
            averageViewsPerTab: totalViews / totalTabs || 0
        }
    });
});

// ==================== HTML СТОРІНКИ ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/docs', (req, res) => {
    res.json({
        message: 'Документація REST API для Guitar Tabs',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login'
            },
            tabs: {
                getAll: 'GET /api/tabs',
                getOne: 'GET /api/tabs/:id',
                create: 'POST /api/tabs (requires auth)',
                update: 'PUT /api/tabs/:id (requires auth)',
                delete: 'DELETE /api/tabs/:id (requires auth)',
                like: 'POST /api/tabs/:id/like (requires auth)',
                favorite: 'POST /api/tabs/:id/favorite (requires auth)'
            },
            songs: {
                getAll: 'GET /api/songs',
                getOne: 'GET /api/songs/:id',
                create: 'POST /api/songs (requires admin)'
            },
            users: {
                getProfile: 'GET /api/users/me (requires auth)',
                getFavorites: 'GET /api/users/me/favorites (requires auth)'
            },
            stats: 'GET /api/stats (requires admin)'
        }
    });
});

// Обробка 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Маршрут не знайдено'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущено на порті ${PORT}`);
    console.log(`Документація API доступна за адресою: http://localhost:${PORT}/api/docs`);
});
