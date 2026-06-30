const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aynx_dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      plan: user.plan,
      name: user.name,
      avatar: user.avatar_url
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required.' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      req.user = null;
    }
  }
  next();
}

function requireAdmin(req, res, next) {
  const adminSecret = req.headers['x-admin-secret'] || req.query.secret;
  if (adminSecret && adminSecret === process.env.ADMIN_SECRET) {
    req.isAdmin = true;
    return next();
  }
  // Also accept admin JWT
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), JWT_SECRET);
      if (decoded.isAdmin) {
        req.user = decoded;
        req.isAdmin = true;
        return next();
      }
    } catch (_) {}
  }
  return res.status(403).json({ error: 'Admin access required.' });
}

module.exports = { signToken, signRefreshToken, requireAuth, optionalAuth, requireAdmin };
