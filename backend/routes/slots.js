const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');
const CallSlot = require('../models/callSlot');

// Создание слота звонка (для инфлюенсеров)
router.post(
  '/slots',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      // Проверяем, что пользователь аутентифицирован
      if (!req.user) {
        return res.status(401).json({ message: 'Неавторизованный доступ' });
      }
      // Используем данные инфлюенсера из req.user
      const influencer = req.user;
      if (influencer.role !== 'influencer') {
        return res.status(403).json({ message: 'Доступ запрещен: только инфлюенсеры могут создавать слоты' });
      }
      if (!influencer.isVerified) {
        return res.status(400).json({ message: 'Инфлюенсер не верифицирован' });
      }

      const { startTime, endTime, price, duration } = req.body;
      const start = new Date(startTime);
      const end = new Date(endTime);
      const now = new Date();

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Неверный формат даты' });
      }
      if (start >= end) {
        return res.status(400).json({ message: 'Время начала должно быть меньше времени окончания' });
      }
      if (start <= now) {
        return res.status(400).json({ message: 'Слот должен быть запланирован на будущее' });
      }

      const allowedDurations = [15, 30, 45, 60, 90];
      if (!allowedDurations.includes(duration)) {
        return res.status(400).json({ message: 'Длительность слота должна быть одной из: 15, 30, 45, 60, 90 минут' });
      }

      // Атомарная проверка пересечений через транзакцию
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const overlappingSlot = await CallSlot.findOne({
          influencer: influencer._id,
          startTime: { $lt: end },
          endTime: { $gt: start }
        }).session(session);

        if (overlappingSlot) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ message: 'Новый слот пересекается с уже существующим' });
        }

        const newSlot = new CallSlot({
          influencer: influencer._id,
          startTime: start,
          endTime: end,
          price,
          duration,
          status: 'available'
        });
        await newSlot.save({ session });
        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({ message: 'Слот создан', slot: newSlot });
      } catch (transError) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ error: transError.message });
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// Получение всех доступных слотов
router.get(
  '/slots',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const slots = await CallSlot.find().populate('influencer', 'username email');
      res.json(slots);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Обновление слота (если он ещё доступен)
router.put(
  '/slots/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Неавторизованный доступ' });
      }
      const influencer = req.user;
      const slot = await CallSlot.findById(req.params.id);

      if (!slot) {
        return res.status(404).json({ message: 'Слот не найден' });
      }
      if (slot.influencer.toString() !== influencer._id.toString()) {
        return res.status(403).json({ message: 'Нет доступа для редактирования этого слота' });
      }
      if (slot.status !== 'available') {
        return res.status(400).json({ message: 'Слот нельзя обновить, так как он уже забронирован или отменен' });
      }

      const { startTime, endTime, price, duration } = req.body;
      const start = new Date(startTime);
      const end = new Date(endTime);
      const now = new Date();

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Неверный формат даты' });
      }
      if (start >= end) {
        return res.status(400).json({ message: 'Время начала должно быть меньше времени окончания' });
      }
      if (start <= now) {
        return res.status(400).json({ message: 'Слот должен быть запланирован на будущее' });
      }
      const allowedDurations = [15, 30, 45, 60, 90];
      if (!allowedDurations.includes(duration)) {
        return res.status(400).json({ message: 'Длительность слота должна быть одной из: 15, 30, 45, 60, 90 минут' });
      }

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const overlappingSlot = await CallSlot.findOne({
          _id: { $ne: slot._id },
          influencer: influencer._id,
          startTime: { $lt: end },
          endTime: { $gt: start }
        }).session(session);

        if (overlappingSlot) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ message: 'Новый временной интервал пересекается с другим слотом' });
        }

        slot.startTime = start;
        slot.endTime = end;
        slot.price = price;
        slot.duration = duration;
        await slot.save({ session });
        await session.commitTransaction();
        session.endSession();
        return res.status(200).json({ message: 'Слот обновлен', slot });
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: err.message });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

// Отмена слота (если он ещё доступен)
router.post(
  '/slots/:id/cancel',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Неавторизованный доступ' });
      }
      const influencer = req.user;
      const slot = await CallSlot.findById(req.params.id);

      if (!slot) {
        return res.status(404).json({ message: 'Слот не найден' });
      }
      if (slot.influencer.toString() !== influencer._id.toString()) {
        return res.status(403).json({ message: 'Нет доступа для отмены этого слота' });
      }
      if (slot.status !== 'available') {
        return res.status(400).json({ message: 'Слот нельзя отменить, так как он уже забронирован или отменен' });
      }
      slot.status = 'cancelled';
      await slot.save();
      return res.status(200).json({ message: 'Слот отменен', slot });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
