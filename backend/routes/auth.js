// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

// Регистрация
router.post('/register', async (req, res) => {
  try {
    // Ожидаем, что в теле запроса передаются: email, password, role, и, возможно, для инфлюенсеров дополнительные поля
    const { email, password, role, phone, googleId, name, profilePicture, profilePhotos, bio, socialLinks } = req.body;

    // Для упрощения проверки: если пользователь регистрируется через email/пароль, они обязательны
    if (!email || !password) {
      return res.status(400).json({ message: 'Email и пароль обязательны' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя. Дополнительные поля для инфлюенсеров будут сохранены, если role === 'influencer'
    const newUser = new User({
      email,
      password: hashedPassword,
      role: role || 'user',
      phone,
      googleId,
      // Если роль influencer, сохраняем данные профиля (иначе они будут undefined)
      name: role === 'influencer' ? name : undefined,
      profilePicture: role === 'influencer' ? profilePicture : undefined,
      profilePhotos: role === 'influencer' ? profilePhotos : undefined,
      bio: role === 'influencer' ? bio : undefined,
      socialLinks: role === 'influencer' ? socialLinks : undefined,
      // По умолчанию для инфлюенсера verificationStatus = 'not_submitted'
      verificationStatus: role === 'influencer' ? 'not_submitted' : undefined
    });

    await newUser.save();
    res.status(201).json({ message: 'Пользователь зарегистрирован', user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Логин
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Неверные учетные данные' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Неверные учетные данные' });

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

const passport = require('passport');
// Маршруты Google OAuth
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user._id, role: req.user.role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1h' }
    );
    res.json({ message: 'Google login successful', user: req.user, token });
  }
);
