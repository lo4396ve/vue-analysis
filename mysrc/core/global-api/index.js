import config from '../config'
import { initExtend } from './extend'

export function extend (to, _from) {
  for (const key in _from) {
    to[key] = _from[key]
  }
  return to
}

export function initGlobalAPI (Vue) {
  const configDef = {}
  configDef.get = () => config
  
  Object.defineProperty(Vue, 'config', configDef)
  console.dir(Vue.config)

  Vue.options = Object.create(null)
  const ASSET_TYPES = ['component','directive','filter']
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue
  
  initExtend(Vue)
}
