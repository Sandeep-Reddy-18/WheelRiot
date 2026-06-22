require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Review = require('./models/Review');
const Setting = require('./models/Setting');
const Log = require('./models/Log');
const Coupon = require('./models/Coupon');
const Brand = require('./models/Brand');
const PageConfig = require('./models/PageConfig');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hooligan';

const resetDB = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        console.log('Wiping all collections...');
        await User.deleteMany({});
        await Product.deleteMany({});
        await Order.deleteMany({});
        await Review.deleteMany({});
        await Setting.deleteMany({});
        await Log.deleteMany({});
        await Coupon.deleteMany({});
        await Brand.deleteMany({});
        await PageConfig.deleteMany({});
        console.log('Collections cleared.');

        console.log('Creating default Admin account...');
        const adminUser = new User({
            fullName: 'Admin',
            email: 'admin@wheelriot.in',
            passwordHash: 'password', 
            role: 'admin',
            isVerified: true
        });
        await adminUser.save();
        console.log('Setup Complete: admin@wheelriot.in Default Password: password');

        console.log('Creating default Settings...');
        const defaultSettings = [
            { key: 'shipRocketEnabled', value: false },
            { key: 'razorpayEnabled', value: false },
            { key: 'shipRocketPickupPincode', value: '' },
            { key: 'shipRocketEmail', value: '' },
            { key: 'shipRocketPassword', value: '' },
            { key: 'shipRocketPickupLocation', value: 'Primary' },
            { key: 'razorpayKeyId', value: '' },
            { key: 'razorpaySecret', value: '' },
            { key: 'razorpayWebhookSecret', value: '' },
            { key: 'discordWebhookUrl', value: '' },
            { key: 'discordWebhookContent', value: 'New Order Received! 🚀' },
            { key: 'shippingFlatRate', value: 40 },
            { key: 'shippingFreeThreshold', value: 1000 },
            { key: 'shippingPremiumSurcharge', value: 150 }
        ];
        await Setting.insertMany(defaultSettings);
        console.log('Default Settings generated.');

        console.log('Initializing Page Configurations...');
        const defaultPageConfigs = [
            { key: 'site_stats', value: { totalVisits: 0 } }
        ];
        await PageConfig.insertMany(defaultPageConfigs);
        console.log('Page Configurations initialized.');

        console.log('Database reset finished.');
        process.exit(0);
    } catch (err) {
        console.error('Database Reset Error:', err);
        process.exit(1);
    }
};

resetDB();
