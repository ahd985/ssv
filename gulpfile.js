var gulp        = require('gulp');
var browserify  = require('browserify');
var babelify    = require('babelify');
var source      = require('vinyl-source-stream');
var buffer      = require('vinyl-buffer');
var uglify      = require('gulp-uglify');
var sourcemaps  = require('gulp-sourcemaps');
var livereload  = require('gulp-livereload');

gulp.task('build', function () {
    return browserify({entries: './ssv/static/js/ssv.es6', debug: true, standalone:'ssv'})
        .transform("babelify", { presets: ["es2015"] })
        .bundle()
        .pipe(source('ssv.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest('./ssv/static/js'))
        .pipe(livereload());
});

gulp.task('watch', ['build'], function () {
    livereload.listen();
    gulp.watch('./ssv/static/js/*.es6', ['build']);
});

gulp.task('default', ['build', 'watch']);