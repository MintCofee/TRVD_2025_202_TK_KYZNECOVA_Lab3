const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-secret-key-for-jwt';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Мокова база даних для гітарних табулатур
let guitarTabs = [
    {
        id: 1,
        title: "Nothing Else Matters",
        artist: "Metallica",
        difficulty: "intermediate",
        genre: "metal",
        tabContent: "e|-0-0-0---0-0-0-0-0---0-0-0-0-0---|\nB|----------------------------------|\nG|----------------------------------|\nD|----------------------------------|\nA|----------------------------------|\nE|----------------------------------|",
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
        tabContent: "e|-----------------0---------------|\nB|-------------0--------0--------|\nG|----------0----------------0---|\nD|-------2-----------------------|\nA|----2--------------------------|\nE|-0-----------------------------|",
        capo: 2,
        tuning: "Standard",
        author: "user1",
        createdAt: "2023-10-10",
        likes: 89,
        views: 1200
    },
    {
        id: 3,
        title: "Smoke on the Water",
        artist: "Deep Purple",
        difficulty: "beginner",
        genre: "rock",
        tabContent: "e|-----------------|\nB|-----------------|\nG|-----------------|\nD|-----------------|\nA|--3-6--3-6-3-6-3-|\nE|-----------------|",
        capo: 0,
        tuning: "Standard",
        author: "admin",
        createdAt: "2023-10-05",
        likes: 200,
        views: 2500
    }
];

// Мокова база даних для пісень
let songs = [
    {
        id: 1,
        title: "Stairway to Heaven",
        artist: "Led Zeppelin",
        album: "Led Zeppelin IV",
        year: 1971,
        duration: "8:02",
        tabId: 1
    },
    {
        id: 2,
        title: "Hotel California",
        artist: "Eagles",
        album: "Hotel California",
        year: 1976,
        duration: "6:30",
        tabId: 2
    }
];

// Мокова база даних для користувачів
let users = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@guitartabs.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq2V8U1QH2RZ5.1Pzq8QfTk7J1qW1y', // "admin123"
        role: 'admin',
        createdAt: '2023-01-15'
    },
    {
        id: 2,
        username: 'guitar_lover',
        email: 'user@example.com',
        password: '$2a$10$SomeOtherHashForPassword123',
        role: 'user',
        createdAt: '2023-03-20'
    }
];

// ==================== Middleware для JWT авторизації ====================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Токен не надано' });
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недійсний токен' });
        }
        req.user = user;
        next();
    });
};

// ==================== API для аутентифікації ====================

