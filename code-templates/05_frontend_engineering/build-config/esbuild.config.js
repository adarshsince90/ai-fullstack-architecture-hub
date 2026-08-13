const esbuild = require('esbuild');
const isProduction = process.env.NODE_ENV === 'production';

esbuild.build({
  entryPoints: ['src/index.jsx'],
  bundle: true,
  outfile: 'dist/bundle.js',
  minify: isProduction,
  sourcemap: !isProduction,
  target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.svg': 'text'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
}).then(() => {
  console.log('⚡ Esbuild bundling complete!');
}).catch(() => process.exit(1));
