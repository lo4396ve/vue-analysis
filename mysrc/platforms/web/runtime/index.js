import Vue from 'core/index'
import { mountComponent } from 'core/instance/lifecycle'
import { query } from 'web/util/index'
import { patch } from './patch'

Vue.prototype.__patch__ = patch;

Vue.prototype.$mount = function (el) {
  el = el && query(el);
  return mountComponent(this, el)
}

export default Vue
