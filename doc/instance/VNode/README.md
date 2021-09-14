# VNode
前面分析到render内部调用了createElement方法，而createElement方法就是帮助render创建虚拟dom使用方法。打开mysrc/core/vdom/create-element.js
```
export function createElement (
  context,
  tag,
  data,
  children,
  normalizationType,
  alwaysNormalize
) {
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}
```
往下查看_createElement方法：
```
export function _createElement (
  context,
  tag,
  data,
  children,
  normalizationType
) {
  if (isDef(data) && isDef((data).__ob__)) {
    return createEmptyVNode()
  }
  // object syntax in v-bind
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  
  // support single function children as default scoped slot
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children)
  }
  let vnode, ns
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    return createEmptyVNode()
  }
}
```
_createElement支持五个参数，context代表VNode 的上下文环境，tag表示要创建的dom标签，可以是一个String类型也可以是一个Component，data表示VNode 的数据，children是当前VNode的子节点。

接着是对children的规范化，因为参数children可以接受任意类型的数据，可以是单个节点，也可以是多个节点组成的数组，甚至可以是一段字符文本。normalizeChildren和simpleNormalizeChildren都是用来规范化children的。如果render函数是编译生成的，children已经是VNode类型数据，但是函数式组件返回的是一个数组而不是一个根节点，需要在simpleNormalizeChildren中单独处理一下；如果render是用户自己手写的，则会调用normalizeChildren方法处理children。

最后是创建VNode的过程。判断tag是字符串的情况，如果tag是html内置的标签（div、span、svg等），直接创建普通的VNode，如果是用户在components中注册的组件名字，则调用createComponent，如果是未知的标签名，则创建一个未类型的VNode；如果tag是Component类型，也是调用createComponent方法。对于组件创建VNode的过程比较复杂，所以vue提供了createComponent专门用于组件类型的VNode创建。createComponent方法在后面再详细介绍。

从上面的分析，已经了解了从new Vue开始，在Vue内部都做了哪些事：
1、 初始化阶段 调用了this._init
2、 挂载阶段 _init内部调用vm.$mount，$mount调用了mountComponent，mountComponent内部创建了渲染Watcher并把updateComponent传给Watcher，由Watcher内部调用updateComponent，也就是执行vm._update(vm._render())
3、 render阶段 _render方法内部用户手写或者编译生成的render方法，render方法最终执行的是createElement

目前为止，我们已经知道了从new Vue开始到创建虚拟dom（VNode）的过程，最终还是需要把VNode渲染到页面，这也就是vm._update方法的作用。_update定义在mysrc/core/instance/lifecycle.js
```
export function lifecycleMixin (Vue) {
  Vue.prototype._update = function (vnode, hydrating) {
    const vm = this
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
  }
}
```
在lifecycleMixin方法中，对Vue原型添加了_update方法，_update接受两个参数，第一个参数vnode代表虚拟dom，第二个参数hydrating与服务端渲染有关，暂不考虑第二个参数。无论是首次渲染还是更新渲染，都会执行_update，先分析首次渲染时的逻辑。代码核心内容是调用了vm.__patch__方法，并赋值给了vm.$el属性，vm.__patch__方法返回的是由VNode创建的真实dom，所以vm.$el就是VNode对象与VNode最终挂载的真实dom的映射，用户使用this.$el就可以访问当前实例对应的真实dom。

打开mysrc/platforms/web/runtime/index.js
```
// Vue.prototype.__patch__ = inBrowser ? patch : noop
Vue.prototype.__patch__ = patch;  // 在浏览器环境inBrowser为true
```
patch定义在mysrc/platforms/web/runtime/patch.js
```
const modules = [];

export const patch = createPatchFunction({ nodeOps, modules })
```
在patch内部调用了createPatchFunction方法，createPatchFunction接受一个对象参数，nodeOps封装了一些对document操作dom的方法，modules是一个空数组，modules的作用以后再介绍。

