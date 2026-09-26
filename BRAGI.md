## Bragi

Bragi is a templating engine, allowing to express rendered content by objects, arrays and primitive types.

```js
const rectangle = [
  'section',
  {
    class: 'rectangle',
    style: {
      backgroundColor: 'white',
      height: [120, 'px'],
      width: [80, 'px'],
    },
  },
]
```

```js
const link = [
  'a',
  {
    class: ['link', { highlighted }],
    href: 'https://www.opera.com',
  },
  'Opera',
]
```

```js
const list = ['ul', ['li', 'First item'], ['li', 'Second item']]
```
