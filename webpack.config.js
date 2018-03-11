// webpack.config.js
var Encore = require('@symfony/webpack-encore');

Encore
// the project directory where all compiled assets will be stored
    .setOutputPath('build/')

    // the public path used by the web server to access the previous directory
    .setPublicPath('/build')

    // will create public/build/app.js and public/build/app.css
    .addEntry('app', './js/app.js')

    .addStyleEntry('style', './scss/style.scss')

    // allow sass/scss files to be processed
    .enableSassLoader()

    // allow legacy applications to use $/jQuery as a global variable
    .autoProvidejQuery()

    .enableSourceMaps(!Encore.isProduction())

    // empty the outputPath dir before each build
    .cleanupOutputBeforeBuild()

    // show OS notifications when builds finish/fail
    .enableBuildNotifications()

// create hashed filenames (e.g. app.abc123.css)
    .enableVersioning(Encore.isProduction())

    .addLoader({ test: /\.njk$/, loader: 'nunjucks-loader' })
;

let webpackConfig = Encore.getWebpackConfig();

webpackConfig.node = { fs: 'empty' };

module.exports = webpackConfig;
