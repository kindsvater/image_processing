/**
 * Starts `nodemon` and `browser-sync`
 */

const path = require('path');
const fs = require('fs');
const nodemon = require('nodemon');
const browserify = require('browserify');
const watchify = require('watchify');

const SRCDIR = path.normalize(`${__dirname}/src`);
const BUILDDIR = path.normalize(`${__dirname}/public/build`);
const SERVEDIR = path.normalize(`${__dirname}/server`);
const PUBLICDIR = path.normalize(`${__dirname}/public`);


//let browserSyncInitialized = false;

nodemon({
  script: `${SERVEDIR}/app.js`,
  watch: [
    `${SRCDIR}`,
    `${SERVEDIR}`,
    `${PUBLICDIR}`
  ],
  ext: 'js,json,html,css'
});

let b = browserify({
  cache: {},
  packageCache: {},
  plugin: [watchify],
  entries: [
    `${SRCDIR}/index.js`
  ]
})

let bundle = function() {
  b.bundle()  
    .on('error', function(err) {
      console.error(`BROWSERIFY ERROR: ${err.message}`);
      console.error(err.stack);
      this.emit('end');
    })
    .pipe(fs.createWriteStream(`${BUILDDIR}/bundle.js`))
};

b.on('update', bundle);
b.on('log', console.log);
bundle();

nodemon
  .on('start', function() {
    console.log('Nodemon started');
  })
  .on('quit', function() {
    console.log('Nodemon stopped');
    process.exit(0);
  })
  .on('restart', function(files) {
    console.log('Nodemon restarted');
  });