const gulp = require('gulp');
const connect = require('gulp-connect');
const rollup = require('rollup').rollup;
const imagemin = require('gulp-imagemin');
const ghPages = require('gulp-gh-pages');

const DEBUG = process.env.NODE_ENV === 'development';

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
      exclude: 'node_modules/**',
      presets: 'es2015-rollup'
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

gulp.task('build', ['build:js', 'build:html', 'build:images']);

gulp.task('watch', ['watch:js', 'watch:html', 'watch:images']);

gulp.task('self-watch', () => gulp.watch('gulpfile.js', process.exit));

gulp.task('server', () => connect.server({
  root: 'dist',
  livereload: true,
  host: '0.0.0.0',
  port: '9000'
}));

gulp.task('deploy', ['build'], () => gulp.src('./dist/**/*').pipe(ghPages()));

gulp.task('default', ['build', 'watch', 'self-watch', 'server']);
