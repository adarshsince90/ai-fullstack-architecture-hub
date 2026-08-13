module.exports = {
  plugins: [
    require('postcss-nested'),
    require('autoprefixer')({
      overrideBrowserslist: ['> 0.5%', 'last 2 versions', 'Firefox ESR', 'not dead']
    }),
    process.env.NODE_ENV === 'production' ? require('cssnano')({ preset: 'default' }) : null
  ].filter(Boolean)
};
