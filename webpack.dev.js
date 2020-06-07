const merge = require('webpack-merge');
const common = require('./webpack.common.js');

const HttpsSettings = require('./ssl-gen/https-config.gen.js');
module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        port: 443,
        contentBase: './build',
        index: 'index.html',
        https: HttpsSettings
    },
})