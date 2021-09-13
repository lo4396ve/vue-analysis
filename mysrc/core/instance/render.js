
import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import VNode, { createEmptyVNode } from '../vdom/vnode'


export function initRender (vm) {
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null // v-once cached trees
  
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
}

export let currentRenderingInstance = null

export function renderMixin (Vue) {
  // install runtime convenience helpers
  installRenderHelpers(Vue.prototype)

  // Vue.prototype.$nextTick = function (fn: Function) {
  //   return nextTick(fn, this)
  // }
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
}
