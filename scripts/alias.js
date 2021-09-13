const path = require('path')

const resolve = p => path.resolve(__dirname, '../', p)

// module.exports = {
//   vue: resolve('src/platforms/web/entry-runtime-with-compiler'),
//   compiler: resolve('src/compiler'),
//   core: resolve('src/core'),
//   shared: resolve('src/shared'),
//   web: resolve('src/platforms/web'),
//   weex: resolve('src/platforms/weex'),
//   server: resolve('src/server'),
//   sfc: resolve('src/sfc')
// }

module.exports = {
  vue: resolve('mysrc/platforms/web/entry-runtime-with-compiler'),
  compiler: resolve('mysrc/compiler'),
  core: resolve('mysrc/core'),
  shared: resolve('mysrc/shared'),
  web: resolve('mysrc/platforms/web'),
  weex: resolve('mysrc/platforms/weex'),
  server: resolve('mysrc/server'),
  sfc: resolve('mysrc/sfc')
}
