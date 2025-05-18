## 代码渐进理解版

### v1.0

- 给jQuery.prototype起了一个别名jQuery.fn，我的理解是不起别名也可以，直接把init函数挂在到jQuery.prototype也可以。
- init函数调用方式为jQuery.fn.init();所以init函数中this指向调用者jQuery.fn

```js
(function(){
  const jQuery = function(selector, context = document){
      return new jQuery.fn.init(selector, context);
  }
  jQuery.fn = jQuery.prototype;
  jQuery.fn.init = function(selector, context){
      console.log("jQuery.fn.init",this)
      console.log(this === jQuery.fn) // true
      console.log(this === jQuery.prototype) // true
      return this; // 这里的this指向jQuery.fn也就是jQuery.prototype
  }
  console.dir(jQuery);
  jQuery.fn.init();

  window.jQuery = jQuery;
  window.$ = jQuery;
})(typeof window!== 'undefined'? window : globalThis)

// $('div')
```



### v2.0

- console.log("jQuery.fn.init",this)会带上dom属性，但此时真正应该没有
- console.log("当前 this 状态", { ...this }); // {} 真实this  可以看到没有dom属性
- 此时$('div')是jQuery.fn.init的实例，但是不是jQuery的实例

```js
(function(){
  const jQuery = function(selector, context = document){
    return new jQuery.fn.init(selector, context); // 这里应该是jQuery.fn.init是一个方法，而不是jQuery.fn对象调用init
  }
  jQuery.fn = jQuery.prototype;
  jQuery.fn.init = function(selector, context){
    // 帮助理解 非核心代码
    // 浏览器控制台对对象的输出是动态引用，而非静态快照。尽管 obj 在 console.log 之后被修改，但展开对象时会显示最新状态。
    console.log("jQuery.fn.init",this) // 对象有dom属性，指向匹配的元素集
    console.log("当前 this 状态", { ...this }); // {} 真实this
    console.log(this === jQuery.fn) // false
    console.log(this === jQuery.prototype) // false
    console.log(selector, 111);
    // 构造函数中this指向实例对象
    console.log(this instanceof jQuery.fn.init); // true
    console.log(this.constructor === jQuery.fn.init); // true
    console.log(this instanceof jQuery) // false

    console.log(this)
    if(!selector) return this; // 空选择器返回空集
    this.dom = document.querySelectorAll(selector); // 选择器匹配元素集
    return this;
  }
  console.dir(jQuery);
  // jQuery.fn.init();

  window.jQuery = jQuery;
  window.$ = jQuery;
})(typeof window!== 'undefined'? window : globalThis)

console.log($('div'))
```



### v2.1

添加了text函数

```js
// v3 这段代码没有这行代码jQuery.fn.init.prototype = jQuery.fn;实际上是有问题的，因为$('div')此时不是jQuery的实例
// $('div')对象的原型指向Object
(function(){
  const jQuery = function(selector, context = document){
    return new jQuery.fn.init(selector, context);
  }
  jQuery.fn = jQuery.prototype;
  jQuery.fn.init = function(selector, context){
    if(!selector) return this; // 空选择器返回空集
    this.dom = document.querySelectorAll(selector); // 选择器匹配元素集
    return this;
  }

  jQuery.fn.text = function(text){
    this.dom.forEach(el => {
      el.textContent = text;
    });
    return this;
  }

  window.jQuery = jQuery;
  window.$ = jQuery;
})(typeof window!== 'undefined'? window : globalThis)
const $div = $('div');
console.log($div)
console.log($div instanceof jQuery.fn.init);      // true
console.log($div.__proto__ === jQuery.prototype); // false
```



### v3.0

- 关键代码jQuery.fn.init.prototype = jQuery.fn; 此时的init创建出来的对象才是jQuery的实例。
- console.log($div instanceof jQuery.fn.init);  //true
- console.log($div.__proto__ === jQuery.prototype); // true

```js
(function(){
  const jQuery = function(selector, context = document){
    return new jQuery.fn.init(selector, context);
  }
  jQuery.fn = jQuery.prototype;
  jQuery.fn.init = function(selector, context){
    if(!selector) return this; // 空选择器返回空集
    this.dom = document.querySelectorAll(selector); // 选择器匹配元素集
    return this;
  }

  // 将 init 的原型指向 jQuery 的原型
  jQuery.fn.init.prototype = jQuery.fn; // 即 jQuery.prototype

  jQuery.fn.text = function(text){
    this.dom.forEach(el => {
      el.textContent = text;
    });
    return this;
  }

  window.jQuery = jQuery;
  window.$ = jQuery;
})(typeof window!== 'undefined'? window : globalThis)
const $div = $('div');
console.log($div instanceof jQuery.fn.init);      // true
console.log($div.__proto__ === jQuery.prototype); // true jQuery.fn.init.prototype = jQuery.fn;导致的true

let obj = $div.text('hello') // 设置div元素的文本内容
console.log(obj)
```



### v3.1

- 增加了css、parent、siblings等方法

