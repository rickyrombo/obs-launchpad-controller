const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: 'development',
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
  devtool: 'inline-source-map',
   devServer: {
     port: 443,
     contentBase: './dist',
     index: 'index.html',
     https: {
       key: fs.readFileSync('C:\\Users\\me\\localhost_key.pem'),
       cert: fs.readFileSync('C:\\Users\\me\\localhost.crt')
     }
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
    new CopyWebpackPlugin([
      { from: 'static' }
    ])
  ],
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};