// POST /api/auth/register - Реєстрація користувача
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    // Валідація вхідних даних
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Усі поля обов\'язкові' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ error: 'Ім\'я користувача має містити мінімум 3 символи' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль має містити мінімум 6 символів' });
    }
    
    if (!email.includes('@')) {
        return res.status(400).json({ error: 'Невірний формат email' });
    }
    
    // Перевірка чи користувач вже існує
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Користувач з таким іменем вже існує' });
    }
    
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Користувач з таким email вже існує' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: users.length + 1,
            username,
            email,
            password: hashedPassword,
            role: 'user',
            createdAt: new Date().toISOString().split('T')[0]
        };
        
        users.push(newUser);
        
        // Генерація JWT токена
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, role: newUser.role },
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'Користувач успішно зареєстрований',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            },
            token
        });
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// POST /api/auth/login - Вхід користувача
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Валідація вхідних даних
    if (!username || !password) {
        return res.status(400).json({ error: 'Логін та пароль обов\'язкові' });
    }
    
    const user = users.find(u => u.username === username || u.email === username);
    
    if (!user) {
        return res.status(401).json({ error: 'Невірний логін або пароль' });
    }
    
    try {
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Невірний логін або пароль' });
        }
        
        // Генерація JWT токена
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        
        res.json({
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
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ==================== CRUD API для табулатур ====================

// GET /api/tabs - Отримати всі табулатури (публічний доступ)
app.get('/api/tabs', (req, res) => {
    res.status(200).json(guitarTabs);
});

// GET /api/tabs/:id - Отримати одну табулатуру (публічний доступ)
app.get('/api/tabs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const tab = guitarTabs.find(t => t.id === id);
    
    if (!tab) {
        return res.status(404).json({ error: 'Табулатура не знайдена' });
    }
    
    // Збільшуємо лічильник переглядів
    tab.views = (tab.views || 0) + 1;
    
    res.status(200).json(tab);
});

// POST /api/tabs - Створити нову табулатуру (потрібна авторизація)
app.post('/api/tabs', authenticateToken, (req, res) => {
    const { title, artist, difficulty, genre, tabContent, capo, tuning } = req.body;
    
    // Валідація вхідних даних
    const errors = [];
    
    if (!title || title.trim().length < 2) {
        errors.push('Назва пісні має містити принаймні 2 символи');
    }
    
    if (!artist || artist.trim().length < 2) {
        errors.push('Ім\'я виконавця має містити принаймні 2 символи');
    }
    
    if (!difficulty || !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
        errors.push('Рівень складності має бути: beginner, intermediate або advanced');
    }
    
    if (!genre || genre.trim().length < 2) {
        errors.push('Вкажіть жанр');
    }
    
    if (!tabContent || tabContent.trim().length < 10) {
        errors.push('Вміст табулатури занадто короткий');
    }
    
    if (capo !== undefined && (isNaN(capo) || capo < 0 || capo > 12)) {
        errors.push('Капо має бути числом від 0 до 12');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }
    
    const newTab = {
        id: guitarTabs.length > 0 ? Math.max(...guitarTabs.map(t => t.id)) + 1 : 1,
        title: title.trim(),
        artist: artist.trim(),
        difficulty,
        genre: genre.trim(),
        tabContent: tabContent.trim(),
        capo: capo ? parseInt(capo) : 0,
        tuning: tuning || 'Standard',
        author: req.user.username,
        createdAt: new Date().toISOString().split('T')[0],
        likes: 0,
        views: 0
    };
    
    guitarTabs.push(newTab);
    
    res.status(201).json({
        message: 'Табулатура успішно створена',
        tab: newTab
    });
});

// PUT /api/tabs/:id - Оновити табулатуру (потрібна авторизація)
app.put('/api/tabs/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const tabIndex = guitarTabs.findIndex(t => t.id === id);
    
    if (tabIndex === -1) {
        return res.status(404).json({ error: 'Табулатура не знайдена' });
    }
    
    // Перевірка прав доступу (тільки автор або адмін можуть редагувати)
    if (guitarTabs[tabIndex].author !== req.user.username && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Недостатньо прав для редагування' });
    }
    
    const { title, artist, difficulty, genre, tabContent, capo, tuning } = req.body;
    
    // Валідація вхідних даних
    const errors = [];
    
    if (title && title.trim().length < 2) {
        errors.push('Назва пісні має містити принаймні 2 символи');
    }
    
    if (artist && artist.trim().length < 2) {
        errors.push('Ім\'я виконавця має містити принаймні 2 символи');
    }
    
    if (difficulty && !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
        errors.push('Рівень складності має бути: beginner, intermediate або advanced');
    }
    
    if (genre && genre.trim().length < 2) {
        errors.push('Вкажіть жанр');
    }
    
    if (tabContent && tabContent.trim().length < 10) {
        errors.push('Вміст табулатури занадто короткий');
    }
    
    if (capo !== undefined && (isNaN(capo) || capo < 0 || capo > 12)) {
        errors.push('Капо має бути числом від 0 до 12');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }
    
    // Оновлення даних
    if (title) guitarTabs[tabIndex].title = title.trim();
    if (artist) guitarTabs[tabIndex].artist = artist.trim();
    if (difficulty) guitarTabs[tabIndex].difficulty = difficulty;
    if (genre) guitarTabs[tabIndex].genre = genre.trim();
    if (tabContent) guitarTabs[tabIndex].tabContent = tabContent.trim();
    if (capo !== undefined) guitarTabs[tabIndex].capo = parseInt(capo);
    if (tuning) guitarTabs[tabIndex].tuning = tuning;
    
    res.status(200).json({
        message: 'Табулатура успішно оновлена',
        tab: guitarTabs[tabIndex]
    });
});

