"use strict";

const { src, dest, watch, series } = require('gulp');
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const sourcemap = require('gulp-sourcemaps');
const csso = require('gulp-csso');
const rename = require('gulp-rename');
const browsersync = require('browser-sync').create();
const autoprefixer = require('gulp-autoprefixer');
const imagemin = require('gulp-imagemin');
const del = require('del');
const webp = require('gulp-webp');
const tildeImporter = require('node-sass-tilde-importer');
const webpack = require('webpack-stream');


function clean() {
    return del('build');
}

function copy() {
    return src([
        "source/fonts/**/*.{woff,woff2}",
        "source/images/**",
        "source/js/**"
        ], {
          base: "source"
        })
      .pipe(dest("build"));
}

function styles() {
    return src("source/sass/style.scss")
        .pipe(plumber())
        .pipe(sourcemap.init())
        .pipe(sass({
            importer: tildeImporter
        },
        {
            outputStyle: 'compressed'
        }))
        .pipe(autoprefixer({
            overrideBrowserslist: ['> 1%'],
            grid: true
        }))
        .pipe(csso())
        .pipe(rename("style.min.css"))
        .pipe(sourcemap.write("."))
        .pipe(dest("build/css"))
        .pipe(browsersync.stream());
}

function html() {
    return src("source/*.html")
    .pipe(dest("build"));
}

function server() {
    browsersync.init({
        server: "build/"
    });
    
    watch(["source/sass/**/*.{scss,sass}"], styles);
    watch(["source/*.html"], series(html, refresh));
    watch(["source/js/**/*.js"], buildJs);
}

function refresh(done) {
    browsersync.reload();
    done();
}

function buildJs() {
    return src("./source/js/script.js")
        .pipe(webpack({
            mode: 'development',
            output: {
                filename: 'script.js'
            },
            watch: false,
            devtool: "source-map",
            module: {
                rules: [
                    {
                        test: /\.m?js$/,
                        exclude: /(node_modules|bower_components)/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [['@babel/preset-env', {
                                    debug: true,
                                    corejs: 3,
                                    useBuiltIns: "usage"
                                }]]
                            }
                        }
                    }
                ]
            }
        }))
        .pipe(dest("build/js"))
        .pipe(browsersync.stream());
}

function buildProductionJs() {
    return src("./source/js/script.js")
        .pipe(webpack({
            mode: 'production',
            output: {
                filename: 'script.min.js'
            },
            module: {
                rules: [
                    {
                        test: /\.m?js$/,
                        exclude: /(node_modules|bower_components)/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [['@babel/preset-env', {
                                    corejs: 3,
                                    useBuiltIns: "usage"
                                }]]
                            }
                        }
                    }
                ]
            }
        }))
        .pipe(dest("build/js"));
}

function images() {
    return src('source/images/**/*')
    .pipe(imagemin([
        imagemin.gifsicle({interlaced: true}),
        imagemin.mozjpeg({quality: 75, progressive: true}),
        imagemin.optipng({optimizationLevel: 5}),
        imagemin.svgo({
            plugins: [
                {removeViewBox: true},
                {cleanupIDs: false}
            ]
        })
    ]))
    .pipe(dest('build/images'))
}

function webpImages() {
    return src("source/images/**/*.{png,jpg}")
      .pipe(webp({quality: 80}))
      .pipe(dest("build/images"));
}

exports.styles = styles;
exports.html = html;
exports.refresh = refresh;
exports.server = server;
exports.images = images;
exports.webpImages = webpImages;
exports.clean = clean;
exports.copy = copy;
exports.buildJs = buildJs;
exports.buildProductionJs = buildProductionJs;

exports.build = series(clean, copy, styles, html, buildJs);
exports.start = series(clean, copy, styles, html, buildJs, server);