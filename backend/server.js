require('dotenv').config();
console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Подключаем Passport (Google OAuth + JWT)
const passport = require('./config/passport');

const app = express();
app.use(cors());

// Инициализация Passport
app.use(passport.initialize());

// Для отладки смотрим, что в req.user после аутентификации
app.use((req, res, next) => {
  console.log('Authenticated user:', req.user);
  next();
});

// 1. Подключаем маршрут вебхука до применения глобального JSON-парсера (важно для Stripe)
const { webhookRouter, payRouter } = require('./routes/payment');
app.use('/api/webhook', webhookRouter);

// 2. Глобальный JSON-парсер для остальных маршрутов
app.use(express.json());

// Подключаем остальные маршруты
const authRoutes = require('./routes/auth');
const slotsRoutes = require('./routes/slots');
const bookingsRoutes = require('./routes/bookings');
const profileRoutes = require('./routes/profile');
const verificationRoutes = require('./routes/verification');
const adminRoutes = require('./routes/admin');
const smsAuthRoutes = require('./routes/smsAuth');

app.use('/api', authRoutes);
app.use('/api', slotsRoutes);
app.use('/api', bookingsRoutes);
app.use('/api', payRouter);
app.use('/api', profileRoutes);
app.use('/api', verificationRoutes);
app.use('/api', adminRoutes);
app.use('/api', smsAuthRoutes);

// Тестовый маршрут
app.get('/api/test', (req, res) => {
  console.log('GET /api/test called');
  res.json({ message: 'Test route works!' });
});

// Fallback для несуществующих маршрутов (404)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Глобальный middleware для обработки ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Подключение к MongoDB с использованием репликационного набора (rs0)
mongoose.connect('mongodb://localhost:27017/onlycalls?replicaSet=rs0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Ошибка подключения:'));
db.once('open', () => {
  console.log("Соединение с MongoDB установлено");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
