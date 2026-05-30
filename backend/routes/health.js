const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

const db = require('../config/db');

router.get('/', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: 'unknown'
        }
    };

    try {
        await db.query('SELECT 1');
        health.services.database = 'ok';
    } catch (err) {
        health.status = 'degraded';
        health.services.database = 'down';
        logger.error({ message: '数据库连接失败', error: err });
    }

    const httpStatus = health.status === 'ok' ? 200 : 503;
    res.status(httpStatus).json(health);
});

module.exports = router;