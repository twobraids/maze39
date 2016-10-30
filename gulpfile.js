const gulp = require('gulp');
const connect = require('gulp-connect');
const rollup = require('rollup').rollup;

gulp.task('build:html', () => gulp.src('./src/**/*.html')
  .pipe(gulp.dest('./dist'))
  .pipe(connect.reload()));

gulp.task('watch:html', () => gulp.watch('./src/**/*.html', ['build:html']));

gulp.task('build:js', () => rollup({
  entry: 'src/index.js',
  plugins: [
    require('rollup-plugin-node-resolve')({ jsnext: true }),
    require('rollup-plugin-commonjs')()
  ]
}).then(bundle => bundle.write({
  format: 'iife',
  dest: 'dist/index.js'
})).then(() => gulp.src('dist/index.js')
  .pipe(connect.reload()))
);

gulp.task('watch:js', () => gulp.watch('./src/**/*.js', ['build:js']));

gulp.task('build:images', () => gulp.src('./src/**/*.png')
  .pipe(gulp.dest('./dist'))
  .pipe(connect.reload()));

gulp.task('watch:images', () => gulp.watch('./src/**/*.png', ['build:images']));

gulp.task('build', ['build:js', 'build:html', 'build:images']);

gulp.task('watch', ['watch:js', 'watch:html', 'watch:images']);

gulp.task('self-watch', function() {
    gulp.watch('gulpfile.js', process.exit);
});

gulp.task('server', () => connect.server({
  root: 'dist',
  livereload: true,
  host: '0.0.0.0',
  port: '9000'
}));

gulp.task('default', ['build', 'watch', 'self-watch', 'server']);
