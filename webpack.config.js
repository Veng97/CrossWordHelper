const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: [
    './app/main.js',
    './app/main.css',
  ], 
  output: {
    clean: true, // Clean the output directory before emitting files
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './app/index.html',
      inject: 'body', // Inject scripts at the bottom of the body
    }),
    new HtmlInlineScriptPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader', 
          'css-loader', 
        ],
      },
      {
        test: /\.(png|jpe?g|gif|ico|svg)$/i,
        type: 'asset/inline', // Inline images as base64
      },
    ],
  },
};