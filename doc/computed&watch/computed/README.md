# 计算属性
前面介绍了vue响应式，并提供了data响应式版本，这一节在state分支（data响应式版本）基础上添加计算属性的源码，切换到computed分支即可查看[完整代码](https://github.com/lo4396ve/vue-analysis/tree/computed)。
### 计算属性使用方法
在分析计算属性源码之前先回顾一下[官方计算属性](https://cn.vuejs.org/v2/api/#computed)使用方法
``` js
var vm = new Vue({
  data: { firstName: 'zhang', lastName: 'san', age: 18},
  computed: {
    // 仅读取
    fullName: function () {
      return this.firstName + this.lastName
    },
    _age: {
      get: function () { return this.age + 1},
      set: function (v) {this.age = v}
    }
  }
})
```
计算属性依赖data某个值，支持直接写成函数形式，也可以写成对象形式，用户自定义get/set方法。了解完使用方式，接下来开始分析源码怎么实现的。

### 源码分析

*首先切换到computed分支*

##### 初始化过程

打开mysrc/core/instance/state.js，找到initState方法：
``` js
export function initState (vm) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
}
```
initState方法通过调用initComputed(vm, opts.computed)添加了对computed的处理逻辑。

``` js
const computedWatcherOptions = { lazy: true }
function initComputed (vm, computed) {
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  // 不考虑SSR
  const isSSR = false;

  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get

    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    }
  }
}
```
首先创建computedWatcherOptions对象，他的作用稍后分析。在initComputed方法内部遍历computed，对computed中每一个属性创建Watcher实例，保存在vm._computedWatchers中。所以每一个computed都会创建一个watcher，称这个watcher为`computed watcher`最后依次调用了defineComputed方法

``` js
export function defineComputed (
  target,
  key,
  userDef
) {
  // const shouldCache = !isServerRendering()
  // 在浏览器环境下（非SSR）isServerRendering()返回false，这里直接令shouldCache=true
  const shouldCache = true;
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }

  Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

在defineComputed接受三个参数，target就是vm实例，key是computed的一个属性，userDef是key的值，userDef是函数或者对象类型。然后根据userDef的类型创建key的描述对象sharedPropertyDefinition，主要调用createComputedGetter或者createGetterInvoker方法生成其get方法。由于浏览器环境下shouldCache值为true，所以执行的是createComputedGetter方法来生成get方法；而其set方法为空函数noop，或者用户如果自定义了set方法使用用户自定义的set方法。这也就解释了在vue中，默认情况下用户直接修改computed计算属性的值是不生效的，除非用户手动提供set方法。最后通过defineProperty把计算属性变成响应式数据，并扩展到target(vm实例)上。这也就是为什么直接使用this.xxx可以直接访问得到计算属性的值。

##### 创建getter方法

接着分析一下createComputedGetter方法是如何帮每一个计算属性创建get方法的
``` js
function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}
```
createComputedGetter接受一个参数key，也就是计算属性的key，并返回computedGetter方法作为计算属性的get方法，上面讲过在initComputed方法中，对每个计算属性都创建了一个Watcher实例，并存入到vm._computedWatchers中。首先利用key从vm._computedWatchers获取当前的Watcher实例。因为计算属性在创建Watcher实例的时候lazy属性都设为了true（const computedWatcherOptions = { lazy: true }），所以会执行watcher.evaluate()方法。


打开mysrc/core/observer/watcher.js，回顾一下Watcher的逻辑，再分析evaluate方法。
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

    // 省略中间部分代码
    ...

    this.dirty = this.lazy // for lazy watchers
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
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

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }
}
```

计算属性创建Watcher，lazy的值为true，所以new Watcher时在构造函数里面只是对参数做了解析工作，并没有执行this.get()，也没有其他逻辑。

##### 依赖收集
接下来分析计算属性`fullName`依赖的数据`firstName和lastName`收集`computed watcher`的过程，以及计算属性`fullName`收集`render watcher`的过程。

evaluate方法内部执行了this.get()方法，并且把dirty设为了false。this.get()方法内部会执行pushTarget(this)，也就会把计算属性的watcher赋给Dep.target，也就意味着当前正在计算的watcher就是这个`computed watcher`。

接着会在this.get()方法里面执行this.getter()，this.getter就是传给Watcher的expOrFn参数，也就是`return this.firstName + this.lastName`。我们知道在处理计算属性之前已经执行过initState，这时候访问会触发他们的getter，就会把当前正在计算的watcher（也就是Dep.target）添加到他们自己持有的dep，换言之就是当前的`computed watcher`订阅了firstName和lastName的变化。


> 到此为止，已经分析了computed初始化过程，以及computed与data依赖绑定的过程。初始化时，会对每一个计算属性创建一个计算属性的Watcher`computed watcher`，然后利用defineProperty使其变成响应式，并为其创建getter方法，在getter方法内部执行evaluate方法然后实现计算属性与data依赖的绑定。记住这是在计算属性的getter的方法内部执行的，也就是说如果程序不访问计算属性就不会触发其getter。非常重要的一点是initComputed和initData都是在initState内部执行的，在initState之后才执行的vm.$mount进而执行mountComponent进而创建`render Watcher`，也就是说`computed watcher`在`render Wtcher`之前创建的。当创建render Wtcher时，会执行render方法，render方法内部会访问所有的data属性，所以`firstName`持有的dep会收集`render Watcher`，`firstName`持有的dep此时收集了两个watcher，分别是`computed watcher`和`render Watcher`。但是对于计算属性来说，如果模板没有使用计算属性的值，就不会访问其值，也就不会触发其getter，所以只有模板使用的计算属性才会被`render Watcher`订阅。

##### notify 派发通知

接着分析当data数据发生变化，计算属性是如何更新的。假设`fullname`的值发生变化，则会通知订阅`fullname`的所有watcher执行update方法。打开mysrc/core/observer/watcher.js，找到update方法
``` js
update () {
  if (this.lazy) {
    this.dirty = true
  } else if (this.sync) {
    this.run()
  } else {
    queueWatcher(this)
  }
}
```
`fullname`被`computed watcher`和`render Watcher`订阅，首选执行`computed watcher`的update，计算属性的watcher的lazy为true，所以对于`computed watcher`而言，仅仅把this.dirty设为了true。随后会触发`render Watcher`的update方法，对于`render Watcher`最后会执行queueWatcher(this)。queueWatcher的逻辑在上一节分析过，其最终目的是在下一个tick中执行render渲染逻辑。在执行render时，如果模板使用了计算属性`fullName`则会触发其getter，这是才去计算fullName最新的值，如果模板没有使用

可以看到如果只有`fullname`发生改变，计算属性`fullName`并不会立即计算最新值，只有模板使用了`fullName`，才会访问并触发它的getter，这时候才开始计算最新值。这也就是为什么官方文档会说计算属性有缓存效果。