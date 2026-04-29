const jwt = require('jsonwebtoken');
const User = require('../models/User');

const addXp = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    user.xp = (user.xp || 0) + amount;
    user.level = Math.floor(user.xp / 300) + 1;
    await user.save();
  } catch (err) {}
};

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ msg: '无权限，请先登录' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) { res.status(401).json({ msg: 'Token 无效或已过期' }); }
};

const optionalAuth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) { try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch (e) {} }
    next();
};

const checkTournamentPermission = async (userId, tournamentId = null) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;
    if (user.role === 'ADM') return user;
    if (user.role === 'CHM') {
      if (tournamentId && user.chmTournamentId && user.chmTournamentId.toString() === tournamentId) return user;
      if (!tournamentId) return user;
    }
    return null;
  } catch (err) { return null; }
};

const checkMaintenancePermission = (role) => ['ADM', 'MAT'].includes(role);

module.exports = { addXp, authMiddleware, optionalAuth, checkTournamentPermission, checkMaintenancePermission };
