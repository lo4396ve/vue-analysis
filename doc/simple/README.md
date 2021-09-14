

## 介绍

[简易版的源码地址](https://github.com/lo4396ve/vue-analysis/tree/simple)，打开mysrc目录阅读即可。

简易版vue并不是我按照自己的想法随便写的一个迷你版的vue。是完全从vue源码中抽取的一个基础骨架，打包出来的源码如果放到一个vue项目中，仅能保证把静态页面渲染出来，最基础的data响应式绑定也不支持。这个版本的目的是为了能更清楚的了解vue源码的整体结构，学习一个庞大的系统，从整体到局部是一个比较好的方法。


## 抽取过程
简单分析如何从vue源码中提取出这个简易版本的。
### 分析入口
从入口下手，前面的章节已经分析过了，打包入口文件在 platform/web/entry-runtime.js，打开该文件
```
import Vue from './runtime/index'
export default Vue
```
继续寻找./runtime/index：
```
import Vue from 'core/index'
import { mountComponent } from 'core/instance/lifecycle'
import { query } from 'web/util/index'
import { patch } from './patch'

Vue.prototype.__patch__ = patch;

Vue.prototype.$mount = function (el) {
  el = el && query(el);
  return mountComponent(this, el)
}

export default Vue
```
先忽略其他代码，只看这部分，Vue是从core/index引入的，并且在Vue原型上扩展了__parch__方法和$mount方法，这两个方法都是与渲染组件相关，其逻辑后面再分析。先继续寻找core/index。

打开src/core/index.js
```
import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'

initGlobalAPI(Vue)

Vue.version = '__VERSION__'

export default Vue
```
从./instance/index引入Vue，然后执行了initGlobalAPI方法，先不管initGlobalAPI，继续挖./instance/index：
```
function Vue (options) {
  // init方法啊在initMixin被定义
  this._init(options)
}
```
终于找到了Vue的定义。代码很简洁，只执行了this._init方法。这也是作者的一个设计思路，Vue本质是一个Function构造方法，它的原型 prototype 以及它本身都扩展了一系列的方法和属性，在扩展的方法里面处理其他的逻辑。

## 工具包

源码提供了很多工具方法，比如isObject判断是否对象类型的方法，我们的重点并不在他们身上，所以对于工具目录不做太多分析，也没有抽离里面的方法，整个目录复制过去。

工具目录：
* shared // shared提供浏览器端和服务端是通用的方法
* src/core/util // 在创建操作Vue实例和操作VNode（虚拟dom）时用到的一些工具方法
* src/core/instance/render-helpers // 提供与渲染render相关的辅助工具，后面用到的时候具体再分析
* src/core/vdom/helpers // vdom管理着虚拟dom（VNode），而vdom/helpers提供了与虚拟dom有关的方法，比如判断组件是否动态组件
* platform/web/util // 专门提供给web浏览器端使用的工具方法，比如判断一个标签是不是html标准标签

## 运行
克隆[简易版源码](https://github.com/lo4396ve/vue-analysis/tree/simple)到本地，切换到simple分支，执行
```
npm install
npm run dev:esm
```
在dist目录下会生成vue.runtime.esm.js。

用vue-cli创建一个vue2.x版本的项目vue-project，把vue.runtime.esm.js放在vue-project项目的src目录下，修改main.js和APP.vue
```
// main.js
import Vue from './vue.runtime.esm.js'
import App from './App.vue'
new Vue({
  render: h => {
    return h(App)
  },
}).$mount('#app')

// APP.vue
<template>
  <div id="app">
    <div>测试</div>
  </div>
</template>
<script>
export default {
  data() {
    return {}
  }
}
</script>
```
运行vue-project项目，APP.vue渲染成功说明vue.runtime.esm.js是没有问题的。