查看createPatchFunction的实现，打开mysrc/core/vdom/patch.js
```
export function createPatchFunction (backend) {
  
  .
  .
  .
  
  return function patch (oldVnode, vnode, hydrating, removeOnly) {

    // eslint-disable-next-line no-unused-vars
    let isInitialPatch = false
    const insertedVnodeQueue = []

    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      /** 如果首次渲染 不存在旧的节点 */
      isInitialPatch = true
      createElm(vnode, insertedVnodeQueue)
    } else {
      // /*标记旧的VNode是否有nodeType*/
      const isRealElement = isDef(oldVnode.nodeType)
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // patch existing root node
        /*是同一个节点的时候直接修改现有的节点*/
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        if (isRealElement) {
          // create an empty node and replace it
          oldVnode = emptyNodeAt(oldVnode)
        }

        // replacing existing element
        const oldElm = oldVnode.elm
        const parentElm = nodeOps.parentNode(oldElm)

        // create new node
        createElm(
          vnode,
          insertedVnodeQueue,
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm)
        )
      }
    }

    // invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm
  }
}

```

在createPatchFunction文件里定义了一些其他的辅助方法，主要分析最终返回的function patch方法，这个方法就是vm._update 函数里调用的 vm.__patch__方法。patch方法接受四个参数，第一个参数oldVnode表示旧的节点或者空，如果首次渲染oldVnode的值为空，如果oldVnode不为空，说明是更新渲染。需要注意的是即便是首次渲染根组件也会把其挂载的真实dom（#app）传给oldVnode，不然整个vue项目就无法挂载到public/index.html中；第二个参数vnode表示虚拟dom；hydrating表示是否SSR；removeOnly 是在 transition-group才会用到。

代码的核心是调用createElm方法：

```
function createElm (
  vnode,
  insertedVnodeQueue,
  parentElm,
  refElm,
  nested,
  ownerArray,
  index
) {
  if (isDef(vnode.elm) && isDef(ownerArray)) {
    vnode = ownerArray[index] = cloneVNode(vnode)
  }

  vnode.isRootInsert = !nested // for transition enter check
  if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
    return
  }
  const data = vnode.data
  const children = vnode.children
  const tag = vnode.tag
  if (isDef(tag)) {

    vnode.elm = vnode.ns
      ? nodeOps.createElementNS(vnode.ns, tag)
      : nodeOps.createElement(tag, vnode)

    /* istanbul ignore if */
    createChildren(vnode, children, insertedVnodeQueue)
    
    insert(parentElm, vnode.elm, refElm)

  } else if (vnode.isComment) {
    // 注释节点
    vnode.elm = nodeOps.createComment(vnode.text)
    insert(parentElm, vnode.elm, refElm)
  } else {
    // 文本节点
    vnode.elm = nodeOps.createTextNode(vnode.text)
    insert(parentElm, vnode.elm, refElm)
  }
}
```
createElm方法会尝试创建子组件，这里先不介绍，对于当前的普通情况，创建子组件会失败返回false，然后对tag的合法性做一个判断，如果tag是一个合法的标签，首先根据vnode.ns属性创建带有指定命名空间的元素节点或者创建一个普通元素节点作为占位符元素，在insert插入到页面之前先处理子节点createChildren，这也就是为什么生命周期里父子组件生命周期的调用顺序是：

父beforeCreate -> 父created -> 父beforeMount -> 子beforeCreate -> 子created -> 子beforeMount -> 子mounted -> 父mounted
就是因为在父组件插入到页面之前（父beforeMount）先去处理子节点。

createChildren方法：
```
function createChildren (vnode, children, insertedVnodeQueue) {
  if (Array.isArray(children)) {
    if (process.env.NODE_ENV !== 'production') {
      checkDuplicateKeys(children)
    }
    for (let i = 0; i < children.length; ++i) {
      createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i)
    }
  } else if (isPrimitive(vnode.text)) {
    nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)))
  }
}
```

createChildren方法比较简单，就是遍历子组件数组，利用递归的方式依次调用createElm方法。

insert方法：
```
function insert (parent, elm, ref) {
  if (isDef(parent)) {
    if (isDef(ref)) {
      if (nodeOps.parentNode(ref) === parent) {
        nodeOps.insertBefore(parent, elm, ref)
      }
    } else {
      nodeOps.appendChild(parent, elm)
    }
  }
}
```
insert方法调用了nodeOps.appendChild或insertBefore方法，parent这时是一个创建好的真实节点，nodeOps.appendChild实际上就是执行的dom.appendChild或dom.insertBefore。最终完成了VNode渲染到页面的整个过程。


最后还有一个疑问，为什么updateComponent方法不直接执行，而是创建一个渲染Watcher，在渲染Watcher里执行。下一章就开始介绍Vue响应式系统，从而揭晓答案。
