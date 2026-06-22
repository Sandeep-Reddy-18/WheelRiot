const express = require('express');
const router = express.Router();
const Log = require('../models/Log');

// Get Logs (with filtering)
router.get('/', async (req, res) => {
  try {
    const { type, page = 1, limit = 50 } = req.query;
    let query = {};
    if (type) query.type = type;

    const total = await Log.countDocuments(query);
    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('actor.userId', 'username email');
      
    res.json({
        logs,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Log (Internal or Manual)
router.post('/', async (req, res) => {
  try {
    const newLog = new Log(req.body);
    await newLog.save();
    res.status(201).json(newLog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
