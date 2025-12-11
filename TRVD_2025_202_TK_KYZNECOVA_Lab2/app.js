// ==================== ГЛОБАЛЬНІ ЗМІННІ ТА УТІЛІТИ ====================

const API_BASE_URL = '/api';
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentToken = localStorage.getItem('authToken') || null;

// Функція для відображення помилок
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-message" style="color: #dc3545; padding: 10px; margin: 10px 0; background: #f8d7da; border-radius: 5px;">
            ⚠️ ${message}
        </div>
    `;
    
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Функція для відображення успіху
function showSuccess(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="success-message" style="color: #198754; padding: 10px; margin: 10px 0; background: #d1e7dd; border-radius: 5px;">
            ✅ ${message}
        </div>
    `;
    
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Функція для відправки запитів до API з обробкою помилок
async function apiRequest(endpoint, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    
    // Додаємо токен, якщо він є
    if (currentToken) {
        defaultHeaders['Authorization'] = `Bearer ${currentToken}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });
    
    // Спроба отримати JSON (навіть при помилках)
    let data;
    try {
        data = await response.json();
    } catch (error) {
        data = { error: 'Помилка читання відповіді сервера' };
    }
    
    // Перевірка статусу відповіді
    if (!response.ok) {
        // Якщо токен прострочений або недійсний
        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('Сесія закінчилася. Будь ласка, увійдіть знову.');
        }
        
        // Відображаємо помилку з сервера
        const errorMessage = data.error || data.errors?.join(', ') || `Помилка ${response.status}`;
        throw new Error(errorMessage);
    }
    
    return data;
}

// Функція для оновлення UI в залежності від статусу авторизації
function updateAuthUI() {
    const authElements = document.querySelectorAll('[data-auth]');
    const guestElements = document.querySelectorAll('[data-guest]');
    const userInfoElement = document.getElementById('userInfo');
    
    if (currentUser) {
        // Показуємо елементи для авторизованих користувачів
        authElements.forEach(el => el.style.display = 'block');
        guestElements.forEach(el => el.style.display = 'none');
        
        // Оновлюємо інформацію про користувача
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <span>Вітаємо, ${currentUser.username}!</span>
                <button onclick="logout()" class="button secondary" style="margin-left: 10px; padding: 5px 10px;">
                    Вийти
                </button>
            `;
        }
    } else {
        // Показуємо елементи для гостей
        authElements.forEach(el => el.style.display = 'none');
        guestElements.forEach(el => el.style.display = 'block');
        
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <a href="account.html" class="button">Увійти</a>
            `;
        }
    }
}

// Функції для роботи з авторизацією
async function register(event) {
    event.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Клієнтська валідація
    const errors = [];
    
    if (username.length < 3) {
        errors.push('Ім\'я користувача має містити принаймні 3 символи');
    }
    
    if (!email.includes('@')) {
        errors.push('Введіть коректний email');
    }
    
    if (password.length < 6) {
        errors.push('Пароль має містити принаймні 6 символів');
    }
    
    if (password !== confirmPassword) {
        errors.push('Паролі не співпадають');
    }
    
    if (errors.length > 0) {
        showError('registerError', errors.join('<br>'));
        return;
    }
    
    try {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        
        showSuccess('registerSuccess', 'Реєстрація успішна! Тепер ви можете увійти.');
        
        // Очищаємо форму
        event.target.reset();
        
        // Автоматично перенаправляємо на сторінку входу
        setTimeout(() => {
            document.getElementById('registerTab').style.display = 'none';
            document.getElementById('loginTab').style.display = 'block';
        }, 2000);
        
    } catch (error) {
        showError('registerError', error.message);
    }
}

async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Клієнтська валідація
    if (!username || !password) {
        showError('loginError', 'Заповніть всі поля');
        return;
    }
    
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        // Зберігаємо токен та інформацію про користувача
        currentToken = data.token;
        currentUser = data.user;
        
        localStorage.setItem('authToken', currentToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showSuccess('loginSuccess', 'Вхід успішний!');
        
        // Оновлюємо UI та перенаправляємо на головну
        updateAuthUI();
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        showError('loginError', error.message);
    }
}

function logout() {
    // Видаляємо дані з локального сховища
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Скидаємо глобальні змінні
    currentToken = null;
    currentUser = null;
    
    // Оновлюємо UI та перенаправляємо на головну
    updateAuthUI();
    window.location.href = 'index.html';
}

// ==================== ФУНКЦІЇ ДЛЯ РОБОТИ З ТАБУЛАТУРАМИ ====================

// Завантаження всіх табулатур
async function loadTabs() {
    try {
        const data = await apiRequest('/tabs');
        
        const tabsContainer = document.getElementById('tabsContainer');
        if (!tabsContainer) return;
        
        tabsContainer.innerHTML = '';
        
        if (data.length === 0) {
            tabsContainer.innerHTML = '<p>Табулатур поки немає.</p>';
            return;
        }
        
        data.forEach(tab => {
            const tabElement = document.createElement('div');
            tabElement.className = 'song-card';
            tabElement.innerHTML = `
                <div>
                    <h3>${tab.title} - ${tab.artist}</h3>
                    <p class="song-meta">
                        <strong>Рівень:</strong> ${tab.difficulty} | 
                        <strong>Жанр:</strong> ${tab.genre} | 
                        <strong>Автор:</strong> ${tab.author}
                    </p>
                    <p class="song-meta">
                        <strong>Перегляди:</strong> ${tab.views} | 
                        <strong>Лайки:</strong> ${tab.likes} | 
                        <strong>Створено:</strong> ${tab.createdAt}
                    </p>
                    <pre>${tab.tabContent}</pre>
                </div>
                <div class="song-actions">
                    <button onclick="likeTab(${tab.id})" class="action-btn" ${!currentUser ? 'disabled' : ''}>
                        🤍 ${tab.likes}
                    </button>
                    ${currentUser && (currentUser.role === 'admin' || currentUser.username === tab.author) ? `
                        <button onclick="editTab(${tab.id})" class="action-btn">✏️ Редагувати</button>
                        <button onclick="deleteTab(${tab.id})" class="action-btn danger">🗑️ Видалити</button>
                    ` : ''}
                </div>
            `;
            tabsContainer.appendChild(tabElement);
        });
        
    } catch (error) {
        showError('tabsError', `Помилка завантаження: ${error.message}`);
    }
}

// Створення нової табулатури
async function createTab(event) {
    event.preventDefault();
    
    // Клієнтська валідація
    const title = document.getElementById('tabTitle').value.trim();
    const artist = document.getElementById('tabArtist').value.trim();
    const difficulty = document.getElementById('tabDifficulty').value;
    const genre = document.getElementById('tabGenre').value;
    const tabContent = document.getElementById('tabContent').value.trim();
    const capo = document.getElementById('tabCapo').value;
    const tuning = document.getElementById('tabTuning').value;
    
    const errors = [];
    
    if (title.length < 2) {
        errors.push('Назва пісні занадто коротка');
    }
    
    if (artist.length < 2) {
        errors.push('Ім\'я виконавця занадто коротке');
    }
    
    if (!tabContent || tabContent.length < 10) {
        errors.push('Вміст табулатури занадто короткий');
    }
    
    if (capo && (isNaN(capo) || capo < 0 || capo > 12)) {
        errors.push('Капо має бути від 0 до 12');
    }
    
    if (errors.length > 0) {
        showError('createTabError', errors.join('<br>'));
        return;
    }
    
    try {
        const data = await apiRequest('/tabs', {
            method: 'POST',
            body: JSON.stringify({
                title,
                artist,
                difficulty,
                genre,
                tabContent,
                capo: capo || 0,
                tuning: tuning || 'Standard'
            })
        });
        
        showSuccess('createTabSuccess', 'Табулатура успішно створена!');
        
        // Очищаємо форму
        event.target.reset();
        
        // Перенаправляємо на сторінку з табулатурами
        setTimeout(() => {
            window.location.href = 'collections.html';
        }, 1500);
        
    } catch (error) {
        showError('createTabError', error.message);
    }
}

// Лайк табулатури
async function likeTab(tabId) {
    if (!currentUser) {
        showError('tabsError', 'Будь ласка, увійдіть, щоб ставити лайки');
        return;
    }
    
    try {
        const data = await apiRequest(`/tabs/${tabId}/like`, {
            method: 'POST'
        });
        
        // Оновлюємо відображення лайків на сторінці
        const likeButton = document.querySelector(`button[onclick="likeTab(${tabId})"]`);
        if (likeButton) {
            likeButton.innerHTML = `🤍 ${data.likes}`;
        }
        
    } catch (error) {
        showError('tabsError', error.message);
    }
}

// Видалення табулатури
async function deleteTab(tabId) {
    if (!confirm('Ви впевнені, що хочете видалити цю табулатуру?')) {
        return;
    }
    
    try {
        await apiRequest(`/tabs/${tabId}`, {
            method: 'DELETE'
        });
        
        showSuccess('tabsSuccess', 'Табулатура видалена');
        
        // Перезавантажуємо список
        setTimeout(() => {
            loadTabs();
        }, 1000);
        
    } catch (error) {
        showError('tabsError', error.message);
    }
}

// ==================== ФУНКЦІЇ ДЛЯ РОБОТИ З ПІСНЯМИ ====================

// Завантаження всіх пісень
async function loadSongs() {
    try {
        const data = await apiRequest('/songs');
        
        const songsContainer = document.getElementById('songsContainer');
        if (!songsContainer) return;
        
        songsContainer.innerHTML = '';
        
        if (data.length === 0) {
            songsContainer.innerHTML = '<p>Пісень поки немає.</p>';
            return;
        }
        
        data.forEach(song => {
            const songElement = document.createElement('div');
            songElement.className = 'song-card';
            songElement.innerHTML = `
                <div>
                    <h3>${song.title} - ${song.artist}</h3>
                    <p class="song-meta">
                        <strong>Альбом:</strong> ${song.album || 'Невідомо'} | 
                        <strong>Рік:</strong> ${song.year || 'Невідомо'} | 
                        <strong>Тривалість:</strong> ${song.duration || 'Невідомо'}
                    </p>
                </div>
                <div class="song-actions">
                    ${currentUser?.role === 'admin' ? `
                        <button onclick="deleteSong(${song.id})" class="action-btn danger">
                            🗑️ Видалити
                        </button>
                    ` : ''}
                </div>
            `;
            songsContainer.appendChild(songElement);
        });
        
    } catch (error) {
        showError('songsError', `Помилка завантаження: ${error.message}`);
    }
}

// Створення нової пісні
async function createSong(event) {
    event.preventDefault();
    
    // Клієнтська валідація
    const title = document.getElementById('songTitle').value.trim();
    const artist = document.getElementById('songArtist').value.trim();
    const album = document.getElementById('songAlbum').value.trim();
    const year = document.getElementById('songYear').value;
    const duration = document.getElementById('songDuration').value.trim();
    const tabId = document.getElementById('songTabId').value;
    
    const errors = [];
    
    if (title.length < 2) {
        errors.push('Назва пісні занадто коротка');
    }
    
    if (artist.length < 2) {
        errors.push('Ім\'я виконавця занадто коротке');
    }
    
    if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) {
        errors.push('Рік має бути від 1900 до поточного');
    }
    
    if (errors.length > 0) {
        showError('createSongError', errors.join('<br>'));
        return;
    }
    
    try {
        const data = await apiRequest('/songs', {
            method: 'POST',
            body: JSON.stringify({
                title,
                artist,
                album,
                year: year || null,
                duration,
                tabId: tabId || null
            })
        });
        
        showSuccess('createSongSuccess', 'Пісня успішно створена!');
        
        // Очищаємо форму
        event.target.reset();
        
    } catch (error) {
        showError('createSongError', error.message);
    }
}

// ==================== ФУНКЦІЇ ДЛЯ РОБОТИ ЗІ СТАТИСТИКОЮ ====================

async function loadStats() {
    try {
        const data = await apiRequest('/stats');
        
        const statsContainer = document.getElementById('statsContainer');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="panel">
                <h3>Статистика сайту</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                    <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                        <h4 style="color: var(--accent); margin: 0;">${data.totalTabs}</h4>
                        <p>Табулатур</p>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                        <h4 style="color: var(--accent); margin: 0;">${data.totalSongs}</h4>
                        <p>Пісень</p>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                        <h4 style="color: var(--accent); margin: 0;">${data.totalUsers}</h4>
                        <p>Користувачів</p>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                        <h4 style="color: var(--accent); margin: 0;">${data.totalViews}</h4>
                        <p>Переглядів</p>
                    </div>
                </div>
                
                <div style="margin-top: 30px;">
                    <h4>Найпопулярніша табулатура</h4>
                    <p><strong>${data.mostPopularTab.title}</strong> - ${data.mostPopularTab.artist}</p>
                    <p>Перегляди: ${data.mostPopularTab.views} | Лайки: ${data.mostPopularTab.likes}</p>
                </div>
            </div>
        `;
        
    } catch (error) {
        showError('statsError', `Помилка завантаження: ${error.message}`);
    }
}

