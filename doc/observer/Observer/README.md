# Observe

打开mysrc/core/observer/index.js，找到observe方法的定义：
```
export function observe (value, asRootData) {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}
```
observe首先判断要操作的对象如果有__ob__属性并且value.__ob__是Observer类型的，说明该对象已经是一个响应式数据了，不需要再操作了。否则创建Observer实例对象。

Observer类的实现：
```
export class Observer {
  
  constructor (value) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0  // number of vms that have this object as root $data
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  walk (obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  observeArray (items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}
```
首先通过def方法在对象上添加__ob__属性，并指向当前实例，说明该对象已经是一个响应式数据了。如果是数组类型，调用observeArray方法通过遍历加递归的方式，是得数组每一个数据都变成响应式数据，最终执行this.walk。walk会遍历对象每一个属性，并调用defineReactive方法。

defineReactive：
```
export function defineReactive (
  obj,
  key,
  val,
  customSetter,
  shallow
) {
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
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
}
```
defineReactive方法首先会实例化一个Dep对象用来收集依赖，通过递归的方式对子对象调用observe方法，这样对象多层嵌套({a: {b: {c: '1'}}})的情况也能保证每个子属性都是响应式的。代码的核心是使用Object.defineProperty方法重写属性的get和set方法。在get方法中使用dep.depend进行依赖收集，在set方法中使用dep.notify通知订阅的事件。