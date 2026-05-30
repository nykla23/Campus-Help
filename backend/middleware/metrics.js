const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics({timeout: 5000});

const httpRequestCounter = new client.Counter({
    name: 'http_request_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});


const metricsEndpoint = (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(client.register.metrics());
};

const httpRequestErrors = new client.Counter({
    name: 'http_request_errors_total',
    help: 'Total number of HTTP request errors',
    labelNames: ['method', 'route', 'status_code']
});

const activeUsers = new client.Gauge({
    name: 'active_users',
    help: 'Number of currently active users (based on WebSocket connections)'
});

const metricsMiddleware = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path || req.url;
        const method = req.method;
        const status = res.statusCode;
        
        httpRequestCounter.inc({ method, route, status_code: status });
        httpRequestDuration.observe({ method, route, status_code: status }, duration);
        if (status >= 400) {
            httpRequestErrors.inc({ method, route, status_code: status });
        }
    });
    
    next();
};

function updateActiveUsers(count) {
    activeUsers.set(count);
}


module.exports = {
    metricsMiddleware,
    metricsEndpoint,
    updateActiveUsers
};