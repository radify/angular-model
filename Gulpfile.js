'use strict';

var gulp        = require('gulp');
var Server      = require('karma').Server;
var coveralls   = require('gulp-coveralls');
var jshint      = require('gulp-jshint');
var jscs        = require('gulp-jscs');
var nsp         = require('gulp-nsp');
var runSequence = require('run-sequence');

/*
 * PLEASE NOTE: run-sequence is a
 * temporary solution until the release of
 * Gulp 4.0, which contains run-sequence's
 * functionality.
 */

var paths = {
  'spec': 'spec/**/*.js',
  'src': 'src/**/*.js'
};

gulp.task('test', function(done) {
  new Server({
    configFile: __dirname + '/config/karma.conf.js',
    singleRun: true
  }, done).start();
});

gulp.task('coveralls', function() {
  gulp.src('coverage/**/lcov.info')
    .pipe(coveralls());
});

gulp.task('lint', function() {
  return gulp.src([paths.src])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('style', function() {
  return gulp.src([paths.src, paths.spec])
    .pipe(jscs())
    .pipe(jscs.reporter());
});

gulp.task('security', function(cb) {
  nsp({
    package: __dirname + '/package.json',
    stopOnError: true
  }, cb);
});

gulp.task('default', function(cb) {
  runSequence('test', ['lint', 'style', 'coveralls', 'security'], cb);
});
