class CacheManager {
  constructor() { this.cache = new Map(); }
  get(ns, key) { return this.cache.get(ns + ':' + key) || null; }
  set(ns, key, val, ttl) { this.cache.set(ns + ':' + key, val); if (ttl) setTimeout(() => this.cache.delete(ns + ':' + key), ttl); }
  invalidate(ns) { for (const k of this.cache.keys()) if (k.startsWith(ns + ':')) this.cache.delete(k); }
}
module.exports = new CacheManager();
