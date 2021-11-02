import { initMixin } from './init'
import { renderMixin } from './render'
import { lifecycleMixin } from './lifecycle'
import { eventsMixin } from './events'
import { stateMixin } from './state'
// import { warn } from '../util/index'

// Vue就是一个构造函数，并没有使用class
function Vue (options) {
  // init方法啊在initMixin被定义
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue