import { getEventName } from './utils.js'

/*
 * Names of the event listeners supported in templates, in camel case, e.g.
 * onPointerDown, generated from the events of Chromium 153, with the alias
 * onDoubleClick of onDblClick. Only a type, as the events are checked
 * against the browser in debug mode.
 */
export type EventName =
  | 'onAbort'
  | 'onAfterPrint'
  | 'onAnimationCancel'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onAnimationStart'
  | 'onAppInstalled'
  | 'onAuxClick'
  | 'onBeforeCopy'
  | 'onBeforeCut'
  | 'onBeforeInput'
  | 'onBeforeInstallPrompt'
  | 'onBeforeMatch'
  | 'onBeforePaste'
  | 'onBeforePrint'
  | 'onBeforeToggle'
  | 'onBeforeUnload'
  | 'onBeforeXRSelect'
  | 'onBlur'
  | 'onCancel'
  | 'onCanPlay'
  | 'onCanPlayThrough'
  | 'onChange'
  | 'onClick'
  | 'onClose'
  | 'onCommand'
  | 'onCompositionEnd'
  | 'onCompositionStart'
  | 'onCompositionUpdate'
  | 'onContentVisibilityAutoStateChange'
  | 'onContextLost'
  | 'onContextMenu'
  | 'onContextRestored'
  | 'onCopy'
  | 'onCueChange'
  | 'onCut'
  | 'onDblClick'
  | 'onDeviceMotion'
  | 'onDeviceOrientation'
  | 'onDeviceOrientationAbsolute'
  | 'onDoubleClick'
  | 'onDrag'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDragStart'
  | 'onDrop'
  | 'onDurationChange'
  | 'onEmptied'
  | 'onEncrypted'
  | 'onEnded'
  | 'onEnterPictureInPicture'
  | 'onError'
  | 'onFocus'
  | 'onFormData'
  | 'onFreeze'
  | 'onFullscreenChange'
  | 'onFullscreenError'
  | 'onGamepadConnected'
  | 'onGamepadDisconnected'
  | 'onGotPointerCapture'
  | 'onHashChange'
  | 'onInput'
  | 'onInvalid'
  | 'onKeyDown'
  | 'onKeyPress'
  | 'onKeyUp'
  | 'onLanguageChange'
  | 'onLeavePictureInPicture'
  | 'onLoad'
  | 'onLoadedData'
  | 'onLoadedMetadata'
  | 'onLoadStart'
  | 'onLostPointerCapture'
  | 'onMessage'
  | 'onMessageError'
  | 'onMouseDown'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onMouseMove'
  | 'onMouseOut'
  | 'onMouseOver'
  | 'onMouseUp'
  | 'onMouseWheel'
  | 'onOffline'
  | 'onOnline'
  | 'onPageHide'
  | 'onPageReveal'
  | 'onPageShow'
  | 'onPageSwap'
  | 'onPaste'
  | 'onPause'
  | 'onPlay'
  | 'onPlaying'
  | 'onPointerCancel'
  | 'onPointerDown'
  | 'onPointerEnter'
  | 'onPointerLeave'
  | 'onPointerLockChange'
  | 'onPointerLockError'
  | 'onPointerMove'
  | 'onPointerOut'
  | 'onPointerOver'
  | 'onPointerRawUpdate'
  | 'onPointerUp'
  | 'onPopState'
  | 'onPrerenderingChange'
  | 'onProgress'
  | 'onRateChange'
  | 'onReadyStateChange'
  | 'onRejectionHandled'
  | 'onReset'
  | 'onResize'
  | 'onResume'
  | 'onScroll'
  | 'onScrollEnd'
  | 'onScrollSnapChange'
  | 'onScrollSnapChanging'
  | 'onSearch'
  | 'onSecurityPolicyViolation'
  | 'onSeeked'
  | 'onSeeking'
  | 'onSelect'
  | 'onSelectionChange'
  | 'onSelectStart'
  | 'onSlotChange'
  | 'onStalled'
  | 'onStorage'
  | 'onSubmit'
  | 'onSuspend'
  | 'onTimeUpdate'
  | 'onToggle'
  | 'onTouchCancel'
  | 'onTouchEnd'
  | 'onTouchMove'
  | 'onTouchStart'
  | 'onTransitionCancel'
  | 'onTransitionEnd'
  | 'onTransitionRun'
  | 'onTransitionStart'
  | 'onUnhandledRejection'
  | 'onUnload'
  | 'onVisibilityChange'
  | 'onVolumeChange'
  | 'onWaiting'
  | 'onWaitingForKey'
  | 'onWebkitAnimationEnd'
  | 'onWebkitAnimationIteration'
  | 'onWebkitAnimationStart'
  | 'onWebkitFullscreenChange'
  | 'onWebkitFullscreenError'
  | 'onWebkitTransitionEnd'
  | 'onWheel'

/*
 * Names of the element attributes supported in templates, in camel case,
 * e.g. tabIndex, generated from the attributes of Chromium 153, with the
 * names supported before, e.g. allowFullScreen. Only a type, as the
 * attributes are checked against the browser in debug mode.
 */
