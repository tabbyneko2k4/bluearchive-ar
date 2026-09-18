const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
require('dotenv').config()

const createVirtualEntryPlugin = require('./entry-plugin')
const createDev8Plugin = require('./dev8-plugin')

const rootPath = process.cwd()
const distPath = path.join(rootPath, 'dist')
const srcPath = path.join(rootPath, 'src')

const basePath = process.env.BASE_PATH
  ? (process.env.BASE_PATH.endsWith('/') ? process.env.BASE_PATH : `${process.env.BASE_PATH}/`)
  : '/'

const makeTsLoader = () => ({
  test: /\.ts$/,
  loader: 'ts-loader',
  exclude: /node_modules/,
})

const makeAssetLoader = () => ({
  test: /\..*$/,
  include: [path.join(srcPath, 'assets')],
  loader: path.join(__dirname, 'asset-loader.js'),
})

const config = {
  entry: './entry.js',
  output: {
    filename: 'bundle.js',
    path: distPath,
    publicPath: basePath,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BASE_PATH': JSON.stringify(basePath),
    }),
    new HtmlWebpackPlugin({
      template: path.join(srcPath, 'index.html'),
      filename: 'index.html',
      scriptLoading: 'blocking',
      inject: false,
    }),
    new HtmlWebpackPlugin({
      template: path.join(srcPath, 'debug-studio.html'),
      filename: 'debug-studio.html',
      scriptLoading: 'blocking',
      inject: false,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(rootPath, 'node_modules/@8thwall/ecs/dist'),
          to: path.join(distPath, 'external/runtime'),
        },
        {
          from: path.join(srcPath, 'assets'),
          to: path.join(distPath, 'assets'),
          noErrorOnMissing: true,
        },
        {
          from: path.join(rootPath, 'image-targets'),
          to: path.join(distPath, 'image-targets'),
          noErrorOnMissing: true,
        },
      ],
    }),
    createVirtualEntryPlugin({
      srcDir: srcPath,
    }),
  ],
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    rules: [
      makeTsLoader(),
      makeAssetLoader(),
    ],
  },
  mode: 'production',
  context: srcPath,
  externals: {
    '@8thwall/ecs': 'window.ecs',
  },
  devServer: {
    host: '0.0.0.0',
    server: 'https',
    allowedHosts: 'all',
    open: false,
    compress: true,
    hot: true,
    liveReload: false,
    historyApiFallback: {
      rewrites: [
        { from: /^\/debug-studio/, to: '/debug-studio.html' },
      ],
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws',
      overlay: {
        warnings: false,
        errors: true,
      },
    },
  },
}

module.exports = (_, argv) => {
  if (argv.mode === 'development') {
    return {
      ...config,
      plugins: [
        ...config.plugins,
        createDev8Plugin({ src: './external/dev8/dev8.js' }),
        new CopyWebpackPlugin({
          patterns: [{
            from: path.join(rootPath, 'node_modules/@8thwall/ecs/dev8'),
            to: path.join(distPath, 'external/dev8'),
            noErrorOnMissing: true,
          }],
        }),
      ],
    }
  }

  return config
}
