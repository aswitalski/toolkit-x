import toolkit from './index.js'

const scope = typeof window === 'undefined' ? global : window
scope.opr = scope.opr || {}
scope.opr.Toolkit = toolkit
