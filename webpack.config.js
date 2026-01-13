const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: {
            background: './background.js',
            content: './content.js',
            'popup/popup': './popup/popup.js',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].bundle.js',
            clean: true,
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [MiniCssExtractPlugin.loader, 'css-loader'],
                },
            ],
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: '[name].css',
            }),
            new CopyWebpackPlugin({
                patterns: [
                    // Manifest
                    { from: 'manifest.json', to: 'manifest.json' },
                    // Assets
                    { from: 'assets', to: 'assets' },
                    // Locales
                    { from: '_locales', to: '_locales' },
                    { from: 'locales', to: 'locales' },
                    // Popup HTML
                    { from: 'popup/popup.html', to: 'popup/popup.html' },
                    { from: 'popup/styles.css', to: 'popup/styles.css' },
                    { from: 'popup/promptLibrary.json', to: 'popup/promptLibrary.json' },
                    // Utils (needed by content scripts)
                    { from: 'utils', to: 'utils' },
                    // Selectors
                    { from: 'selectors.js', to: 'selectors.js' },
                    // Content modules (for now, copying until we refactor to ES modules)
                    { from: 'content', to: 'content' },
                    // Other files
                    { from: 'tone_instructions.json', to: 'tone_instructions.json' },
                ],
            }),
        ],
        optimization: {
            minimize: isProduction,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            drop_console: false, // Keep console for debugging
                        },
                        format: {
                            comments: false,
                        },
                    },
                    extractComments: false,
                }),
                new CssMinimizerPlugin(),
            ],
        },
        devtool: isProduction ? false : 'inline-source-map',
        resolve: {
            extensions: ['.js'],
        },
        // Chrome extensions don't use web features
        target: 'web',
    };
};
