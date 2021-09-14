# Dep
Observer利用Dep进行依赖收集，看下Dep是怎么实现的，打开mysrc/core/observer/dep.js
```
export default class Dep {
  // static target = null;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub) {
    this.subs.push(sub)
  }

  removeSub (sub) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

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
}

Dep.target = null
const targetStack = []

export function pushTarget (target) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
```

Dep类的实现代码比较简单，实例属性subs是对用来存放收集的Watcher实例额。主要看target，target是Dep的一个静态属性，静态属性的特点是在类中同时只有一个值，实际上Dep.target的值是一个Watcher实例对象，因为在vue中同时只能有一个Watcher被运行，所以利用静态属性这一特性，实现依赖收集的时候只能收集当前执行的Watcher，而不会导致收集发生混乱。说白了Dep就是管理Watcher的容器。