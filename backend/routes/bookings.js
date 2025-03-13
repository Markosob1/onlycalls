// backend/routes/bookings.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/booking');
const CallSlot = require('../models/callSlot');
const User = require('../models/user');
const sendEmail = require('../utils/sendEmail');

// Создание бронирования
router.post('/bookings', async (req, res) => {
  try {
    console.log("Booking request body:", req.body);
    // Задаем paymentStatus по умолчанию как "pending", если не передано
    const { slotId, userId, paymentStatus = "pending", paymentIntentId } = req.body;
    console.log("slotId:", slotId, "userId:", userId, "paymentStatus:", paymentStatus);

    // Проверка на существующее бронирование для данного слота с активным статусом
    const existingBooking = await Booking.findOne({
      slot: slotId,
      paymentStatus: { $in: ['pending', 'paid'] }
    });
    if (existingBooking) {
      return res.status(400).json({ message: 'Этот слот уже забронирован' });
    }

    const slot = await CallSlot.findById(slotId).populate('influencer');
    if (!slot) {
      console.log("Slot not found for id:", slotId);
      return res.status(404).json({ message: 'Слот не найден' });
    }

    const fullPrice = slot.price;
    const commissionPercentage = slot.influencer.commissionPercentage || 30;
    const commission = (fullPrice * commissionPercentage) / 100;

    const booking = new Booking({
      slot: slotId,
      user: userId,
      influencer: slot.influencer._id,
      paymentStatus: paymentStatus,
      paymentIntentId: paymentIntentId,
      amountPaid: fullPrice,
      commissionTaken: commission
    });
    await booking.save();

    // Формирование данных для уведомления пользователя
    const callDetails = {
      bookingNumber: booking.bookingNumber,
      influencerName: slot.influencer.username,
      callDate: slot.startTime,
      callCost: `$${(fullPrice / 100).toFixed(2)}`,
      callLink: `https://onlycalls.com/call/${booking.bookingNumber}`
    };

    // Получаем email пользователя
    const userDoc = await User.findById(userId);
    const userEmail = userDoc ? userDoc.email : "user@example.com";

    // Отправляем уведомление инфлюенсеру
    await sendEmail(
      slot.influencer.email,
      "Новый звонок забронирован",
      `Ваш слот был забронирован.\nНомер бронирования: ${callDetails.bookingNumber}\nДата звонка: ${new Date(callDetails.callDate).toLocaleString()}\nСтоимость: ${callDetails.callCost}\nСсылка на звонок: ${callDetails.callLink}\nСтатус платежа: ${paymentStatus}`
    );

    // Отправляем уведомление пользователю
    await sendEmail(
      userEmail,
      "Вы забронировали звонок",
      `Спасибо за бронирование.\nНомер бронирования: ${callDetails.bookingNumber}\nДата звонка: ${new Date(callDetails.callDate).toLocaleString()}\nСтоимость звонка: ${callDetails.callCost}\nСсылка на звонок: ${callDetails.callLink}\nСтатус платежа: ${paymentStatus}`
    );

    console.log(`Отправлены уведомления на ${slot.influencer.email} и ${userEmail}`);
    res.status(201).json({ message: 'Звонок забронирован', booking, callDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Возврат платежа
router.post('/bookings/:id/refund', async (req, res) => {
  try {
    const bookingId = req.params.id;
    // Здесь можно вызвать API Stripe для реального возврата средств
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { paymentStatus: 'refunded' },
      { new: true }
    );
    if (!updatedBooking) {
      return res.status(404).json({ message: 'Бронирование не найдено' });
    }
    res.json({ message: 'Платеж возвращен', booking: updatedBooking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
