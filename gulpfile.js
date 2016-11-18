const path = require('path')
const gulp = require('gulp');
const connect = require('gulp-connect');
const rollup = require('rollup').rollup;
const imagemin = require('gulp-imagemin');
const ghPages = require('gulp-gh-pages');
const Jimp = require('jimp');
const gutil = require('gulp-util');
const through = require('through2');

const DEBUG = process.env.NODE_ENV === 'development';

const TILE_WIDTH = 500;
const TILE_HEIGHT = 500;

gulp.task('build:html', () => gulp.src('./src/**/*.html')
  .pipe(gulp.dest('./dist'))
  .pipe(connect.reload()));

gulp.task('watch:html', () => gulp.watch('./src/**/*.html', ['build:html']));

gulp.task('build:js', () => rollup({
  entry: 'src/index.js',
  plugins: [
    require('rollup-plugin-node-resolve')({ jsnext: true }),
    require('rollup-plugin-commonjs')(),
    require('rollup-plugin-babel')({
      exclude: 'node_modules/**'
    }),
    !DEBUG && require('rollup-plugin-uglify')()
  ]
}).then(bundle => bundle.write({
  format: 'iife',
  dest: 'dist/index.js'
})).then(() => gulp.src('dist/index.js')
  .pipe(connect.reload()))
);

gulp.task('watch:js', () => gulp.watch('./src/**/*.js', ['build:js']));

gulp.task('build:images', () => gulp.src('./src/**/*.png')
  .pipe(imagemin([
    imagemin.optipng({ optimizationLevel: 5 })
  ]))
  .pipe(gulp.dest('./dist'))
  .pipe(connect.reload()));

gulp.task('watch:images', () => gulp.watch('./src/**/*.png', ['build:images']));

// TODO: Read maze JSON files to find images to slice?
gulp.task('build:tiles', () => gulp.src('./src/mazes/Firefox.png')
  .pipe(sliceTiles('mazes'))
  .pipe(gulp.dest('./dist')));

gulp.task('watch:tiles', () => gulp.watch('./src/mazes/Firefox.png', ['build:tiles']));

function sliceTiles(basePath) {
  function collect(file, enc, cb) {
    const stream = this;

    Jimp.read(file.contents, (err, image) => {
      if (err) {
        console.error('Failed to process', file.path, err);
        cb();
      }

      const tileBasePath = path.join(basePath, path.basename(file.path, '.png'));

      const cols = Math.ceil(image.bitmap.width / TILE_WIDTH);
      const rows = Math.ceil(image.bitmap.height / TILE_HEIGHT);

      const tasks = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          tasks.push({row, col});
        }
      }

      const process = () => {
        const task = tasks.shift();
        if (!task) { return cb(); }

        const tilePath = path.join(tileBasePath, `${task.row}x${task.col}.png`);

        const slice = image.clone();
        slice.crop(task.col * TILE_WIDTH, task.row * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
        slice.getBuffer(Jimp.MIME_PNG, (err, buf) => {
          if (err) {
            console.error(`Failed to slice ${tilePath}`, err);
          } else {
            stream.push(new gutil.File({path: tilePath, contents: buf}));
          }
          gutil.log(`Sliced tile ${tilePath}`);
          process();
        });
      };
      process();
    })
  }

  return through.obj(collect);
}

gulp.task('build', ['build:js', 'build:html', 'build:images', 'build:tiles']);

gulp.task('watch', ['watch:js', 'watch:html', 'watch:images', 'watch:tiles']);

gulp.task('self-watch', () => gulp.watch('gulpfile.js', process.exit));

gulp.task('server', () => connect.server({
  root: 'dist',
  livereload: true,
  host: 'localhost',
  port: '9000'
}));

gulp.task('deploy', ['build'], () => gulp.src('./dist/**/*').pipe(ghPages()));

gulp.task('default', ['build', 'watch', 'self-watch', 'server']);
