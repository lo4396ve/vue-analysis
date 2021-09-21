# vue源码分析
读好的源码可以提升自己的编程水平，vue就是一个好的选择。

Vue源码体积比较庞大，本文从vue源码抽取出一个简易版的vue模板，仅包含vue工具包、虚拟dom(VNode)初始化渲染、数据响应式等基础功能，保持跟源码目录结构相同，先从简易版本入手掌握vue基本的原理。

随后不断完善vue的其他功能（比如data绑定、props、solt、生命周期等其他常用功能）。在完善的过程中可以更好的体会到代码的设计思路。

### 章节
* 准备工作
  * [下载源码](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/ready/download)
  * [目录结构分析](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/ready/structure)
  * [动手前的思考](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/ready/think)
* 简易版本
  * [简易版本](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/simple)

* vue实例化
  * [new Vue做了什么](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/instance/newVue)
  * [mount挂载](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/instance/mount)
  * [Render](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/instance/render)
  * [VNode](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/instance/VNode)

* 响应式系统
  * [简易版实现data响应绑定](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/observer/state)
  * [数据响应式对象Observer](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/observer/Observer)
  * [依赖收集Dep](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/observer/Dep)
  * [Watcher](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/observer/Watcher)
  * [派发通知-notify](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/observer/Notify)
* 计算属性&侦听器
  * [计算属性computed](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/computed&watch/computed)
  * [侦听器watch](https://github.com/lo4396ve/vue-analysis/tree/simple/doc/computed&watch/watch)

