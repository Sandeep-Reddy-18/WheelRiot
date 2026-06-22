const Log = require('../models/Log');

/**
 * Logs an action to the database.
 * @param {string} type - 'SECURITY' | 'ADMIN_ACTION' | 'ECOMMERCE' | 'SYSTEM'
 * @param {string} action - Short code e.g., 'PRODUCT_CREATE'
 * @param {object} actor - { userId, username, ip, device } or req.user
 * @param {object} details - Any metadata
 */
const logAction = async (type, action, actor, details = {}) => {
  try {
    const actorData = {
        userId: actor._id || actor.userId,
        username: actor.username || actor.name || 'Unknown',
        ipAddress: actor.ip || 'Unknown',
        device: 'Web' 
    };

    const newLog = new Log({
      type,
      action,
      actor: actorData,
      details
    });

    await newLog.save();
  } catch (err) {
    console.error(`[LOGGER FAILED] ${action}:`, err.message);
  }
};

module.exports = logAction;