// DELETE /api/tabs/:id - Видалити табулатуру (потрібна авторизація)
app.delete('/api/tabs/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const tabIndex = guitarTabs.findIndex(t => t.id === id);
    
    if (tabIndex === -1) {
        return res.status(404).json({ error: 'Табулатура не знайдена' });
    }
    
    // Перевірка прав доступу (тільки автор або адмін можуть видаляти)
    if (guitarTabs[tabIndex].author !== req.user.username && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Недостатньо прав для видалення' });
    }
    
    const deletedTab = guitarTabs.splice(tabIndex, 1)[0];
    
    res.status(200).json({
        message: 'Табулатура успішно видалена',
        tab: deletedTab
    });
});

// POST /api/tabs/:id/like - Поставити лайк (потрібна авторизація)
app.post('/api/tabs/:id/like', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const tab = guitarTabs.find(t => t.id === id);
    
    if (!tab) {
        return res.status(404).json({ error: 'Табулатура не знайдена' });
    }
    
    tab.likes = (tab.likes || 0) + 1;
    
    res.status(200).json({
        message: 'Лайк додано',
        likes: tab.likes
    });
});

// ==================== CRUD API для пісень ====================

// GET /api/songs - Отримати всі пісні (публічний доступ)
app.get('/api/songs', (req, res) => {
    res.status(200).json(songs);
});

// GET /api/songs/:id - Отримати одну пісню (публічний доступ)
app.get('/api/songs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const song = songs.find(s => s.id === id);
    
    if (!song) {
        return res.status(404).json({ error: 'Пісня не знайдена' });
    }
    
    res.status(200).json(song);
});

// POST /api/songs - Створити нову пісню (потрібна авторизація)
app.post('/api/songs', authenticateToken, (req, res) => {
    const { title, artist, album, year, duration, tabId } = req.body;
    
    // Валідація вхідних даних
    const errors = [];
    
    if (!title || title.trim().length < 2) {
        errors.push('Назва пісні має містити принаймні 2 символи');
    }
    
    if (!artist || artist.trim().length < 2) {
        errors.push('Ім\'я виконавця має містити принаймні 2 символи');
    }
    
    if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) {
        errors.push('Рік має бути від 1900 до поточного року');
    }
    
    if (tabId && !guitarTabs.find(t => t.id === parseInt(tabId))) {
        errors.push('Табулатура з вказаним ID не існує');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }
    
    const newSong = {
        id: songs.length > 0 ? Math.max(...songs.map(s => s.id)) + 1 : 1,
        title: title.trim(),
        artist: artist.trim(),
        album: album ? album.trim() : '',
        year: year ? parseInt(year) : null,
        duration: duration || '',
        tabId: tabId ? parseInt(tabId) : null
    };
    
    songs.push(newSong);
    
    res.status(201).json({
        message: 'Пісня успішно створена',
        song: newSong
    });
});

// PUT /api/songs/:id - Оновити пісню (потрібна авторизація)
app.put('/api/songs/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const songIndex = songs.findIndex(s => s.id === id);
    
    if (songIndex === -1) {
        return res.status(404).json({ error: 'Пісня не знайдена' });
    }
    
    const { title, artist, album, year, duration, tabId } = req.body;
    
    // Валідація вхідних даних
    const errors = [];
    
    if (title && title.trim().length < 2) {
        errors.push('Назва пісні має містити принаймні 2 символи');
    }
    
    if (artist && artist.trim().length < 2) {
        errors.push('Ім\'я виконавця має містити принаймні 2 символи');
    }
    
    if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) {
        errors.push('Рік має бути від 1900 до поточного року');
    }
    
    if (tabId && !guitarTabs.find(t => t.id === parseInt(tabId))) {
        errors.push('Табулатура з вказаним ID не існує');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }
    
    // Оновлення даних
    if (title) songs[songIndex].title = title.trim();
    if (artist) songs[songIndex].artist = artist.trim();
    if (album !== undefined) songs[songIndex].album = album ? album.trim() : '';
    if (year) songs[songIndex].year = parseInt(year);
    if (duration !== undefined) songs[songIndex].duration = duration;
    if (tabId !== undefined) songs[songIndex].tabId = tabId ? parseInt(tabId) : null;
    
    res.status(200).json({
        message: 'Пісня успішно оновлена',
        song: songs[songIndex]
    });
});

