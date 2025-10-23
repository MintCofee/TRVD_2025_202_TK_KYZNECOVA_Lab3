const express = require('express');
const mustacheExpress = require('mustache-express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// Налаштування шаблонізатора Mustache
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

// Підключення до MongoDB
mongoose.connect('mongodb://localhost:27017/mydatabase', { useNewUrlParser: true, useUnifiedTopology: true });

// Маршрути
app.get('/', (req, res) => {
    res.render('index', { title: 'Головна сторінка' });
});

app.listen(port, () => {
    console.log(`Сервер запущено на http://localhost:${port}`);
});

const userController = require('./controllers/userController');

app.get('/users', userController.getUsers);
app.post('/users', express.urlencoded({ extended: true }), userController.createUser);
