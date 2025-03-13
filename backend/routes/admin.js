// backend/routes/admin.js
const express = require('express');
const router = express.Router(); // Объявляем router сразу
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin'); // Подключаем admin middleware
const Booking = require('../models/booking');
const User = require('../models/user');
const CallSlot = require('../models/callSlot');
const sendEmail = require('../utils/sendEmail'); // Импортируем функцию отправки email

// Тестовый маршрут для проверки подключения админ-маршрутов
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes работают!' });
});

// Получение всех бронирований (для админ-панели)
router.get('/admin/bookings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('slot')
      .populate('user', 'email phone')
      .populate('influencer', 'email name');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновление комиссии для инфлюенсера
router.patch('/admin/influencers/:id/commission', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const influencerId = req.params.id;
    const { commissionPercentage } = req.body;
    const influencer = await User.findByIdAndUpdate(
      influencerId,
      { commissionPercentage },
      { new: true }
    );
    if (!influencer) return res.status(404).json({ message: 'Инфлюенсер не найден' });
    res.json({ message: 'Комиссия обновлена', influencer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение списка заявок на верификацию (статус "pending")
router.get('/admin/verification', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const applications = await User.find({ role: 'influencer', verificationStatus: 'pending' });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновление статуса заявки на верификацию (одобрение/отклонение)
router.patch('/admin/verification/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { verificationStatus } = req.body; // ожидается 'approved' или 'rejected'
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { verificationStatus, isVerified: verificationStatus === 'approved' },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'Инфлюенсер не найден' });
    
    // Отправляем уведомление по email в зависимости от нового статуса
    if (updatedUser.verificationStatus === 'approved') {
      sendEmail(
        updatedUser.email,
        "Верификация прошла успешно",
        "Поздравляем! Ваша заявка на верификацию была одобрена. Теперь вы имеете доступ ко всем функциям платформы."
      ).catch(err => console.error("Ошибка при отправке email:", err));
    } else if (updatedUser.verificationStatus === 'rejected') {
      sendEmail(
        updatedUser.email,
        "Верификация отклонена",
        "К сожалению, ваша заявка на верификацию была отклонена. Пожалуйста, свяжитесь с поддержкой для получения дополнительной информации."
      ).catch(err => console.error("Ошибка при отправке email:", err));
    }
    
    res.json({ message: 'Статус верификации обновлен', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение расширенной аналитики с фильтрацией по периоду
router.get('/admin/analytics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Параметры периода можно передать через query, например: ?startDate=2025-03-01&endDate=2025-03-31
    const { startDate, endDate } = req.query;
    let matchCriteria = {};
    if (startDate || endDate) {
      matchCriteria.createdAt = {};
      if (startDate) {
        matchCriteria.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchCriteria.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Общая статистика пользователей
    const totalUsers = await User.countDocuments({});
    const totalInfluencers = await User.countDocuments({ role: 'influencer' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    
    // Агрегация звонков для каждого пользователя (количество бронирований)
    const callsPerUser = await Booking.aggregate([
      { $match: matchCriteria },
      { $group: { _id: "$user", callCount: { $sum: 1 } } }
    ]);
    
    // Детальная аналитика для инфлюенсеров: подсчитываем звонки, общую сумму дохода, среднюю стоимость звонка и комиссию платформы
    const influencerAnalytics = await Booking.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: "$influencer",
          callCount: { $sum: 1 },
          totalEarnings: { $sum: "$amountPaid" },
          avgCallCost: { $avg: "$amountPaid" },
          totalCommission: { $sum: "$commissionTaken" }
        }
      }
    ]);
    
    // Общая статистика бронирований
    const totalBookings = await Booking.countDocuments(matchCriteria);
    const bookingsList = await Booking.find(matchCriteria);
    const totalRevenue = bookingsList.reduce((sum, booking) => sum + (booking.amountPaid || 0), 0);
    
    res.json({
      users: {
        total: totalUsers,
        influencers: totalInfluencers,
        admins: totalAdmins,
        callsPerUser // массив объектов { _id: <userId>, callCount: <число звонков> }
      },
      influencers: influencerAnalytics, // массив объектов { _id: <influencerId>, callCount, totalEarnings, avgCallCost, totalCommission }
      bookings: {
        total: totalBookings,
        totalRevenue: totalRevenue / 100 // если сумма хранится в центах
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