export type AttributeName =
  | 'abbr'
  | 'accept'
  | 'acceptCharset'
  | 'accessKey'
  | 'action'
  | 'adAuctionHeaders'
  | 'align'
  | 'aLink'
  | 'allow'
  | 'allowFullscreen'
  | 'allowFullScreen'
  | 'allowPaymentRequest'
  | 'alt'
  | 'archive'
  | 'ariaActions'
  | 'ariaActiveDescendant'
  | 'ariaAtomic'
  | 'ariaAutoComplete'
  | 'ariaBrailleLabel'
  | 'ariaBrailleRoleDescription'
  | 'ariaBusy'
  | 'ariaChecked'
  | 'ariaColCount'
  | 'ariaColIndex'
  | 'ariaColIndexText'
  | 'ariaColSpan'
  | 'ariaControls'
  | 'ariaCurrent'
  | 'ariaDescribedBy'
  | 'ariaDescription'
  | 'ariaDetails'
  | 'ariaDisabled'
  | 'ariaErrorMessage'
  | 'ariaExpanded'
  | 'ariaFlowTo'
  | 'ariaHasPopup'
  | 'ariaHidden'
  | 'ariaInvalid'
  | 'ariaKeyShortcuts'
  | 'ariaLabel'
  | 'ariaLabelledBy'
  | 'ariaLabelLedBy'
  | 'ariaLevel'
  | 'ariaLive'
  | 'ariaModal'
  | 'ariaMultiLine'
  | 'ariaMultiSelectable'
  | 'ariaOrientation'
  | 'ariaOwns'
  | 'ariaPlaceholder'
  | 'ariaPosInSet'
  | 'ariaPressed'
  | 'ariaReadOnly'
  | 'ariaRelevant'
  | 'ariaRequired'
  | 'ariaRoleDescription'
  | 'ariaRowCount'
  | 'ariaRowIndex'
  | 'ariaRowIndexText'
  | 'ariaRowSpan'
  | 'ariaSelected'
  | 'ariaSetSize'
  | 'ariaSort'
  | 'ariaValueMax'
  | 'ariaValueMin'
  | 'ariaValueNow'
  | 'ariaValueText'
  | 'as'
  | 'async'
  | 'attributionSrc'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
  | 'autoFocus'
  | 'autoPlay'
  | 'axis'
  | 'background'
  | 'bgColor'
  | 'blocking'
  | 'border'
  | 'browsingTopics'
  | 'cellPadding'
  | 'cellSpacing'
  | 'charset'
  | 'checked'
  | 'cite'
  | 'clear'
  | 'closedBy'
  | 'code'
  | 'codeBase'
  | 'codeType'
  | 'color'
  | 'cols'
  | 'colSpan'
  | 'command'
  | 'commandFor'
  | 'compact'
  | 'content'
  | 'contentEditable'
  | 'controls'
  | 'coords'
  | 'credentialless'
  | 'crossOrigin'
  | 'csp'
  | 'data'
  | 'dateTime'
  | 'declare'
  | 'decoding'
  | 'default'
  | 'defer'
  | 'dir'
  | 'dirName'
  | 'disabled'
  | 'disablePictureInPicture'
  | 'disableRemotePlayback'
  | 'download'
  | 'draggable'
  | 'elementTiming'
  | 'encoding'
  | 'encType'
  | 'enterKeyHint'
  | 'event'
  | 'fetchPriority'
  | 'focusGroupStart'
  | 'for'
  | 'form'
  | 'formAction'
  | 'formEnctype'
  | 'formMethod'
  | 'formNoValidate'
  | 'formTarget'
  | 'frame'
  | 'frameBorder'
  | 'headers'
  | 'height'
  | 'hidden'
  | 'high'
  | 'href'
  | 'hrefLang'
  | 'hspace'
  | 'httpEquiv'
  | 'id'
  | 'imageSizes'
  | 'imageSrcset'
  | 'incremental'
  | 'inert'
  | 'inputMode'
  | 'integrity'
  | 'interestFor'
  | 'is'
  | 'isMap'
  | 'itemProp'
  | 'kind'
  | 'label'
  | 'lang'
  | 'link'
  | 'list'
  | 'loading'
  | 'longDesc'
  | 'loop'
  | 'low'
  | 'lowSrc'
  | 'marginHeight'
  | 'marginWidth'
  | 'max'
  | 'maxLength'
  | 'media'
  | 'method'
  | 'min'
  | 'minLength'
  | 'multiple'
  | 'muted'
  | 'name'
  | 'noHref'
  | 'noModule'
  | 'nonce'
  | 'noShade'
  | 'noValidate'
  | 'noWrap'
  | 'open'
  | 'optimum'
  | 'part'
  | 'pattern'
  | 'ping'
  | 'placeholder'
  | 'playsInline'
  | 'popover'
  | 'popoverTarget'
  | 'popoverTargetAction'
  | 'poster'
  | 'preload'
  | 'privateToken'
  | 'readOnly'
  | 'referrerPolicy'
  | 'rel'
  | 'required'
  | 'rev'
  | 'reversed'
  | 'role'
  | 'rows'
  | 'rowSpan'
  | 'rules'
  | 'sandbox'
  | 'scheme'
  | 'scope'
  | 'scrolling'
  | 'selected'
  | 'shadowRootClonable'
  | 'shadowRootCustomElementRegistry'
  | 'shadowRootDelegatesFocus'
  | 'shadowRootMode'
  | 'shadowRootReferenceTarget'
  | 'shadowRootSerializable'
  | 'shadowRootSlotAssignment'
  | 'shape'
  | 'size'
  | 'sizes'
  | 'slot'
  | 'span'
  | 'spellCheck'
  | 'src'
  | 'srcDoc'
  | 'srcLang'
  | 'srcSet'
  | 'standby'
  | 'start'
  | 'step'
  | 'summary'
  | 'tabIndex'
  | 'target'
  | 'title'
  | 'translate'
  | 'type'
  | 'useMap'
  | 'vAlign'
  | 'value'
  | 'version'
  | 'virtualKeyboardPolicy'
  | 'vLink'
  | 'vspace'
  | 'webkitDirectory'
  | 'width'
  | 'wrap'
  | 'writingSuggestions'

