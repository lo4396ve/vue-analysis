# 侦听器watch
前面介绍了两种watcher，`render watcher`和`computed watcher`，还有一种是用户自己写的watch，解析的时候最终也会创建Watcher实例，称为`user watcher`。这一节在computed分支（计算属性版本）基础上添加侦听器的源码，切换到watch分支即可查看[完整代码](https://github.com/lo4396ve/vue-analysis/tree/watch)。

### 侦听器使用方法
还是先回顾[官方watch文档](https://cn.vuejs.org/v2/guide/computed.html#%E4%BE%A6%E5%90%AC%E5%99%A8),查看watch如何使用的

``` js
var vm = new Vue({
  data: { 
    firstName: 'zhang', 
    lastName: 'san', 
    userInfo: { age: 18 },
    sex: '0'
  },
  watch: {
    firstName: function (newVal, oldVal) { /* ... */ },

    lastName: {
      handler: function (val, oldVal) { /* ... */ },
      deep: true,
      immediate: true,
    },

    'userInfo.age': function (newVal, oldVal) { /* ... */ },

    sex: [
      'handle1',
      function handle2(newVal, oldVal) { /* ... */ },
    ]
  },
})
```
或者还可以直接使用vm.$watch方法
``` js
// 键路径
vm.$watch('userInfo.age', function (newVal, oldVal) { /* ... */ }, { deep: true, immediate: true })

vm.$watch('userInfo.age', {
  handler: function (val, oldVal) { /* ... */ },
  deep: true,
  immediate: true
})

// 函数
vm.$watch(
  function () {
    // 表达式 `this.a + this.b` 每次得出一个不同的结果时
    // 处理函数都会被调用。
    // 这就像监听一个未被定义的计算属性
    return this.a + this.b
  },
  function (newVal, oldVal) {
    // 做点什么
  }
)
```

并且vm.$watch 返回一个取消观察函数，用来停止触发回调
``` js
var unwatch = vm.$watch('firstName', callback)
// 之后取消观察
unwatch();
```

侦听器可以写在vue实例中，也可以使用$watch方法，其实在初始化阶段，写在vue实例中的watch最终也会在实例化时调用$watch方法。watch支持直接传一个函数，也可以传一个具有handler、deep、immediate属性的对象，甚至支持'userInfo.age'类型的key，下面就开始分析侦听器源码的实现逻辑。

### 源码分析


*首先切换到watch分支*

##### 初始化过程

打开mysrc/core/instacne/state.js，找到initState方法
``` js {10-12}
export function initState (vm) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch) {
    initWatch(vm, opts.watch)
  }
}
```
添加了initWatch方法处理侦听器
``` js
function initWatch (vm, watch) {
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}
```

首先遍历watch，根据key获取handler，如果handler是数组遍历handler并依次调用createWatcher方法，否则直接调用createWatcher方法。

``` js
function createWatcher (
  vm,
  expOrFn,
  handler,
  options
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}
```
createWatcher方法接受四个参数，vm表示vue实例，expOrFn是watch的属性键名key，表示需要被侦听的数据，expOrFn可以接受字符串和函数类型，handler表示被侦听的数据变化时需要执行的回调方法，options是包含了deep、immediate属性的对象。

由于watch多样化的使用方法，handler可能是一个对象，也可能是一个函数，甚至是一个字符串，根据类型的不同获取真正的回调函数作为handler，最后调用vm.$watch方法创建`user watcher`

vm.$watch定义在stateMixin方法中
``` js {3-24}
export function stateMixin (Vue) {
  ...
  Vue.prototype.$watch = function (
    expOrFn,
    cb,
    options
  ) {
    const vm = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      const info = `callback for immediate watcher "${watcher.expression}"`
      pushTarget()
      invokeWithErrorHandling(cb, vm, [watcher.value], vm, info)
      popTarget()
    }
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
```
\$watch方法接受三个参数，首先判断cb是否一个对象，正常用户写在watch中的侦听器经过createWatcher方法的解析，传给$watch方法的cb已经是真正的回调方法了，但是用户可以手动调用vm.$watch方法，它可以传递一个对象，也可以传递函数，如果是对象则调用createWatcher方法。接着执行`new Watcher(vm, expOrFn, cb, options)`创建watcher实例，由于options.user=true，所以称这个watcher为`user watcher`。

##### 依赖收集
接着分析一下被侦听的数据收集的当前`user watcher`的过程（或者说`user watcher`是如何订阅侦听数据的变化的）。创建Watcher传了4个参数，vm是实例，expOrFn是被侦听的属性名，cb是回调方法，options是额外参数。

打开mysrc/core/observer/watcher.js，回顾一下watcher构造函数的逻辑
``` js
export default class Watcher {
  constructor (
    vm,
    expOrFn,
    cb,
    options,
    isRenderWatcher
  ) {
    this.vm = vm
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.dirty = this.lazy // for lazy watchers
    
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }
  
  get () {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }
}
```

上面只贴出了与`user watcher`相关的代码。constructor内部先解析了expOrFn参数。假设用户使用`vm.$watch('userInfo.age', callback)`方式，expOrFn的值就是`'userInfo.age'`，然后执行parsePath解析expOrFn。
parsePath在mysrc/core/util/lang.js文件中定义
``` js
export function parsePath (path) {
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
```
parsePath内部先使用split('.')方法把`'userInfo.age'`解析成数组，最后返回一个函数，obj实际上就是vm实例，最终在vm实例对象中依次访问到`vm.userInfo.age`的值。

再回到Watcher的constructor方法中，经过解析this.getter最终就是一个可以获取被侦听数据的函数，由于lazy的值为false，最后执行this.get方法。this.get内部还是首先执行pushTarget(this)，把当前计算的watcher传给Dep.target，然后执行this.getter获取`userInfo.age`的值，`userInfo.age`此时已经是响应式的数据，便会触发其getter方法实现对`Dep.target`的依赖收集。

当被侦听的数据变化，会触发`user watcher`的update方法，最终执行cb回调方法。update的逻辑在之前Notify派发通知小节已经分析过，这里不再展开。下面重点分析一下deep和immediate的实现逻辑。

##### deep
当用户使用了deep属性
``` js
var vm = new Vue({
  data: { 
    userInfo: { age: 18 },
  },
  watch: {
    userInfo: {
      handler: function (val, oldVal) { /* ... */ },
      deep: true,
    }
  }
})
```
在Watcher的get方法中，判断如果deep为true，调用traverse方法，并传入value作为参数，这里的value就是`vm.userInfo`。traverse方法定义在mysrc/core/observer/traverse.js文件中
``` js
const seenObjects = new Set()

export function traverse (val) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}

function _traverse (val, seen) {
  let i, keys
  const isA = Array.isArray(val)
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
```

traverse内部调用了_traverse方法，_traverse的主要逻辑是递归遍历value子属性，在遍历的过程中会触发他们的getter方法而实现每层子数据都能收集依赖。

_traverse还作了一些优化工作，首先对value类型判断，如果不是数组和对象、或者数据已被冻结、或者value是VNode类型，就停止遍历，之所以判断VNode类型停止遍历，是因为watch只作用在当前vm实例中（只在当前页面或者组件有效），子节点是不需要对watch做出反应的。然后判断如果value是否有__ob__，之前的章节分析过，当数据变成响应式数据时，会为其添加`__ob__`属性它的值就是Observer实例。
``` js
export class Observer {
  constructor (value) {
    this.value = value
    this.dep = new Dep()
    def(value, '__ob__', this)
    ...
  }
}
```
创建Dep实例时，为每一个Dep实例添加了id属性
``` js
let uid = 0
export default class Dep {
  constructor () {
    this.id = uid++
    this.subs = []
    ...
  }
}
```

回到_traverse方法中，如果存在`val.__ob__`，说明val已经是一个响应式数据，利用Set数据类型缓存其`dep.id`，目的是防止重复侦听。

##### immediate

如果用户使用了immediate属性，
``` js
var vm = new Vue({
  data: { 
    userInfo: { age: 18 },
  },
  watch: {
    userInfo: {
      handler: function (val, oldVal) { /* ... */ },
      immediate: true,
    }
  }
})
```

回顾mysrc/core/instance/state.js文件中对$watch的定义
``` js {13-18}
Vue.prototype.$watch = function (
  expOrFn,
  cb,
  options
) {
  const vm = this
  if (isPlainObject(cb)) {
    return createWatcher(vm, expOrFn, cb, options)
  }
  options = options || {}
  options.user = true
  const watcher = new Watcher(vm, expOrFn, cb, options)
  if (options.immediate) {
    const info = `callback for immediate watcher "${watcher.expression}"`
    pushTarget()
    invokeWithErrorHandling(cb, vm, [watcher.value], vm, info)
    popTarget()
  }
  return function unwatchFn () {
    watcher.teardown()
  }
}
```
如果options.immediate为true，执行pushTarget方法将当前`user watcher`传给Dep.target，随后在invokeWithErrorHandling中借助`try...catch`执行cb回调函数，最后再执行`popTarget`将当前`user watcher`从dep的targetStack栈中弹出。

