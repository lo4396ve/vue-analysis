# mount

前面的_init方法已经为挂载做好了准备，下面分析一下具体是如何挂载的。

开发过vue项目的应该都比较熟悉项目入口有一个main.js文件
```
new Vue({
  render: h => {
    return h(App)
  },
}).$mount('#app')
```
这个$mount方法就是暴露出来用于挂载实例的。许多地方都定义了$mount方法，有在原型上直接定义的$mount方法，还有在platform目录下各个不同打包入口也重新定义了$mount方法。之所以这样设计，是把一些通用的逻辑定义在原型上的$mount，针对不同环境，再扩展对应环境需要的特有逻辑。

platform/web/entry-runtime.js
```
import Vue from './runtime/index'

export default Vue
```
我们重点研究的runtime-only版本的入口文件并没有扩展和重写原型上定义的$mount方法，查看原型上的$mount方法，原型$mount定义在platform/web/runtime/index.js:
```
import Vue from 'core/index'
import { mountComponent } from 'core/instance/lifecycle'
import {
  query,
} from 'web/util/index'
Vue.prototype.$mount = function (
  el
) {
  el = el && query(el);
  return mountComponent(this, el)
}
```
$mount方法接受 el参数，它表示挂载的元素，可以是字符串，也可以是 DOM 对象，如果是字符串在浏览器环境下会调用 query 方法转换成 DOM 对象，最后再调用mountComponent方法，定义在mysrc/core/instance/lifecycle.js 文件中
```
export function mountComponent (
  vm,
  el,
) {
  vm.$el = el
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode
  }
  // callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if */
  updateComponent = () => {
    vm._update(vm._render())
  }

  updateComponent();

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  function noop() {}
  new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted && !vm._isDestroyed) {
        // callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
  

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true
    // callHook(vm, 'mounted')
  }
  return vm
}
```
这段代码的核心是updateComponent，创建一个渲染Watcher，Watcher的逻辑会在后面介绍响应式的章节分析，目前只需要知道Watcher的内部会调用updateComponent就足够了。而updateComponent方法中会调用vm._update方法，vm._update方法接受vm._render方法的返回结果作为参数，实际上vm._render方法返回的就是虚拟dom（VNode）。下面就开始分析_render方法的实现。