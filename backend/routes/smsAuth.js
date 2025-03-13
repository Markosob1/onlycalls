// backend/routes/smsAuth.js
const express = require('express');
const router = express.Router();
const sendSMS = require('../utils/sendSMS');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const VerificationCode = require('../models/verificationcode');

// Отправка кода на SMS
router.post('/sms/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Номер телефона обязателен' });

    // Генерируем 6-значный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Сохраняем код с номером телефона и сроком действия (например, 5 минут)
    await VerificationCode.findOneAndUpdate(
      { phone },
      { code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      { upsert: true, new: true }
    );

    // Отправляем SMS
    await sendSMS(phone, `Ваш код подтверждения: ${code}`);
    res.json({ message: 'SMS отправлено' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Подтверждение кода и регистрация/логин
router.post('/sms/verify', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ message: 'Номер телефона и код обязательны' });

    const record = await VerificationCode.findOne({ phone });
    if (!record) return res.status(400).json({ message: 'Код не найден. Запросите повторное отправление.' });
    if (record.code !== code) return res.status(400).json({ message: 'Неверный код' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: 'Код истёк' });

    // Код валиден, удаляем запись
    await VerificationCode.deleteOne({ phone });

    // Проверяем, существует ли пользователь с этим номером
    let user = await User.findOne({ phone });
    if (!user) {
      // Если пользователь не найден, генерируем dummy email и случайный пароль
      const dummyEmail = `${phone.replace(/\D/g, '')}@example.com`;
      const dummyPassword = Math.random().toString(36).slice(-8);
      user = new User({ email: dummyEmail, password: dummyPassword, phone, role: 'user' });
      await user.save();
    }

    // Генерируем JWT токен для аутентификации
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1h' }
    );
    res.json({ message: 'Вход выполнен', user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
