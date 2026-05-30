const winston = require('winston');
const { combine, timestamp, json, errors } = winston.format;

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp(),
        errors({ stack: true }), // 记录错误堆栈
        json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/app.log' })
    ]
});

if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
