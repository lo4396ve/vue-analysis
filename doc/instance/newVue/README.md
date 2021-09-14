# new Vue做了什么

本章基于[vue简易版](https://github.com/lo4396ve/vue-analysis/tree/simple)分析，建议先阅读简易版代码，后面的篇幅贴出的代码也是基于这个版本，如果没有读过简易版，也可以在本地看着vue源码跟随后面文章节奏，因为它们的逻辑是一样的，只不过简易版忽略了一些用不到的逻辑。



打开mysrc/core/instance/index.js,
```
import { initMixin } from './init'
...
function Vue (options) {
  // init方法啊在initMixin被定义
  this._init(options)
}
...

initMixin(Vue)
```
_init方法在mysrc/core/instance/init.js定义
```
export function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    console.log('_init')
    const vm = this
    // a uid
    vm._uid = uid++

    // a flag to avoid this being observed
    /*一个防止vm实例自身被观察的标志位*/
    vm._isVue = true
    // merge options 
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    vm._renderProxy = vm
    vm._self = vm
    initRender(vm)
    initState(vm)

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}
```
_init方法主要做了合并配置、初始化渲染方法、初始化watcher工作。这些工作无非是为了后续的挂载工作做准备，挂载就是把vue组件生成的虚拟挂载到浏览器页面。