class ProxyRotator {

  constructor (options = {}) {

    this.proxies = []
    this.namespaces = [
      {
        key: '_global',
        timeout: 1000,
        data: {}
      }
    ]

  }

  setProxies (proxies = []) {
    if (!Array.isArray(proxies) || !proxies.length) return
    this.proxies = proxies
    // Delete proxies from namespaces that no longer exist
    for (const namespace of this.namespaces) {
      for (const proxy of Object.keys(namespace.data)) {
        // If proxy doesn't exist in current proxy list we delete it
        if (this.proxies.indexOf(proxy) === -1) delete namespace.data[proxy]
      }
    }
    // Add missing data of proxies to namespaces
    this.addProxiesToNamespaces()
  }

  setNamespace (data) {
    const namespace = this.namespaces.find(ns => ns.key === data.key)
    // If namespace exists change values
    if (namespace) {
      Object.assign(namespace, data)
    }
    // Namespace doesn't exist so we create a new one
    else {
      this.namespaces.push({
        ...data,
        data: {}
      })
    }

    this.addProxiesToNamespaces()
  }

  setNamespaces (array) {
    if (Array.isArray(array)) {
      for (const ns of array) {
        this.setNamespace(ns)
      }
    }
  }

  addProxiesToNamespaces () {
    if (!this.proxies.length) return

    for (const namespace of this.namespaces) {
      for (const proxy of this.proxies) {
        // Proxy already has a data value, skip
        if (namespace.data[proxy]) continue
        // Set proxies to be last used now - timeout + random
        // so that these proxies are free to use
        namespace.data[proxy] = new Date().getTime() - namespace.timeout + Math.round(Math.random() * 1000)
      }
    }
  }

  getProxy (ns = '_global', callbackFn) {
    const namespaceKey = typeof ns === 'function' ? '_global' : ns
    const callback = typeof ns === 'function' ? ns : callbackFn

    const namespace = this.namespaces.find(x => x.key === namespaceKey)
    // Namespace doesn't exist so we return global
    if (!namespace) {
      return callback('unknown_namespace')
    }
    // Get least used proxy
    const namespaceProxies = Object.keys(namespace.data).map(proxy => ({ proxy, time: namespace.data[proxy] }))
    const leastUsedProxy = namespaceProxies.sort((a, b) => a.time - b.time)[0]
    // If the least used proxy was still used too recently with the set namespace timeout then we return error object
    if (leastUsedProxy.time + namespace.timeout >= new Date().getTime()) {
      return callback('no_available_proxies')
    }
    // Proxy is good to use, set new time
    namespace.data[leastUsedProxy.proxy] = new Date().getTime()
    // Return proxy
    callback(null, leastUsedProxy.proxy)
  }

}

module.exports = ProxyRotator