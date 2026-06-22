const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const upload = require('../utils/upload');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

const logAction = require('../utils/logger');

// GET all products (with filters & pagination)
router.get('/', async (req, res) => {
  try {
    const { brand, scale, minPrice, maxPrice, search, manufacturer, carBrand, featured, sort, ids, page = 1, limit = 25 } = req.query;
    let query = {}; 

    // IDs Filter (for Cart Sync)
    if (ids) {
        query._id = { $in: ids.split(',') };
    } 

    // Status handling
    if (req.query.includeHidden === 'true') {
        if (req.query.status && req.query.status !== 'All') query.status = req.query.status;
    } else {
        if (req.query.status && req.query.status !== 'Active') {
             query.status = req.query.status;
        } else {
             query.status = 'Active';
        }
    }
    
    // Stock Status Filter
    if (req.query.stockStatus === 'in_stock') {
        query.stock = { $gt: 0 };
    } else if (req.query.stockStatus === 'out_of_stock') {
        query.stock = { $lte: 0 };
    }

    // Featured Filter
    if (featured === 'true') {
        query.isFeatured = true;
    }

    // Filtering
    if (manufacturer) query.manufacturer = { $in: manufacturer.split(',') };
    if (carBrand) query.carBrand = { $in: carBrand.split(',') };
    if (scale) query['attributes.scale'] = { $in: scale.split(',') };
    if (brand) query['attributes.brand'] = brand; // Legacy

    // Price
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    // Search (Partial Match)
    if (search) {
       query.$or = [
           { name: { $regex: search, $options: 'i' } },
           { manufacturer: { $regex: search, $options: 'i' } },
           { carBrand: { $regex: search, $options: 'i' } },
           { sku: { $regex: search, $options: 'i' } }
       ];
    }

    let sortOption = { createdAt: -1 };
    if (req.query.sortBy) {
        // Admin Sort
        const order = req.query.sortOrder === 'asc' ? 1 : -1;
        sortOption = { [req.query.sortBy]: order };
    } else if (sort === 'bestsellers') {
        sortOption = { soldCount: -1 };
    } else if (sort === 'price_asc') {
        sortOption = { price: 1 };
    } else if (sort === 'price_desc') {
        sortOption = { price: -1 };
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
        .sort(sortOption)
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    res.json({
        products,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET Metadata (Brands/Manufacturers) for Filters
router.get('/meta', async (req, res) => {
    try {
        const manufacturers = await Product.distinct('manufacturer', { status: 'Active' });
        const carBrands = await Product.distinct('carBrand', { status: 'Active' });
        let scales = await Product.distinct('attributes.scale', { status: 'Active' });
        scales = scales.filter(s => s && s.trim() !== '');
        
        const minMax = await Product.aggregate([
            { $match: { status: 'Active' } },
            { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } }
        ]);
        
        const minPrice = minMax.length > 0 ? minMax[0].minPrice : 0;
        const maxPrice = minMax.length > 0 ? minMax[0].maxPrice : 10000;
        
        res.json({ manufacturers, carBrands, scales, minPrice, maxPrice });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const slugify = (text) => {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// POST new product
router.post('/', async (req, res) => {
  try {
    let productData = req.body;
    
    // Auto-generate slug if missing
    if (!productData.slug && productData.name) {
        let baseSlug = slugify(productData.name);
        productData.slug = baseSlug;
        
    }

    const newProduct = new Product(productData);
    await newProduct.save();
    
    await logAction('ECOMMERCE', 'PRODUCT_CREATED', { username: 'Admin' }, { name: newProduct.name, sku: newProduct.sku });
    
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT Bulk Discount products
router.put('/bulk-discount', async (req, res) => {
    try {
        const { percentage, filters } = req.body;
        
        if (!percentage || percentage <= 0 || percentage >= 100) {
            return res.status(400).json({ error: 'Valid percentage between 1 and 99 is required' });
        }

        let query = {};
        if (filters) {
            if (filters.ids && filters.ids.length > 0) query._id = { $in: filters.ids };
            if (filters.brand) query['attributes.brand'] = Object.prototype.toString.call(filters.brand) === '[object Array]' ? { $in: filters.brand } : filters.brand;
            if (filters.manufacturer) query.manufacturer = { $in: filters.manufacturer };
            if (filters.carBrand) query.carBrand = { $in: filters.carBrand };
            if (filters.scale) query['attributes.scale'] = { $in: filters.scale };
            
            if (filters.minPrice || filters.maxPrice) {
                query.price = {};
                if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
                if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
            }
            if (filters.stockStatus === 'in_stock') query.stock = { $gt: 0 };
            else if (filters.stockStatus === 'out_of_stock') query.stock = { $lte: 0 };
            
            if (filters.status) query.status = filters.status;
        }

        const multiplier = 1 - (percentage / 100);
        
        const result = await Product.updateMany(
            query,
            [
                { $set: { price: { $round: [{ $multiply: ["$price", multiplier] }, 0] } } }
            ]
        );

        await logAction('ECOMMERCE', 'BULK_DISCOUNT_APPLIED', { username: 'Admin' }, { percentage, filters, modifiedCount: result.modifiedCount });

        res.json({ message: `Successfully discounted ${result.modifiedCount} products.`, modifiedCount: result.modifiedCount });

    } catch (err) {
        console.error("Bulk discount error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST Upload Images to Product
router.post('/:id/images', upload.array('images', 10), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        if (!product.images) product.images = [];
        
        const newImages = [];
        for (const file of req.files) {
            const ext = path.extname(file.originalname) || '.jpg';
            const uniqueSuffix = crypto.randomBytes(8).toString('hex') + '-' + Date.now();
            const filename = 'prod-' + uniqueSuffix + ext;
            const absolutePath = path.join(__dirname, '../public/uploads/products', filename);
            
            await sharp(file.buffer)
                .resize(1440, 1440, { fit: 'inside', withoutEnlargement: true })
                .toFile(absolutePath);
            
            newImages.push(`/uploads/products/${filename}`);
        }
        
        product.images.push(...newImages);
        
        if (product.images.length > 10) {
            const overflow = product.images.slice(10);
            overflow.forEach(imgPath => {
                const absolutePath = path.join(__dirname, '../public', imgPath);
                if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
            });
            product.images = product.images.slice(0, 10);
        }
        
        await product.save();
        res.json(product);
    } catch (err) {
        console.error("Image upload error:", err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE Specific Image from Product
router.delete('/:id/images/:imageIndex', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const index = parseInt(req.params.imageIndex, 10);
        if (isNaN(index) || index < 0 || index >= product.images.length) {
            return res.status(400).json({ error: 'Invalid image index' });
        }

        const imgPath = product.images[index];
        const absolutePath = path.join(__dirname, '../public', imgPath);
        
        // Remove from DB
        product.images.splice(index, 1);
        await product.save();

        // Remove from Disk
        if (imgPath.startsWith('/uploads/products')) {
             if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
        }

        res.json(product);
    } catch (err) {
        console.error("Image Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// PUT Update product
router.put('/:id', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id, 
      { $set: req.body }, 
      { new: true }
    );
    
    await logAction('ECOMMERCE', 'PRODUCT_UPDATED', { username: 'Admin' }, { name: updatedProduct.name, changes: Object.keys(req.body) });

    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE Product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (product.images && product.images.length > 0) {
        product.images.forEach(imgPath => {
            if (imgPath.startsWith('/uploads/products')) {
                const absolutePath = path.join(__dirname, '../public', imgPath);
                if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
            }
        });
    }

    await Product.findByIdAndDelete(req.params.id);
    
    await logAction('ECOMMERCE', 'PRODUCT_DELETED', { username: 'Admin' }, { id: req.params.id });

    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single product by slug
router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    product.stats.viewsLastHour += 1;
    await product.save();
    
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
