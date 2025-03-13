// backend/routes/payment.js
const express = require('express');
const bodyParser = require('body-parser');
const Booking = require('../models/booking');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Роутер для создания Payment Intent (использует JSON-парсер)
const payRouter = express.Router();
payRouter.post('/pay', async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      description: 'Оплата за звонок OnlyCalls',
      metadata: { integration_check: 'accept_a_payment' }
    });
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error("Ошибка при создании Payment Intent:", error);
    res.status(500).json({ error: error.message });
  }
});

// Роутер для обработки вебхука Stripe (использует raw-парсер)
const webhookRouter = express.Router();
webhookRouter.post(
  '/',
  bodyParser.raw({
    type: function (req) {
      // Обрабатываем типы, содержащие application/json, даже с charset
      return req.headers['content-type'] && req.headers['content-type'].includes('application/json');
    }
  }),
  (req, res) => {
    // Отладочные логи: вывод заголовков и raw тела запроса
    console.log('Headers:', req.headers);
    console.log('Raw body as string:', req.body.toString());

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // req.body здесь является Buffer – как требуется для проверки подписи
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log('Получено событие вебхука:', event.type);
    } catch (err) {
      console.error('Ошибка проверки подписи вебхука:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Обработка различных событий
    if (event.type === 'payment_intent.created') {
      console.log('Payment Intent создан, ID:', event.data.object.id);
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log('Платеж успешно завершён (Payment Intent), ID:', paymentIntent.id);
      Booking.findOneAndUpdate(
        { paymentIntentId: paymentIntent.id },
        { paymentStatus: 'paid' },
        { new: true }
      )
        .then(updatedBooking => {
          if (updatedBooking) {
            console.log("Статус бронирования обновлен на 'paid' для booking:", updatedBooking.bookingNumber);
          } else {
            console.log("Не найдено бронирование для PaymentIntent:", paymentIntent.id);
          }
        })
        .catch(err => console.error("Ошибка обновления бронирования:", err));
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentError = event.data.object;
      console.error('Платеж не удался (Payment Intent), ID:', paymentError.id);
    } else if (event.type === 'charge.succeeded') {
      const charge = event.data.object;
      console.log('Charge succeeded, ID:', charge.id);
      if (charge.payment_intent) {
        Booking.findOneAndUpdate(
          { paymentIntentId: charge.payment_intent },
          { paymentStatus: 'paid' },
          { new: true }
        )
          .then(updatedBooking => {
            if (updatedBooking) {
              console.log("Статус бронирования обновлен на 'paid' для booking (charge.succeeded):", updatedBooking.bookingNumber);
            } else {
              console.log("Не найдено бронирование для PaymentIntent (charge.succeeded):", charge.payment_intent);
            }
          })
          .catch(err => console.error("Ошибка обновления бронирования по charge.succeeded:", err));
      }
    } else if (event.type === 'charge.updated') {
      const charge = event.data.object;
      console.log('Charge updated, ID:', charge.id);
      // Если charge обновился и теперь возвращен, обновляем статус бронирования
      if (charge.refunded === true) {
        Booking.findOneAndUpdate(
          { paymentIntentId: charge.payment_intent },
          { paymentStatus: 'refunded' },
          { new: true }
        )
          .then(updatedBooking => {
            if (updatedBooking) {
              console.log("Статус бронирования обновлен на 'refunded' для booking (charge.updated):", updatedBooking.bookingNumber);
            } else {
              console.log("Не найдено бронирование для PaymentIntent (charge.updated):", charge.payment_intent);
            }
          })
          .catch(err => console.error("Ошибка обновления бронирования по charge.updated:", err));
      } else {
        console.log("Обновление charge не требует действий:", charge.id);
      }
    } else {
      console.log(`Не обрабатываемое событие: ${event.type}`);
    }

    res.json({ received: true });
  }
);

module.exports = { payRouter, webhookRouter };
