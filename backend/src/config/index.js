const path = require('path');

module.exports = {
    PORT: process.env.PORT || 5000,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    GAS_WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbzgpa00-3FTV3F6OPgWkIUg2hqh39bz8vcllDWKA6lzc-ott3mqkv1du8-lO0ncWa4/exec',
    AUTH_INFO_PATH: path.join(__dirname, '../../auth_info'),
    QR_TIMEOUT: 10000, // 10 seconds
    QR_CHECK_INTERVAL: 500, // 500ms
    MAX_QR_ATTEMPTS: 20
}; 