```js
(function(){
  const jQuery = function(selector, context = document){
    return new jQuery.fn.init(selector, context);
  }
  jQuery.fn = jQuery.prototype;
  jQuery.fn.init = function(selector, context){
    if(!selector) return this; // 空选择器返回空集
    this.dom = document.querySelectorAll(selector); // 选择器匹配元素集
    return this;
  }

  // 将 init 的原型指向 jQuery 的原型
  jQuery.fn.init.prototype = jQuery.fn; // 即 jQuery.prototype

  jQuery.fn.text = function(text){
    this.dom.forEach(el => {
      el.textContent = text;
    });
    return this;
  }

  jQuery.fn.css = function(key, value){
    this.dom.forEach(el => {
      el.style[key] = value;
    });
    return this;
  }

  jQuery.fn.parent = function(){
    return this.dom[0].parentElement;
  }

  jQuery.fn.siblings = function(){
    let siblings = [];
    let parent = this.parent();
    for(let i = 0; i < parent.children.length; i++){
      if(parent.children[i] !== this.dom[0]){
        siblings.push(parent.children[i]);
      }
    }
    return siblings;
  }

  jQuery.fn.next = function(){
    return this.dom[0].nextElementSibling;
  }

  jQuery.fn.prev = function(){
    return this.dom[0].previousElementSibling;
  }

  window.jQuery = jQuery;
  window.$ = jQuery;
})(typeof window!== 'undefined'? window : globalThis)
const $div = $('div');
// let obj = $div.text('hello')
// let obj = $div.text('hello').css('color', 'blue')
// let obj = $div.text('hello').css('color', 'blue').parent()
//TODO 我不懂为什么课程里一个div也没有
let obj = $div.text('hello').css('color', 'blue').siblings()
console.log(obj)
```



### v3.2最终版

添加了animate、$extend等方法

```js
(function(){
  const jQuery = function(selector, context = document){
    return new jQuery.fn.init(selector, context);
  }
  jQuery.fn = jQuery.prototype;
  jQuery.fn.init = function(selector, context){
    if(!selector) return this; // 空选择器返回空集
    this.dom = document.querySelectorAll(selector); // 选择器匹配元素集
    return this;
  }

  // 将 init 的原型指向 jQuery 的原型
  jQuery.fn.init.prototype = jQuery.fn; // 即 jQuery.prototype

  jQuery.fn.text = function(text){
    this.dom.forEach(el => {
      el.textContent = text;
    });
    return this;
  }

  jQuery.fn.css = function(key, value){
    this.dom.forEach(el => {
      el.style[key] = value;
    });
    return this;
  }

  jQuery.fn.parent = function(){
    return this.dom[0].parentElement;
  }

  jQuery.fn.siblings = function(){
    let siblings = [];
    let parent = this.parent();
    for(let i = 0; i < parent.children.length; i++){
      if(parent.children[i] !== this.dom[0]){
        siblings.push(parent.children[i]);
      }
    }
    return siblings;
  }

  jQuery.fn.next = function(){
    return this.dom[0].nextElementSibling;
  }

  jQuery.fn.prev = function(){
    return this.dom[0].previousElementSibling;
  }

  jQuery.fn.animate = function(properties, duration, easing = 'linear', callback) {
    let startStyle = {};
    // 动画启动时记录的时间戳
    const startTime = performance.now(); // 单位为毫秒
    console.log(startTime);
    const currentDom = this.dom[0];
    for(let key in properties){
      // startStyle[key] = currentDom.style[key]; // 读取内联style样式
      startStyle[key] = parseFloat(getComputedStyle(currentDom)[key]);
    }
    console.log(startStyle);
    const animateStep = (currentTime) => {
      const easingFunctions = {
        linear: (t) => t,
        easeIn: (t) => t * t,
        easeOut: (t) => t * (2 - t),
        easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      }
      const easingFunction = easingFunctions[easing];

      // currentTime每次执行动画帧回调时，由 requestAnimationFrame 自动传入的最新时间戳。
      const elapsed = currentTime - startTime;
      //console.log(elapsed);
      const progress = Math.min(elapsed / duration, 1);
      const easingValue = easingFunction(progress);
      const cssNumberProperties = ['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'zoom']

      for(let key in properties) {
        const startValue = startStyle[key];
        const endValue = properties[key];
        const value = startValue + (endValue - startValue) * easingValue;
        currentDom.style[key] = cssNumberProperties.includes(key)? value : value + 'px';
      }
      if(progress < 1){
        requestAnimationFrame(animateStep);
      }else{
        callback && callback();
      }
    }
    requestAnimationFrame(animateStep);
  }

  jQuery.ajax = function(url, options){
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || 'GET', url);
    xhr.send(options.data || null)
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4){
        if(xhr.status === 200){
          options.success && options.success(xhr.responseText);
        }else{
          options.error && options.error(xhr.status);
        }
      }
    }
  }

  jQuery.fn.$extend = function(obj){
    for(let key in obj){
      this[key] = obj[key];
    }
    return this;
  }

  jQuery.ready = function(callback){
    // 支持async defer加载
    if(document.readyState === 'complete'){
      callback();
    }else {
      document.addEventListener('DOMContentLoaded', callback);
    }
  }


  window.jQuery = jQuery;
  window.$ = jQuery;
})(typeof window!== 'undefined'? window : globalThis)

// $('div').animate({width: 500, height: 500, opacity: 1}, 1000, 'easeIn', () => {})

$.ajax('http://localhost:63342/JQ/index.html', {success: function(data){
  console.log(data)}
})

$.fn.$extend({
  fadeIn: function(duration, callback){
    this.animate({opacity: 1}, duration, 'linear', callback);
  },
  fadeOut: function(duration, callback){
    this.animate({opacity: 0}, duration, 'linear', callback);
  }
})
/*
$('div').fadeIn(3000, () => {
  console.log('动画结束');
})*/
$.ready(function(){
  $('div').fadeIn(2000, () => {
    console.log('动画结束1');
  })

  setTimeout(() => {
    $('div').fadeOut(2000, () => {
      console.log('动画结束2');
    })
  }, 1000)
})
```