const mongoose = require('mongoose');

const callSlotSchema = new mongoose.Schema({
  influencer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, enum: [15, 30, 45, 60, 90], required: true },
  // Статус слота:
  // pending   - ожидает подтверждения/активации,
  // available - доступен для бронирования,
  // cancelled - отменён,
  // expired   - просрочен.
  status: { type: String, enum: ['pending', 'available', 'cancelled', 'expired'], default: 'available' }
}, { timestamps: true });

module.exports = mongoose.model('CallSlot', callSlotSchema);
