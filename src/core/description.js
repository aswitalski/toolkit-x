{
  /*
   * Normalized description of a template.
   * Is used to calculate differences between nodes.
   */
  class Description {

    get childrenAsTemplates() {
      if (this.children) {
        return this.children.map(child => child.asTemplate);
      }
      return undefined;
    }

    isCompatible(description) {
      return this.constructor === description.constructor;
    }
  }

  /*
   * Defines a normalized description of a component.
   *
   * Enumerable properties:
   * - key (a unique node identifier within its parent),
   * - component (an object with meta information)
   * - children (an array of child nodes)
   * - props (an object of any component rendering props)
   *
   * Non-enumerable properties:
   * - asTemplate: returns component description as a normalized template
   */
  class ComponentDescription extends Description {

    constructor(component) {
      super();
      this.component = component;
      this.type = 'component';
    }

    isCompatible(description) {
      return super.isCompatible(description) &&
          this.component === description.component;
    }

    get isRoot() {
      return this.component.prototype instanceof opr.Toolkit.Root;
    }

    get asTemplate() {
      const template = [this.component];
      if (this.props) {
        template.push(this.props);
      }
      if (this.children) {
        template.push(...this.children.map(child => child.asTemplate));
      }
      return template;
    }
  }

  /*
   * Defines a normalized description of an element.
   *
   * Enumerable properties:
   * - key (a unique node identifier within its parent),
   * - name (a string representing tag name),
   * - text (a string representing text content),
   * - children (an array of child nodes),
   * - props (an object) defining:
   *    - class (a class name string)
   *    - style (an object for style property to string value mapping)
   *    - listeners (an object for event name to listener mapping)
   *    - attrs (an object for normalized attribute name to value mapping)
   *    - dataset (an object representing data attributes)
   *    - properties (an object for properties set directly on DOM element)
   *
   * Non-enumerable properties:
   * - asTemplate: returns element description as a normalized template
   */
  class ElementDescription extends Description {

    constructor(name) {
      super();
      this.name = name;
      this.type = 'element';
    }

    isCompatible(description) {
      return super.isCompatible(description) && this.name === description.name;
    }

    get asTemplate() {
      const template = [this.name];
      const props = {};
      if (this.key) {
        props.key = this.key;
      }
      if (this.class) {
        props.class = this.class;
      }
      if (this.style) {
        props.style = this.style;
      }
      if (this.attrs) {
        Object.assign(props, this.attrs);
      }
      if (this.dataset) {
        props.dataset = this.dataset;
      }
      if (this.listeners) {
        Object.assign(props, this.listeners);
      }
      if (this.properties) {
        props.properties = this.properties;
      }
      if (Object.keys(props).length) {
        template.push(props);
      }
      if (this.children) {
        template.push(...this.children.map(child => child.asTemplate));
      } else if (typeof this.text === 'string') {
        template.push(this.text);
      }
      return template;
    }
  }

  /*
   * Description of a Comment node.
   */
  class CommentDescription extends Description {

    constructor(text) {
      super();
      this.text = text;
      this.type = 'comment';
    }

    get asTemplate() {
      return null;
    }

    isCompatible(description) {
      return super.isCompatible(description) && this.text === description.text;
    }
  }

  /*
   * Description of a Text node.
   */
  class TextDescription extends Description {

    constructor(text) {
      super();
      this.text = text;
      this.type = 'text';
    }

    get asTemplate() {
      return this.text;
    }

    isCompatible(description) {
      return super.isCompatible(description) && this.text === description.text;
    }
  }

  Object.assign(Description, {
    ElementDescription,
    ComponentDescription,
    CommentDescription,
    TextDescription,
  });

  module.exports = Description;
}
