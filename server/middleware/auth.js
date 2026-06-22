const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token = req.header('x-auth-token');

  if (!token && req.header('Authorization') && req.header('Authorization').startsWith('Bearer ')) {
      token = req.header('Authorization').split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    req.user = decoded; 
    
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.isAdmin)) {
    next();
  } else {
    res.status(403).json({ msg: 'Admin authorization denied' });
  }
};

module.exports = { protect, admin };
