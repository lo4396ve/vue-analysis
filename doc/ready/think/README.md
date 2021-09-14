# 动手前的思考

如果让你高仿一个vue，你应该怎么做？

一个演员要想演好一个角色，必须先了解这个角色。我们也是一样，要想高仿一个东西，那么首先应该去了解他，从他是怎么使用的、他能干什么、他是什么？这三个问题出发先思考一下。

## 如何使用
先了解vue是怎么使用的，用过vue-cli搭建过项目的应该都清楚，项目入口文件main.js：
```
import Vue from 'vue'
import App from './App.vue'

new Vue({
  render: h => {
    return h(App)
  },
}).$mount('#app')
```

从main.js可以猜出来，既然使用了new Vue，说明Vue是一个构造函数或者一个class类，还能看出来在Vue这个构造方法或者这个类上面还有一个$mount，大胆的猜一下$mount方法还是一个静态方法。现在脑子里已经有一个Vue的模型了，大致上就是一个含有$mount静态方法的构造函数或者类。

## 可以做什么
接着再考虑第二个问题，vue可以做什么。还是看main.js，这短短的几行代码就可以把App这个组件渲染到html页面上，结合它的用法，可以猜到肯定是传的render方法把App组件转化成了浏览器认识的dom，然后用$mount方法把dom添加在id为app的这个div上。
那么好了，现在可以再大胆的猜一下，render这个函数的作用就是把组件变成dom的，因为要想用js创建dom，必须使用document提供的一些创建dom的方法，那么很有可能最后就是调用的最常用的doeument.createElement方法。$mount的作用是把创建的dom放在html中，那么很有可能在其内部就是使用的document.getElementById('#app').appendChild(dom)。

目前为止上面都是一些猜测，可以提前告诉大家，上面基本上都猜对了，起码实现原理是对的。这并不是因为我看过源码之后才说的马后炮，因为就从mian.js这几行代码来看，似乎只有这一种方式能最好的实现。

现在还剩一个问题就是Vue到底是一个构造函数还是一个class类，说实话从main.js确实无法准确判断，那么就继续思考最后一个问题。

## 是什么
结合前面的分析，还剩一件事没有确定，就是Vue到底是一个构造函数还是一个class类的问题，那么只有打开Vue源码去看，打开准备好的源码，找到src/core/instace/index.js：
```
...

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

...

export default Vue

```
真相大白是一个构造函数，至于为什么是一个构造函数而不是class，暂时先不管后面再分析。

继续分析main.js，还会发现一个问题，render还会接受一个参数h，从h(App)的使用方式来看，h也是一个函数，那么h到底是干什么的，不妨先看看h(App)会返回一个什么结果，把main.js改造一下：
```
import Vue from './vue.runtime.esm.js'
import App from './App.vue'

new Vue({
  render: h => {
    const result = h(App)
    console.log(result)
    return result
  },
}).$mount('#app')
```

运行项目，打印一下h(App)的结果，发现结果是一个VNode类型的js对象，包含children、child、elm、data等属性，并且其child属性是一个VueComponent类型的对象，点开child发现其下面还有一些$attrs、$children、$el、$parent属性。有这些信息，估计大家都猜出来了，外层的VNode有child属性，child内部有$parent属性，很明显这是一个具有父子关系的数据结构，同时发现elm和$el都是指向了页面的真实dom。可以假设VNode和VueComponent都是vue创建的虚拟dom。

为什么一口咬定VNode和VueComponent就是虚拟dom呢？回答这个问题之前先思考一个问题什么是真实dom。后面这个问题很好解答，写个dom.html看一下:
```
<html>
<head>
  <script>
    window.onload = function() {
      const mydiv = document.getElementById('mydiv');
      console.dir(mydiv)
    }
  </script>
</head>
<body>
  <div id="mydiv">
    <p>test</p>
  </div>
</body>
</html>
```

打印出来的其实也是一个对象，所谓的真实dom也是一个js对象，包含非常多的属性，其中也有children属性指向p元素，而p元素也有parentNode属性指向div元素，那么虚拟dom实际上也是一个js对象，内部也包含了许多描述这个虚拟dom的属性。vue之所以自创虚拟dom而不是使用真实dom，这就回到了大家常说的js操作dom性能差的问题，vue使用自己的一套虚拟dom这一结构，在渲染之前都是以js对象形式存在，并没有真实dom，所以vue操作一个虚拟dom，就是操作一个对象这么简单。由此也回答了上面的问题，一口咬定VNode和VueComponent就是虚拟dom就是因为打印出来的VNode和VueComponent和真实的dom对象长得像。

## 总结

经过上面几个问题的分析，对vue基本有一个概念了，甚至脑海里已经有一个vue的模型了。此时对vue源码的解析已经迈出第一步了，但是光靠猜无法理解到vue的精髓，还得深入到源码去解读。
上面说了这么多，最重要的是学会分析问题的思路，而不仅仅是掌握了一个简易版的vue模型，深入到源码很多地方还会继续使用这种思路去分析难以理解的代码块。掌握思路更重要。

