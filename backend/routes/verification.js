// backend/routes/verification.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const authMiddleware = require('../middleware/auth'); // Убедитесь, что middleware реализован

// Эндпоинт для подачи заявки на верификацию инфлюенсера
router.post('/verification', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId; // Предполагается, что authMiddleware добавляет userId в req.user
    const { verificationDocuments } = req.body;
    // Обновляем статус на pending и сохраняем документы для проверки
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        verificationStatus: 'pending',
        verificationDocuments
      },
      { new: true }
    );
    res.json({ message: 'Заявка на верификацию отправлена', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
