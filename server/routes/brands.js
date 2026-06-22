const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');

// Get All
router.get('/', async (req, res) => {
    try {
        const brands = await Brand.find().sort({ name: 1 });
        res.json(brands);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create
router.post('/', async (req, res) => {
    try {
        const brand = await Brand.create(req.body);
        res.status(201).json(brand);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update
router.put('/:id', async (req, res) => {
    try {
        const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(brand);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete
router.delete('/:id', async (req, res) => {
    try {
        await Brand.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
