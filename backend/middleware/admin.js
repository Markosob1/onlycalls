// backend/middleware/admin.js
module.exports = function(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  } else {
    return res.status(403).json({ message: 'Доступ запрещен. Администраторские права требуются.' });
  }
};
