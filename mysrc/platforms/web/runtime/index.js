import Vue from 'core/index'
import { mountComponent } from 'core/instance/lifecycle'

import {
  query,
} from 'web/util/index'

import { patch } from './patch'
Vue.prototype.__patch__ = patch;

// public mount method
Vue.prototype.$mount = function (
  el
) {
  // el = el && inBrowser ? query(el) : undefined
  el = el && query(el);
  return mountComponent(this, el)
}

export default Vue
