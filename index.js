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

  getAvailableProxies (ns = '_global') {
    const namespace = this.namespaces.find(x => x.key === ns)
    // If namespace doesn't exist return false
    if (!namespace) return false
    // Get least used proxies
    const namespaceProxies = Object.keys(namespace.data).map(proxy => ({ proxy, time: namespace.data[proxy] }))
    const availableProxies = namespaceProxies.sort((a, b) => a.time - b.time).filter(x => {
      return x.time + namespace.timeout >= new Date().getTime()
    })
    // If there's no available proxies return false
    if (!availableProxies.length) return false
    // Return available proxies
    return availableProxies
  }

  getProxy (ns = '_global', callbackFn) {
    const namespaceKey = typeof ns === 'function' ? '_global' : ns
    const callback = typeof ns === 'function' ? ns : callbackFn

    const namespace = this.namespaces.find(x => x.key === namespaceKey)
    // Namespace doesn't exist so we return global
    if (!namespace) {
      return callback('unknown_namespace')
    }
    // Get available proxies that are not waiting
    const availableProxies = this.getAvailableProxies(ns)
    // Check if any results
    if (!availableProxies || !availableProxies.length) {
      return callback('no_available_proxies')
    }
    const leastUsedProxy = availableProxies[0]
    // Proxy is good to use, set new time
    namespace.data[leastUsedProxy.proxy] = new Date().getTime()
    // Return proxy
    callback(null, leastUsedProxy.proxy)
  }

}

module.exports = ProxyRotator