const PageConfig = require('../models/PageConfig');
const Order = require('../models/Order');

let activeUsers = new Map();

const trackTraffic = async (req, res, next) => {
    try {
        const ip = req.ip || req.connection.remoteAddress;
        activeUsers.set(ip, Date.now());
        
        const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
        for (const [key, lastSeen] of activeUsers.entries()) {
            if (lastSeen < fifteenMinsAgo) activeUsers.delete(key);
        }

        if (!activeUsers.has(ip)) {
            await PageConfig.findOneAndUpdate(
                { key: 'site_stats' },
                { $inc: { 'value.totalVisits': 1 } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }
        
        activeUsers.set(ip, Date.now());
        
        next();
    } catch (err) {
        console.error("Traffic Error:", err);
        next();
    }
};

const getStats = async () => {
    let stats = await PageConfig.findOne({ key: 'site_stats' });
    if (!stats) {
        stats = await PageConfig.create({ key: 'site_stats', value: { totalVisits: 0 } });
    }
    
    const salesAgg = await Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalSales = salesAgg[0]?.total || 0;

    const activeOrders = await Order.countDocuments({ status: { $nin: ['Delivered', 'Cancelled'] } });

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const salesTrend = await Order.aggregate([
        { $match: { createdAt: { $gte: last7Days }, status: { $nin: ['Cancelled'] } } },
        { $group: { 
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
            sales: { $sum: "$totalAmount" },
            orders: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCollectedAgg = await Order.aggregate([
        { $match: { 
            createdAt: { $gte: today }, 
            'payment.status': { $in: ['Paid', 'Success'] }
        }},
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const todayCollected = todayCollectedAgg[0]?.total || 0;

    const todayShippingAgg = await Order.aggregate([
        { $match: { 
            createdAt: { $gte: today }, 
            status: { $nin: ['Cancelled'] }
        }},
        { $group: { _id: null, total: { $sum: "$shipping.cost" } } }
    ]);
    const todayShippingSpent = todayShippingAgg[0]?.total || 0;

    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });

    return {
        traffic: stats.value.totalVisits || 0,
        activeUsers: activeUsers.size,
        totalSales,
        activeOrders,
        deliveredOrders,
        salesTrend,
        todayCollected,
        todayShippingSpent
    };
};

module.exports = { trackTraffic, getStats, activeUsers };
