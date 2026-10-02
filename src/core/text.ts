import type { TextDescription } from './description.js'
import VirtualNode from './virtual-node.js'

class Text extends VirtualNode {
  static NodeType = 'text'

  declare description: TextDescription
  declare ref: globalThis.Text

  constructor(description: TextDescription, parentNode?: VirtualNode) {
    super(description, parentNode)
    this.attachDOM()
  }

  get nodeType(): string {
    return Text.NodeType
  }

  attachDOM() {
    this.ref = document.createTextNode(this.description.text)
  }
}

export default Text