// DELETE /api/songs/:id - Видалити пісню (потрібна авторизація, тільки адмін)
app.delete('/api/songs/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const songIndex = songs.findIndex(s => s.id === id);
    
    if (songIndex === -1) {
        return res.status(404).json({ error: 'Пісня не знайдена' });
    }
    
    // Перевірка прав доступу (тільки адмін)
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Недостатньо прав для видалення' });
    }
    
    const deletedSong = songs.splice(songIndex, 1)[0];
    
    res.status(200).json({
        message: 'Пісня успішно видалена',
        song: deletedSong
    });
});

// ==================== Додаткові API ====================

// GET /api/tabs/search/:query - Пошук табулатур (публічний доступ)
app.get('/api/tabs/search/:query', (req, res) => {
    const query = req.params.query.toLowerCase();
    
    const results = guitarTabs.filter(tab => 
        tab.title.toLowerCase().includes(query) ||
        tab.artist.toLowerCase().includes(query) ||
        tab.genre.toLowerCase().includes(query)
    );
    
    res.status(200).json({
        count: results.length,
        results
    });
});

// GET /api/stats - Статистика (публічний доступ)
app.get('/api/stats', (req, res) => {
    const stats = {
        totalTabs: guitarTabs.length,
        totalSongs: songs.length,
        totalUsers: users.length,
        totalViews: guitarTabs.reduce((sum, tab) => sum + (tab.views || 0), 0),
        totalLikes: guitarTabs.reduce((sum, tab) => sum + (tab.likes || 0), 0),
        mostPopularTab: guitarTabs.reduce((max, tab) => (tab.views > max.views ? tab : max), guitarTabs[0]),
        genres: [...new Set(guitarTabs.map(tab => tab.genre))]
    };
    
    res.status(200).json(stats);
});

// ==================== Обробка помилок ====================

// 404 для неіснуючих API ендпоінтів
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API ендпоінт не знайдено' });
});

// ==================== Стартові HTML сторінки ====================

// Головна сторінка (ваш існуючий HTML)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/tabs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tabs.html'));
});

app.get('/songs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'songs.html'));
});

// Сторінка документації API
app.get('/api-docs', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Guitar Tabs API Documentation</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .method { font-weight: bold; padding: 3px 8px; border-radius: 3px; margin-right: 10px; }
                .get { background: #4CAF50; color: white; }
                .post { background: #2196F3; color: white; }
                .put { background: #FF9800; color: white; }
                .delete { background: #F44336; color: white; }
                .auth { color: #9C27B0; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>🎸 Guitar Tabs REST API Documentation</h1>
            
            <h2>🔐 Authentication</h2>
            <div class="endpoint">
                <span class="method post">POST</span> /api/auth/register
                <p>Register new user</p>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span> /api/auth/login
                <p>Login user</p>
            </div>
            
            <h2>📄 Tabs</h2>
            <div class="endpoint">
                <span class="method get">GET</span> /api/tabs
                <p>Get all tabs (public)</p>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span> /api/tabs/:id
                <p>Get single tab (public)</p>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span> /api/tabs
                <p class="auth">Requires JWT token</p>
                <p>Create new tab</p>
            </div>
            <div class="endpoint">
                <span class="method put">PUT</span> /api/tabs/:id
                <p class="auth">Requires JWT token</p>
                <p>Update tab</p>
            </div>
            <div class="endpoint">
                <span class="method delete">DELETE</span> /api/tabs/:id
                <p class="auth">Requires JWT token</p>
                <p>Delete tab</p>
            </div>
            
            <h2>🎵 Songs</h2>
            <div class="endpoint">
                <span class="method get">GET</span> /api/songs
                <p>Get all songs (public)</p>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span> /api/songs
                <p class="auth">Requires JWT token</p>
                <p>Create new song</p>
            </div>
        </body>
        </html>
    `);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущено на порті ${PORT}`);
    console.log(`Головна сторінка: http://localhost:${PORT}`);
    console.log(`Документація API: http://localhost:${PORT}/api-docs`);
    console.log(`Приклад запиту: curl http://localhost:${PORT}/api/tabs`);
});