/*
 * The filter functions of Chromium 153, in camel case, e.g. dropShadow for
 * drop-shadow in CSS.
 */
const SUPPORTED_FILTERS = [
  'blur',
  'brightness',
  'contrast',
  'dropShadow',
  'grayscale',
  'hueRotate',
  'invert',
  'opacity',
  'saturate',
  'sepia',
  'url',
] as const

/* The transform functions of Chromium 153, as named in CSS. */
const SUPPORTED_TRANSFORMS = [
  'matrix',
  'matrix3d',
  'translate',
  'translate3d',
  'translateX',
  'translateY',
  'translateZ',
  'scale',
  'scale3d',
  'scaleX',
  'scaleY',
  'scaleZ',
  'rotate',
  'rotate3d',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skew',
  'skewX',
  'skewY',
  'perspective',
] as const

/* Attributes set by other names than those of the element properties. */
const ATTRIBUTE_PROPERTIES: Record<string, string> = { for: 'htmlFor' }

/* Attributes valid on all elements, not reflected as element properties. */
const UNREFLECTED_ATTRIBUTES = new Set(['ariaOwns', 'is', 'itemProp'])

/* The lower-cased property names of the elements, read when first needed. */
const elementProperties = new Map<string, Set<string>>()

const getElementProperties = (tagName: string) => {
  let properties = elementProperties.get(tagName)
  if (!properties) {
    properties = new Set()
    // the attributes are reflected as properties, in the prototype chain
    for (const name in document.createElement(tagName)) {
      properties.add(name.toLowerCase())
    }
    elementProperties.set(tagName, properties)
  }
  return properties
}

/*
 * Events without handler properties, e.g. oncompositionend, or with them
 * only on touch devices, e.g. ontouchstart.
 */
const EVENTS_WITHOUT_HANDLERS = new Set([
  'compositionstart',
  'compositionupdate',
  'compositionend',
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
])

/* The style properties of the browser, read when first needed. */
let supportedStyles: Set<string> | null = null
const getSupportedStyles = () =>
  (supportedStyles ??= new Set(Object.keys(document.documentElement.style)))

const Browser = {
  /**
   * Checks if the browser supports the attribute on the element, as
   * a property of the element in any letter case, e.g. tabIndex. Meant
   * for debug mode, as the check creates an element of each tag name.
   */
  isAttributeSupported(this: void, key: string, tagName: string): boolean {
    if (UNREFLECTED_ATTRIBUTES.has(key)) {
      return true
    }
    const properties = getElementProperties(tagName)
    const name = (ATTRIBUTE_PROPERTIES[key] ?? key).toLowerCase()
    // the ARIA relations are reflected as the related elements
    return (
      properties.has(name) ||
      properties.has(`${name}element`) ||
      properties.has(`${name}elements`)
    )
  },

  /**
   * Checks if the browser supports the event of the listener, e.g. onClick,
   * on the element, as its handler property, e.g. onclick. Meant for debug
   * mode, as the check creates an element of each tag name.
   */
  isEventSupported(this: void, key: string, tagName: string): boolean {
    const event = getEventName(key)
    return (
      EVENTS_WITHOUT_HANDLERS.has(event) ||
      getElementProperties(tagName).has(`on${event}`)
    )
  },

  isStyleSupported(this: void, key: string): boolean {
    return key.startsWith('--') || getSupportedStyles().has(key)
  },

  isFilterSupported(this: void, key: string): boolean {
    return (SUPPORTED_FILTERS as readonly string[]).includes(key)
  },

  isTransformSupported(this: void, key: string): boolean {
    return (SUPPORTED_TRANSFORMS as readonly string[]).includes(key)
  },

  SUPPORTED_FILTERS,
  SUPPORTED_TRANSFORMS,
}

export type FilterName = (typeof SUPPORTED_FILTERS)[number]

export type TransformName = (typeof SUPPORTED_TRANSFORMS)[number]

export default Browser
