module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['jasmine'],
    files: ['lib/**/*.js', 'src/**/*.js', 'spec/**/*Spec.js'],
    exclude: [],
    singleRun: true,
    browsers: ['PhantomJS'],
    reporters: ['progress', 'coverage'],
    preprocessors: {'src/**/*.js': ['coverage']},
    coverageReporter: {
      type: 'lcovonly',
      dir: 'coverage/'
    }
  });
};
