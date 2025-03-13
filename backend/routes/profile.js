// backend/routes/profile.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const authMiddleware = require('../middleware/auth'); // Убедитесь, что у вас есть middleware для проверки JWT

// Получение профиля инфлюенсера
router.get('/profile/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновление профиля инфлюенсера
router.patch('/profile/:id', authMiddleware, async (req, res) => {
  try {
    // Ожидаем, что инфлюенсер передаст поля: name, profilePicture, profilePhotos, bio, socialLinks
    const updateData = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json({ message: 'Профиль обновлен', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
