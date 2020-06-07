const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
if (!fs.existsSync('./ssl-gen/https-config.gen.js')) {
  console.error("https-config.gen.js missing. Please see readme on how to generate the certs needed for SSL")
}

module.exports = {
  entry: {
    setup: './src/entry/setup.jsx',
    index: './src/entry/index.jsx',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['*', '.js', '.jsx']
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Setup',
      template: 'src/index.html',
      filename: 'setup.html',
      chunks: ['setup']
    }),
    new HtmlWebpackPlugin({
      title: 'Main',
      template: 'src/index.html',
      filename: 'index.html',
      chunks: ['index']
    }),
  ],
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'build'),
  },
};