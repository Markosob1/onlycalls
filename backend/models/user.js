const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Базовые данные регистрации
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Хэшированный пароль
  // Дополнительные способы регистрации
  phone: { type: String },
  googleId: { type: String },

  // Роль пользователя: обычный пользователь, инфлюенсер или администратор
  role: { type: String, enum: ['user', 'influencer', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false }, // Флаг подтверждения регистрации

  // Дополнительные поля для инфлюенсеров
  // Эти поля актуальны только если role === 'influencer'
  name: { type: String },
  profilePicture: { type: String },  // URL основного изображения профиля
  profilePhotos: [{ type: String }],   // Массив URL дополнительных фотографий
  bio: { type: String },
  socialLinks: {
    instagram: { type: String },
    facebook: { type: String },
    youtube: { type: String },
    twitter: { type: String }
  },
  // Поля для верификации инфлюенсера
  verificationStatus: { 
    type: String, 
    enum: ['not_submitted', 'pending', 'approved', 'rejected'], 
    default: 'not_submitted' 
  },
  verificationDocuments: [{ type: String }] // URL или пути к документам

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
