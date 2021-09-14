# Watcher
下面看一下Watcher的实现，打开mysrc/core/observer/watcher.js
```
export default class Watcher {
  constructor (
    vm,
    expOrFn,
    cb,
    options,
    isRenderWatcher
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
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
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
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

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
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
   * Add a dependency to this directive.
   */
  addDep (dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
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

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          const info = `callback for watcher "${this.expression}"`
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
```

Watcher定义了一些与dep相关的方法，单存看Watcher的逻辑比较难理解，结合之前的updateComponent方法分析逻辑就会比较清晰，在Vue的mount过程中，mountComponent函数预留的一段代码：
```
let updateComponent
  
updateComponent = () => {
  vm._update(vm._render())
}

new Watcher(vm, updateComponent, noop, {
  before () {
    if (vm._isMounted && !vm._isDestroyed) {
      // callHook(vm, 'beforeUpdate')
    }
  }
}, true /* isRenderWatcher */)
```
new Watcher传了五个参数，第一个是当前实例vm，第二个是updateComponent，第三个是一个空函数noop，第四个是一个对象，包含了一个before钩子函数，第五个参数是用来通知Watcher当前创建的是一个renderWatcher。

还记得最一开始的那个形象的比喻，watcher代表具有专项技能的工具人，那renderWatcher的意思就是代表当前是一个具备render渲染功能的watcher，所有需要执行渲染逻辑的地方都得通过renderWatcher，而data响应式就是当数据变化是执行渲染逻辑，所以每一个响应式的data数据都需要把renderWatcher收集起来，当数据发生变化是通过拦截set方法执行renderWatcher的渲染逻辑。赋予renderWatcher渲染功能，就是通过传给Watcher的第二个参数updateComponent实现的。

实际上面new Watcher时，在Watcher内部的执行逻辑是首先解析传进来的参数，expOrFn参数有两种类型情况，可以是function类型也可以是String类型，expOrFn传字符串的情况后面再分析，现在expOrFn传的就是updateComponent函数，所以this.getter = expOrFn，最后由于lazy的值为false，执行this.get方法。

在this.get方法内部执行了pushTarget(this)方法，this就是当前创建的renderWatcher实例对象。再回顾一下dep定义的pushTarget方法：
```
export function pushTarget (target) {
  targetStack.push(target)
  Dep.target = target
}
```
通过pushTarget方法，使得Dep.target静态属性指向当前renderWatcher实例对象，然后执行this.getter方法，上面已经知道this.getter方法就是传进来的updateComponent方法，这时候开始执行updateComponent方法
```
updateComponent = () => {
  vm._update(vm._render())
}
```
updateComponent会执行_render方法，_render方法会访问data中的数据，由于这时data已经是响应式数据，所以会触发数据对象的getter。每个数据对象在执行defineReactive时都持有一个dep实例，在get方法中会执行dep.depend()方法，也就是Dep.target.addDep(this)，此时Dep.target是renderWatcher实例对象，回顾在Watcher中定义的addDep方法：
```
addDep (dep) {
  const id = dep.id
  if (!this.newDepIds.has(id)) {
    this.newDepIds.add(id)
    this.newDeps.push(dep)
    if (!this.depIds.has(id)) {
      dep.addSub(this)
    }
  }
}
```
关于newDepIds的作用后面再分析，首先判断是否已经收集过当前Watcher，保证不重复收集，最后调用dep.addSub(this)方法，this就是当前wathcer实例，也就是把当前的 watcher 订阅到这个数据持有的 dep 的 subs 中。

实现收集依赖之后判断调deep如果为true，则调用traverse方法，这个方法使用递归的方式访问value的子属性，使得子属性也完成依赖收集。

然后执行popTarget方法：
```
export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
```
在dep中还维护了一个targetStack栈，在vue组件嵌套的情况下，在处理父子节点过程中，先实例化父节点然后再实例化子节点，所以先创建了父组件的renderWatcher，再创建子组件的renderWatcher，而_render是从子到父节点的过程，先执行子节点的_render再执行父节点的_render。父子节点的renderWatcher依次压入targetStack栈，渲染阶段先执行子节点的_render，也就触发了子节点的依赖收集，此时收集的正是子节点的renderWatcher，子节点渲染收集完成，targetStack弹出栈顶，Dep.target等于父节点的renderWatcher，这时父节点data收集的是父节点的renderWatcher。 很巧妙的用了数据结构栈的原理实现了整个收集过程。

最后还有一个步骤执行cleanupDeps清楚依赖。
```
cleanupDeps () {
  let i = this.deps.length
  while (i--) {
    const dep = this.deps[i]
    if (!this.newDepIds.has(dep.id)) {
      dep.removeSub(this)
    }
  }
  let tmp = this.depIds
  this.depIds = this.newDepIds
  this.newDepIds = tmp
  this.newDepIds.clear()
  tmp = this.deps
  this.deps = this.newDeps
  this.newDeps = tmp
  this.newDeps.length = 0
}
```