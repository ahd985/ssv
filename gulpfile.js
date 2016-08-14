var gulp        = require('gulp');
var browserify  = require('browserify');
var babelify    = require('babelify');
var source      = require('vinyl-source-stream');
var buffer      = require('vinyl-buffer');
var uglify      = require('gulp-uglify');
var sourcemaps  = require('gulp-sourcemaps');
var sass = require('gulp-sass');

gulp.task('build', function () {
    return browserify({entries: './ssv/static/js/source/ssv_main.es6', debug: true, standalone:'ssv'})
        .transform("babelify", { presets: ["es2015"] })
        .bundle()
        .pipe(source('ssv.min.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest('./ssv/static/js'))
});

gulp.task('watch', ['build'], function () {
    gulp.watch('./ssv/static/js/source/*.es6', ['build']);
});

gulp.task('sass', function () {
  return gulp.src('./ssv/static/css/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./ssv/static/css'));
});

gulp.task('sass:watch', function () {
  gulp.watch('./ssv/static/css/*.scss', ['sass']);
});

gulp.task('default', ['build', 'watch', 'sass', 'sass:watch']);