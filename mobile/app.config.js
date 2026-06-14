const path = require('path');
const { config: loadEnv } = require('dotenv');

loadEnv({ path: path.resolve(__dirname, '../.env') });

module.exports = ({ config }) => config;
