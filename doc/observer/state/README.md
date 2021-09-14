# state
上一章遗留的问题updateComponent为什么放到新建的渲染Watcher执行，这是因为vue是利用数据响应式来实现数据驱动的，updateComponent是渲染组件的方法，首次加载或者数据变化都应该执行updateComponent完成组件的更新。为什么数据变化就可以自动执行updateComponent更新组件，这就是vue的响应式系统要做的事。

## 观察者模式
vue响应式系统使用的是观察者模式，观察者模式与发布订阅模式很像，都需要依赖收集和事件发布。从一个例子了解vue的观察者模式。

宿舍住了一群人想装修宿舍，他们每个人都有一个电话本，上面可以记录装修师傅的电话。如果有人想粉刷墙，他得先在自己的电话本记录刷墙师傅的电话，然后才能联系师傅来刷墙，如果有人想装地板，就得记录装地板师傅的电话再联系。

vue的data数据就表示宿舍的舍员，他们的电话本就是后面要讲的Dep，用来收集依赖的容器，电话本收集的其实是装修师傅们的电话，需要刷墙就得收集刷墙师傅的电话。每一位装修师傅表示的就是后面要讲的Watcher，他具有某项技能负责具体的施工。所以如果哪位舍员想装修房子，只需要打开自己的电话本联系自己收集的装修师傅就可以了，联系师傅这一步骤就叫做事件发布。

## 添加state逻辑
本小节提供了在简易版基础上添加state功能版本[源码地址]()。下面简单分析一下这个版本都具体添加了哪些逻辑。

打开mysrc/core/instance/index.js，添加stateMixin方法
```
function Vue (options) {
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)
export default Vue
```

stateMixin在mysrc/core/instance/state.js中定义，查看stateMixin方法的实现

```
export function stateMixin (Vue) {

  const dataDef = {}
  dataDef.get = function () { return this._data }

  Object.defineProperty(Vue.prototype, '$data', dataDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

}
```

stateMixin方法主要对Vue.prototype添加了$data属性、$set方法、$delete方法和$watch方法。$data属性的get方法返回的就是用户再data中返回的数据对象，暴露给用户使用vm.$data就可以获取Vue 实例观察的数据对象。因为 Vue 无法探测普通的新增或删除 property (比如 this.myObject.newProperty = 'hi')，所以内置了$set和$delete方法，使新增的属性变成响应式的，他俩的实现这里不展开讲后面再了解。

data变成响应式的过程是在_init方法中调用的initState实现的
```
Vue.prototype._init = function (options) {
  ...
  vm._renderProxy = vm
  vm._self = vm
  initRender(vm)
  initState(vm)
  ...
}
```

initState定义在mysrc/core/instance/state.js中
```
export function initState (vm) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
}
```
当用户写了data时，使用initData方法处理：
```
function initData (vm) {
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
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
```
因为vue建议data写成函数形式同时也支持直接把data写成对象，先判断如果是函数类型通过getData获取函数返回值，如果data是对象类型直接返回data，接着对data中的属性与props或者methods重名的判断，并在开发环境中警告提示，然后通过proxy把data返回的属性代理到vm实例上，也就是把data数据声明到vm实例，这也就是为什么直接使用this.xxx就能访问到data数据的原因。最后执行observe方法。

总结：到此为止state版本就已经为实现数据的响应式做好了准备，下面就开始重点分析Observe到底是怎么实现响应式的。