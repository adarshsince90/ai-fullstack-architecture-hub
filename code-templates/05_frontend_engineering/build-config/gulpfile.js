const { src, dest, watch, series, parallel } = require('gulp');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const postcssNested = require('postcss-nested');
const cssnano = require('cssnano');

// CSS Compile Task
function styles() {
  const plugins = [
    postcssNested(),
    autoprefixer(),
    cssnano()
  ];
  return src('src/styles/**/*.css')
    .pipe(postcss(plugins))
    .pipe(dest('dist/css'));
}

// Watcher Task
function watchTask() {
  watch('src/styles/**/*.css', styles);
}

exports.styles = styles;
exports.default = series(styles, watchTask);
