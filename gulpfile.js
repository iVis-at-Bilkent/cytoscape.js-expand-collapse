const {series, dest, src} = require('gulp');
const watch = require('gulp-watch');
const replace = require('gulp-replace');
const {task} = require('gulp-shell');
const jshint = require('gulp-jshint');
const jshStylish = require('jshint-stylish');
const exec = require('child_process').exec;
const prompt = require('gulp-prompt');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const gutil = require('gulp-util');
const notifier = require('node-notifier');
const derequire = require('gulp-derequire');
let version_number;

var browserifyOpts = {
  entries: './src/index.js',
  debug: true,
  standalone: 'cytoscape-expand-collapse'
};

var logError = function (err) {
  notifier.notify({title: 'cytoscape-expand-collapse', message: 'Error: ' + err.message});
  gutil.log(gutil.colors.red('Error in watch:'), gutil.colors.red(err));
};

function build() {
  return browserify(browserifyOpts)
    .bundle()
    .on('error', logError)
    .pipe(source('cytoscape-expand-collapse.js'))
    .pipe(buffer())
    .pipe(derequire())
    .pipe(dest('.'))
}

// watch for changes in files, run build immediately
const dev = series(build, function () {
  watch('src/*.js', () => {
    build()
  });
});

const confver = series(version, function () {
  return src('.')
    .pipe(prompt.confirm({message: 'Are you sure version `' + version_number + '` is OK to publish?'}));
});

function version(next) {
  var now = new Date();
  version_number = process.env['VERSION'];

  if (version_number) {
    done();
  } else {
    exec('git rev-parse HEAD', function (error, stdout, stderr) {
      var sha = stdout.substring(0, 10); // shorten so not huge filename

      version_number = ['snapshot', sha, +now].join('-');
      done();
    });
  }

  function done() {
    console.log('Using version number `%s` for building', version_number);
    next();
  }
}

const pkgver = series(version, function () {
  return src([
    'package.json',
    'bower.json'
  ])
    .pipe(replace(/\"version\"\:\s*\".*?\"/, '"version": "' + version_number + '"'))
    .pipe(dest('./'));
})

const push = task([
  'git add -A',
  'git commit -m "pushing changes for v$VERSION release" || echo Nothing to commit',
  'git push || echo Nothing to push'
]);

const tag = task([
  'git tag -a $VERSION -m "tagging v$VERSION"',
  'git push origin $VERSION'
]);

const npm = task([
  'npm publish .'
]);

// http://www.jshint.com/docs/options/
function lint() {
  return src('cytoscape-*.js')
    .pipe(jshint({
      funcscope: true,
      laxbreak: true,
      loopfunc: true,
      strict: true,
      unused: 'vars',
      eqnull: true,
      sub: true,
      shadow: true,
      laxcomma: true
    }))

    .pipe(jshint.reporter(jshStylish))

    .pipe(jshint.reporter('fail'))
    ;
}

exports.default = build;
exports.build = build;
exports.version = version;
exports.lint = lint;
exports.publish = series(confver, pkgver, push, tag, npm)

exports.npm = npm;
exports.tag = tag;
exports.dev = dev;
