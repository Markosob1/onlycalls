const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  influencer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Предполагается, что модель пользователя называется 'User'
    required: true,
  },
  start_time: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['available', 'booked', 'cancelled'],
    default: 'available'
  },
}, { timestamps: true });

module.exports = mongoose.model('Slot', SlotSchema);
