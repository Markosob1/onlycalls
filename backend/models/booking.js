const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bookingSchema = new mongoose.Schema({
  bookingNumber: { type: String, unique: true, default: () => uuidv4() },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'CallSlot', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  influencer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  paymentIntentId: { type: String },
  amountPaid: { type: Number, required: true },
  commissionTaken: { type: Number }
}, { timestamps: true }); // Автоматически добавляются createdAt и updatedAt

module.exports = mongoose.model('Booking', bookingSchema);
