# Notify
这一节介绍响应式系统是如何派发通知的。

回顾defineReactive方法中的set逻辑
```
Object.defineProperty(obj, key, {
  enumerable: true,
  configurable: true,
  get: function reactiveGetter () {
    ...
  },
  set: function reactiveSetter (newVal) {
    const value = getter ? getter.call(obj) : val
    if (newVal === value || (newVal !== newVal && value !== value)) {
      return
    }
    if (process.env.NODE_ENV !== 'production' && customSetter) {
      customSetter()
    }
    // #7981: for accessor properties without setter
    if (getter && !setter) return
    if (setter) {
      setter.call(obj, newVal)
    } else {
      val = newVal
    }
    childOb = !shallow && observe(newVal)
    dep.notify()
  }
})
```
判断新旧值是否发生变化，如果没变化不做处理。如果在非生产环境用户自定义了customSetter方法，执行自定义setter方法，最后通过observe(newVal)使新设置的值变成响应式数据，最关键一步是调用dep.notify()方法。

打开mysrc/core/observer/dep.js，找到notify方法
```
notify () {
  // stabilize the subscriber list first
  const subs = this.subs.slice()
  if (process.env.NODE_ENV !== 'production' && !config.async) {
    subs.sort((a, b) => a.id - b.id)
  }
  for (let i = 0, l = subs.length; i < l; i++) {
    subs[i].update()
  }
}
```
其实就是把数据收集的Watcher实例遍历执行update()方法。

在mysrc/core/observer/watcher.js中查找update方法：
```
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
```
lazy的作用与计算属性computed有关，这个后面再详细介绍，此时lazy为false，sync代表同步更新这里也不展开介绍，sync的值也为false，所以最终执行的是queueWatcher。

打开mysrc/core/observer/scheduler.js查看queueWatcher方法
```
const queue = []
export function queueWatcher (watcher) {
  const id = watcher.id
  if (has[id] == null) {
    has[id] = true
    if (!flushing) {
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    if (!waiting) {
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        flushSchedulerQueue()
        return
      }
      nextTick(flushSchedulerQueue)
    }
  }
}
```
该文件维护了一个队列，所有需要执行的Watcher都放入这个队列，在入队之前先对去重做处理，最后通过nextTick执行flushSchedulerQueue。nextTick的目的是为了保证这些更新操作都在下一个任务tick执行，nextTick的实现逻辑暂且不管，先看一下flushSchedulerQueue方法

```
function flushSchedulerQueue () {
  currentFlushTimestamp = getNow()
  flushing = true
  let watcher, id

  queue.sort((a, b) => a.id - b.id)

  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    if (watcher.before) {
      watcher.before()
    }
    id = watcher.id
    has[id] = null
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  resetSchedulerState()

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}
```
核心逻辑是遍历watcher执行run方法，打开mysrc/core/observer/watcher.js查找run方法
```
run () {
  if (this.active) {
    const value = this.get()
    if (
      value !== this.value ||
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
```
run方法首先调用this.get方法求值，this.get内部会执行this.getter方法，对于renderWatcher前面分析this.getter就是传给Watcher的updateComponent方法，所以在updateComponent内部会执行_render方法，从而实现重新渲染的效果。

this.user为true时表示这个watcher是用户自己写的watcher，这里渲染watcher是vue内置的watcher。最终都是执行this.cb方法。其实invokeWithErrorHandling的作用就是把this.cb放在try...catch结构体执行，为了方便捕获错误。事实上我们通常在vue中这样使用watch
```
vm.$watch('a.b.c', function (newVal, oldVal) {
  // 做点什么
})
// 或者
watch: {
  // 如果 `question` 发生改变，这个函数就会运行
  question: function (newQuestion, oldQuestion) {
    this.answer = 'Waiting for you to stop typing...'
    this.debouncedGetAnswer()
  }
}
```
调用this.cb回调方法时把新旧值都传给了cb，所以用户自己写的watch能在回调方法里面获取新值和旧值。对于renderWatcher，this.cb是个空函数noop。