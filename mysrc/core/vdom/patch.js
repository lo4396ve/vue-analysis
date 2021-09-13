/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Evan You (@yyx990803)
 *
 * Not type-checking this because this file is perf-critical and the cost
 * of making flow understand it is not worth it.
 */

import VNode, { cloneVNode } from './vnode'
import { isTextInputType } from 'web/util/element'

import {
  isDef,
  isUndef,
  isTrue,
  isPrimitive
} from '../util/index'

export const emptyNode = new VNode('', {}, [])

/*
  判断两个VNode节点是否是同一个节点，需要满足以下条件
  key相同
  tag（当前节点的标签名）相同
  isComment（是否为注释节点）相同
  是否data（当前节点对应的对象，包含了具体的一些数据信息，是一个VNodeData类型，可以参考VNodeData类型中的数据信息）都有定义
  当标签是<input>的时候，type必须相同
*/
function sameVnode (a, b) {
  return (
    a.key === b.key &&
    a.asyncFactory === b.asyncFactory && (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType(a, b)
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}

function sameInputType (a, b) {
  if (a.tag !== 'input') return true
  let i
  const typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type
  const typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type
  return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
}



export function createPatchFunction (backend) {
  // let i, j
  // const cbs = {}

  // eslint-disable-next-line no-unused-vars
  const { modules, nodeOps } = backend

  // for (i = 0; i < hooks.length; ++i) {
  //   cbs[hooks[i]] = []
  //   for (j = 0; j < modules.length; ++j) {
  //     if (isDef(modules[j][hooks[i]])) {
  //       cbs[hooks[i]].push(modules[j][hooks[i]])
  //     }
  //   }
  // }
  function insert (parent, elm, ref) {
    if (isDef(parent)) {
      if (isDef(ref)) {
        if (ref.parentNode === parent) {
          nodeOps.insertBefore(parent, elm, ref)
        }
      } else {
        nodeOps.appendChild(parent, elm)
      }
    }
  }
  function createChildren (vnode, children, insertedVnodeQueue) {
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; ++i) {
        createElm(children[i], insertedVnodeQueue, vnode.elm, null, true)
      }
    } else if (isPrimitive(vnode.text)) {
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(vnode.text))
    }
  }
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
      // This vnode was used in a previous render!
      // now it's used as a new node, overwriting its elm would cause
      // potential patch errors down the road when it's used as an insertion
      // reference node. Instead, we clone the node on-demand before creating
      // associated DOM element for it.
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    vnode.isRootInsert = !nested // for transition enter check
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }

    // eslint-disable-next-line no-unused-vars
    const data = vnode.data
    const children = vnode.children
    const tag = vnode.tag
    if (isDef(tag)) {
      if (process.env.NODE_ENV !== 'production') {
        // if (data && data.pre) {
        //   creatingElmInVPre++
        // }
        // if (isUnknownElement(vnode, creatingElmInVPre)) {
        //   warn(
        //     'Unknown custom element: <' + tag + '> - did you ' +
        //     'register the component correctly? For recursive components, ' +
        //     'make sure to provide the "name" option.',
        //     vnode.context
        //   )
        // }
      }

      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode)
      // 处理style标签的Scope属性
      // setScope(vnode)

      /* istanbul ignore if */
      createChildren(vnode, children, insertedVnodeQueue)
      // if (isDef(data)) {
      //   invokeCreateHooks(vnode, insertedVnodeQueue)
      // }
      insert(parentElm, vnode.elm, refElm)

      // if (process.env.NODE_ENV !== 'production' && data && data.pre) {
      //   creatingElmInVPre--
      // }
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

  function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    let i = vnode.data
    if (isDef(i)) {
      const isReactivated = isDef(vnode.componentInstance) && i.keepAlive
      if (isDef(i = i.hook) && isDef(i = i.init)) {
        i(vnode, false /* hydrating */)
      }
      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue)
        insert(parentElm, vnode.elm, refElm)
        if (isReactivated) {
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm)
        }
        return true
      }
    }
  }
  function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    // let i
    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.
    // let innerNode = vnode
    // while (innerNode.componentInstance) {
    //   innerNode = innerNode.componentInstance._vnode
    //   if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
    //     for (i = 0; i < cbs.activate.length; ++i) {
    //       cbs.activate[i](emptyNode, innerNode)
    //     }
    //     insertedVnodeQueue.push(innerNode)
    //     break
    //   }
    // }
    // unlike a newly created component,
    // a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm)
  }
  function initComponent (vnode, insertedVnodeQueue) {
    if (isDef(vnode.data.pendingInsert)) {
      insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert)
      vnode.data.pendingInsert = null
    }
    vnode.elm = vnode.componentInstance.$el
    if (isPatchable(vnode)) {
      // invokeCreateHooks(vnode, insertedVnodeQueue)
      // setScope(vnode)
    } else {
      // empty component root.
      // skip all element-related modules except for ref (#3455)
      // registerRef(vnode)
      // make sure to invoke the insert hook
      insertedVnodeQueue.push(vnode)
    }
  }

  function emptyNodeAt (elm) {
    return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }

  function isPatchable (vnode) {
    while (vnode.componentInstance) {
      vnode = vnode.componentInstance._vnode
    }
    return isDef(vnode.tag)
  }
  function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx)
    }
  }
  function removeVnodes (vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          // removeAndInvokeRemoveHook(ch)
          // invokeDestroyHook(ch)
        } else { // Text node
          removeNode(ch.elm)
        }
      }
    }
  }
  function removeNode (el) {
    const parent = nodeOps.parentNode(el)
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el)
    }
  }

  function patchVnode (
    oldVnode,
    vnode,
    insertedVnodeQueue,
    ownerArray,
    index,
    // eslint-disable-next-line no-unused-vars
    removeOnly
  ) {
    if (oldVnode === vnode) {
      return
    }

    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // clone reused vnode
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    const elm = vnode.elm = oldVnode.elm

    if (oldVnode.isAsyncPlaceholder) {
      vnode.isAsyncPlaceholder = true
      // if (isDef(vnode.asyncFactory.resolved)) {
      //   hydrate(oldVnode.elm, vnode, insertedVnodeQueue)
      // } else {
      //   vnode.isAsyncPlaceholder = true
      // }
      return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    if (vnode.isStatic &&
      oldVnode.isStatic &&
      vnode.key === oldVnode.key &&
      (vnode.isCloned || vnode.isOnce)
    ) {
      vnode.componentInstance = oldVnode.componentInstance
      return
    }

    let i
    const data = vnode.data
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      i(oldVnode, vnode)
    }

    const oldCh = oldVnode.children
    const ch = vnode.children
    if (isDef(data) && isPatchable(vnode)) {
      // for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        // if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
      } else if (isDef(ch)) {
        // if (process.env.NODE_ENV !== 'production') {
        //   checkDuplicateKeys(ch)
        // }
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        removeVnodes(oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      nodeOps.setTextContent(elm, vnode.text)
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
    }
  }
  

  // eslint-disable-next-line no-unused-vars
  return function patch (oldVnode, vnode, hydrating, removeOnly) {
    // if (isUndef(vnode)) {
    //   if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
    //   return
    // }

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
          // mounting to a real element
          // check if this is server-rendered content and if we can perform
          // a successful hydration.
          // if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
          //   oldVnode.removeAttribute(SSR_ATTR)
          //   hydrating = true
          // }
          // if (isTrue(hydrating)) {
          //   if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
          //     invokeInsertHook(vnode, insertedVnodeQueue, true)
          //     return oldVnode
          //   } else if (process.env.NODE_ENV !== 'production') {
          //     warn(
          //       'The client-side rendered virtual DOM tree is not matching ' +
          //       'server-rendered content. This is likely caused by incorrect ' +
          //       'HTML markup, for example nesting block-level elements inside ' +
          //       '<p>, or missing <tbody>. Bailing hydration and performing ' +
          //       'full client-side render.'
          //     )
          //   }
          // }
          // either not server-rendered, or hydration failed.
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

        // update parent placeholder node element, recursively
        // if (isDef(vnode.parent)) {
        //   let ancestor = vnode.parent
        //   const patchable = isPatchable(vnode)
        //   while (ancestor) {
        //     for (let i = 0; i < cbs.destroy.length; ++i) {
        //       cbs.destroy[i](ancestor)
        //     }
        //     ancestor.elm = vnode.elm
        //     if (patchable) {
        //       for (let i = 0; i < cbs.create.length; ++i) {
        //         cbs.create[i](emptyNode, ancestor)
        //       }
        //       // #6513
        //       // invoke insert hooks that may have been merged by create hooks.
        //       // e.g. for directives that uses the "inserted" hook.
        //       const insert = ancestor.data.hook.insert
        //       if (insert.merged) {
        //         // start at index 1 to avoid re-invoking component mounted hook
        //         for (let i = 1; i < insert.fns.length; i++) {
        //           insert.fns[i]()
        //         }
        //       }
        //     } else {
        //       registerRef(ancestor)
        //     }
        //     ancestor = ancestor.parent
        //   }
        // }

        // destroy old node
        // if (isDef(parentElm)) {
        //   removeVnodes([oldVnode], 0, 0)
        // } else if (isDef(oldVnode.tag)) {
        //   invokeDestroyHook(oldVnode)
        // }
      }
    }

    // invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm
  }
}
