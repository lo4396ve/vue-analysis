# 目录结构
打开克隆下来的vue源码。

vue使用rollup打包，不熟悉rollup也没有影响，其作用跟webpack类似，把src目录下的代码最终打包输出到dist目录。Vue源码项目本身就提供了一套完整的rollup打包平台，还提供了eslint检查机智，以及规范的Git提交日志，可以直接利用这个架子进行探索。

## src目录结构

```
src
├── compiler
├── core
├── platforms
├── server
├── sfc
└── shared
```

vue目录设计的很清晰，每个目录的功能也很明确

### compiler
如果一个vue项目能够运行，必须把vue代码转成js代码，其中包括vue模板需要解析成 ast 语法树再组建成dom树。

### core
源码核心目录，也是重点研究对象。

### platform
platform目录提供了rollup打包时的入口文件。而vue不止可以运行在浏览器，也可以运行在node（服务端渲染）和weex平台上。所以platform提供了不同平台下的多个入口文件。查看package.json的script，当执行yarn build:ssr 就会在dist目录下输出服务端渲染版的vue代码。

知道platform是干什么的，也就明确了我们应该从这个目录下手开始研究vue源码。

### server
服务端渲染相关的代码，不作为本篇研究对象。

### sfc
主要作用是把后缀为.vue的文件转成JavaScript对象。这个工具依赖上面的compiler。

### shares
提供工具类方法，这里定义的工具方法浏览器端和服务端是通用的。

## 明确研究目标
vue在浏览器、node和weex端都可以运行，这里重点研究浏览器端的vue。

在浏览器环境引入vue有两个版本，带有编译功能（with-compiler）版本和只包含运行时（runtime-only）版本。这两种版本在[官方文档](https://cn.vuejs.org/v2/guide/installation.html#%E5%AF%B9%E4%B8%8D%E5%90%8C%E6%9E%84%E5%BB%BA%E7%89%88%E6%9C%AC%E7%9A%84%E8%A7%A3%E9%87%8A)有介绍。
大部分vue项目都使用了webpack，webpack的vue-loader已经做了模板编译工作。为了减轻入手难度，暂且选择runtime-only版本作为研究对象。后面再详细了解编译相关的代码。


## 打包环境
由于vue源码项目已经提供了一个非常好的rollup打包架子，所以不妨在根目录创建mysrc目录，用来存放高仿版vue，把mysrc作为打包入口输出到dist。

简单介绍一下vue源码rollup打包环境，不作为重点展开。

### package.json
在根目录打开package.json，scripts里面有许多命令，比如"dev:esm": "rollup -w -c scripts/config.js --environment TARGET:web-runtime-esm", 执行dev:esm命令，其实就是使用rollup开始打包，并启动热更新模式方便调试，platform目录下包含许多打包入口文件，TARGET:web-runtime-esm则是可以指定使用哪个文件作为打包入口。

### 入口配置信息
在根目录打开scripts/config.js，寻找web-runtime-esm：
```
// Runtime only ES modules build (for bundlers)
'web-runtime-esm': {
  entry: resolve('web/entry-runtime.js'),
  dest: resolve('dist/vue.runtime.esm.js'),
  format: 'es',
  banner
},
```
运行dev:esm命令指定的TARGET:web-runtime-esm，这里配置了打包入口路径为web/entry-runtime.js，输出地址为dist/vue.runtime.esm.js。至于TARGET:web-runtime-esm是如何映射到scripts/config.js并寻找到web-runtime-esm配置信息的逻辑，不在本文重点研究范围，感兴趣的话可以了解一下rollup这个工具。

重点是resolve方法，同样在scripts/config.js文件找到resolve方法的定义：
```
const resolve = p => {
  const base = p.split('/')[0]
  if (aliases[base]) {
    return path.resolve(aliases[base], p.slice(base.length + 1))
  } else {
    return path.resolve(__dirname, '../', p)
  }
}
```
resolve引入资源的根路径依赖aliases，所以如果要想让打包入口地址指向mysrc，只需要去alias.js修改即可。

### 修改打包入口
在根目录找到scripts/alias.js文件，修改为：
```
const path = require('path')

const resolve = p => path.resolve(__dirname, '../', p)

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

```

为了方便查看文件输出，在根目录下找到dist目录，删掉dist目录下的所有文件；再执行npm run dev:esm命令打包入口就变成了mysrc目录，将会会在dist目录下产出vue.runtime.esm.js。目前还不能打包出vue.runtime.esm.js这个文件，因为mysrc目录下海没有任何代码。
