'use strict';

const webpack = require('webpack');

module.exports = {
  entry:  './src/src.js',
  output: {
    filename: './public/bundle.js',
  },
  target: "web",

  // Enable sourcemaps for debugging webpack's output.
  devtool: 'source-map',

  resolve: {
    extensions: ['.webpack.js', '.web.js', '.js'],
  },
};
