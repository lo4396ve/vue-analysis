import { pushTarget, popTarget } from '../observer/dep'
// import Watcher from '../observer/watcher'
import {
  set,
  del,
  observe,
} from '../observer/index'

import {
  warn,
  noop,
  hasOwn,
  isReserved,
  handleError,
  isPlainObject,
  // invokeWithErrorHandling
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

export function proxy (target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (vm) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
}

function initData (vm) {
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  // 判断data是否为Object类型
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  observe(data, true /* asRootData */)
}

export function getData (data, vm) {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

// function createWatcher (
//   vm,
//   expOrFn,
//   handler,
//   options
// ) {
//   if (isPlainObject(handler)) {
//     options = handler
//     handler = handler.handler
//   }
//   if (typeof handler === 'string') {
//     handler = vm[handler]
//   }
//   return vm.$watch(expOrFn, handler, options)
// }

export function stateMixin (Vue) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  // if (process.env.NODE_ENV !== 'production') {
  //   dataDef.set = function () {
  //     warn(
  //       'Avoid replacing instance root $data. ' +
  //       'Use nested data properties instead.',
  //       this
  //     )
  //   }
  // }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  // Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  // Vue.prototype.$watch = function (
  //   expOrFn,
  //   cb,
  //   options
  // ) {
  //   const vm = this
  //   if (isPlainObject(cb)) {
  //     return createWatcher(vm, expOrFn, cb, options)
  //   }
  //   options = options || {}
  //   options.user = true
  //   const watcher = new Watcher(vm, expOrFn, cb, options)
  //   if (options.immediate) {
  //     const info = `callback for immediate watcher "${watcher.expression}"`
  //     pushTarget()
  //     invokeWithErrorHandling(cb, vm, [watcher.value], vm, info)
  //     popTarget()
  //   }
  //   return function unwatchFn () {
  //     watcher.teardown()
  //   }
  // }
}