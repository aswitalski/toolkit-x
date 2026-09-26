module.exports = {
  colors: true,
  diff: true,
  extension: ['.js'],
  package: './package.json',
  reporter: 'spec',
  require: ['./test/config/init.js'],
  slow: 250,
  sort: true,
  timeout: 2000,
  ui: 'bdd',
  'watch-files': ['src/**/*.js', 'test/**/*.js'],
}
