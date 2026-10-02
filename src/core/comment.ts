import type { CommentDescription } from './description.js'
import VirtualNode from './virtual-node.js'

class Comment extends VirtualNode {
  static NodeType = 'comment'

  declare description: CommentDescription
  declare ref: globalThis.Comment

  constructor(description: CommentDescription, parentNode?: VirtualNode) {
    super(description, parentNode)
    this.attachDOM()
  }

  get nodeType(): string {
    return Comment.NodeType
  }

  attachDOM() {
    this.ref = document.createComment(` ${this.description.text} `)
  }
}

export default Comment
