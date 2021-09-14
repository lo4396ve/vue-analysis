





# Render
打开mysrc/core/instance/render.js
```
Vue.prototype._render = function () {
    
    const vm = this
    const { render, _parentVnode } = vm.$options

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode
    // render self
    let vnode
    // There's no need to maintain a stack because all render fns are called
    // separately from one another. Nested component's render fns are called
    // when parent component is patched.
    currentRenderingInstance = vm
    vnode = render.call(vm._renderProxy, vm.$createElement)
    currentRenderingInstance = null
   
    // if the returned array contains only a single node, allow it
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode
    return vnode
  }
```

在_render方法内部调用了options.render方法。回想一下render的使用方式：
```
render: function (h) {
  return h('div', {
     attrs: {
        id: 'mydiv'
      },
  })
}
```
所以h就是执行的vm.$createElement方法。即便没有使用render，而是写成模板形式,最终也会编译成render函数的形式：
```
<div id="myapp">{{...}}</div>

// 编译之后
var render = function() {
  var _vm = this
  var _h = _vm.$createElement
  var _c = _vm._self._c || _h
  return _c("div", { attrs: { id: "mydiv" } })
}
var staticRenderFns = []
render._withStripped = true

export { render, staticRenderFns }
```


继续再mysrc/core/instance/render.js文件中找到vm.$createElement的定义
```
export function initRender (vm) {
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
}
```
可以看到在initRender方法里对实例扩展了_c和$createElement两个方法，_c是被模板编译成的 render 函数使用的，$createElement是用户手写 render 方法使用的。这两个方法内部都是调用了createElement方法。