// ==================== ІНІЦІАЛІЗАЦІЯ ДОДАТКУ ====================

document.addEventListener('DOMContentLoaded', function() {
    // Ініціалізуємо UI авторизації
    updateAuthUI();
    
    // Додаємо обробники подій для форм
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', register);
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }
    
    const createTabForm = document.getElementById('createTabForm');
    if (createTabForm) {
        createTabForm.addEventListener('submit', createTab);
    }
    
    const createSongForm = document.getElementById('createSongForm');
    if (createSongForm) {
        createSongForm.addEventListener('submit', createSong);
    }
    
    // Завантажуємо дані в залежності від сторінки
    const currentPage = window.location.pathname.split('/').pop();
    
    switch(currentPage) {
        case 'collections.html':
            loadTabs();
            break;
        case 'songs.html':
            loadSongs();
            break;
        case 'about.html':
            loadStats();
            break;
        case 'index.html':
            // Завантажуємо останні пісні на головній
            loadLatestSongs();
            break;
    }
    
    // Обробка перемикання між вкладками на сторінці акаунта
    const loginTabBtn = document.getElementById('showLoginTab');
    const registerTabBtn = document.getElementById('showRegisterTab');
    
    if (loginTabBtn && registerTabBtn) {
        loginTabBtn.addEventListener('click', () => {
            document.getElementById('loginTab').style.display = 'block';
            document.getElementById('registerTab').style.display = 'none';
            loginTabBtn.classList.add('active');
            registerTabBtn.classList.remove('active');
        });
        
        registerTabBtn.addEventListener('click', () => {
            document.getElementById('registerTab').style.display = 'block';
            document.getElementById('loginTab').style.display = 'none';
            registerTabBtn.classList.add('active');
            loginTabBtn.classList.remove('active');
        });
    }
});

// Додаткова функція для завантаження останніх пісень
async function loadLatestSongs() {
    try {
        const songs = await apiRequest('/songs');
        const tabs = await apiRequest('/tabs');
        
        const container = document.getElementById('latest-songs');
        if (!container) return;
        
        // Беремо останні 3 пісні
        const latestSongs = songs.slice(-3);
        
        container.innerHTML = latestSongs.map(song => `
            <div class="song-card">
                <h4>${song.title} - ${song.artist}</h4>
                <p>${song.album} (${song.year}) - ${song.duration}</p>
                ${song.tabId ? `<p><a href="collections.html" style="color: var(--accent);">Переглянути табулатуру</a></p>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Помилка завантаження останніх пісень:', error);
    }
}
