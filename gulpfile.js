var gulp = require('gulp');
var path = require('path');
var replace = require('gulp-replace');
var child_process = require('child_process');
var fs = require('fs');
var shell = require('gulp-shell');
var jshint = require('gulp-jshint');
var jshStylish = require('jshint-stylish');
var exec = require('child_process').exec;
var runSequence = require('run-sequence');
var prompt = require('gulp-prompt');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var gutil = require('gulp-util');
var notifier = require('node-notifier');
var derequire = require('gulp-derequire');
var version;

var browserifyOpts = {
  entries: './src/index.js',
  debug: true,
  standalone: 'cytoscape-expand-collapse'
};

var logError = function( err ){
  notifier.notify({ title: 'cytoscape-expand-collapse', message: 'Error: ' + err.message });
  gutil.log( gutil.colors.red('Error in watch:'), gutil.colors.red(err) );
};

gulp.task('build', function(){
  return browserify( browserifyOpts )
    .bundle()
    .on( 'error', logError )
    .pipe( source('cytoscape-expand-collapse.js') )
    .pipe( buffer() )
    .pipe( derequire() )
    .pipe( gulp.dest('.') )
});

gulp.task('default', ['build'], function( next ){
  next();
});

gulp.task('publish', [], function( next ){
  runSequence('confver', 'lint', 'pkgver', 'push', 'tag', 'npm', next);
});

gulp.task('confver', ['version'], function(){
  return gulp.src('.')
    .pipe( prompt.confirm({ message: 'Are you sure version `' + version + '` is OK to publish?' }) )
  ;
});

gulp.task('version', function( next ){
  var now = new Date();
  version = process.env['VERSION'];

  if( version ){
    done();
  } else {
    exec('git rev-parse HEAD', function( error, stdout, stderr ){
      var sha = stdout.substring(0, 10); // shorten so not huge filename

      version = [ 'snapshot', sha, +now ].join('-');
      done();
    });
  }

  function done(){
    console.log('Using version number `%s` for building', version);
    next();
  }

});

gulp.task('pkgver', ['version'], function(){
  return gulp.src([
    'package.json',
    'bower.json'
  ])
    .pipe( replace(/\"version\"\:\s*\".*?\"/, '"version": "' + version + '"') )

    .pipe( gulp.dest('./') )
  ;
});

gulp.task('push', shell.task([
  'git add -A',
  'git commit -m "pushing changes for v$VERSION release" || echo Nothing to commit',
  'git push || echo Nothing to push'
]));

gulp.task('tag', shell.task([
  'git tag -a $VERSION -m "tagging v$VERSION"',
  'git push origin $VERSION'
]));

gulp.task('npm', shell.task([
  'npm publish .'
]));

// http://www.jshint.com/docs/options/
gulp.task('lint', function(){
  return gulp.src( 'cytoscape-*.js' )
    .pipe( jshint({
      funcscope: true,
      laxbreak: true,
      loopfunc: true,
      strict: true,
      unused: 'vars',
      eqnull: true,
      sub: true,
      shadow: true,
      laxcomma: true
    }) )

    .pipe( jshint.reporter(jshStylish) )

    .pipe( jshint.reporter('fail') )
  ;
});
