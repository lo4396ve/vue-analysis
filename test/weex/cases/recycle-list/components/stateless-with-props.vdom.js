({
  type: 'recycle-list',
  attr: {
    append: 'tree',
    listData: [
      { type: 'A', poster: 'xx', title: 'x' },
      { type: 'A', poster: 'yy', title: 'y' }
    ],
    switch: 'type',
    alias: 'item'
  },
  children: [{
    type: 'cell-slot',
    attr: { append: 'tree', case: 'A' },
    children: [{
      type: 'div',
      attr: {
        '@isComponentRoot': true,
        '@componentProps': {
          imageUrl: { '@binding': 'item.poster' },
          title: { '@binding': 'item.title' }
        }
      },
      children: [{
        type: 'image',
        classList: ['image'],
        attr: {
          src: { '@binding': 'imageUrl' }
        }
      }, {
        type: 'text',
        classList: ['title'],
        attr: {
          value: { '@binding': 'title' }
        }
      }]
    }, {
      type: 'text',
      attr: {
        value: 'content'
      }
    }]
  }]
})
