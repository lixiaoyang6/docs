## 核心注册函数代码：

两种实现方式

- 对象形式
- 数组形式

```ts
import user from './user'
import button from './event/button' // 按钮点击事件监听逻辑
import error from './monitor/error' // 全局错误监控逻辑
import reject from './monitor/reject' // 全局 Promise 错误监控逻辑
import ajax from './request/ajax' // 全局 XMLHttpRequest 监控逻辑
import onePage from './page/index' // 单页面 PV 统计逻辑
import page from './pv/page'
import { send } from './type'

/*class Tracker {
    events: Record<string, Function>;
    constructor() {
        // 初始化事件处理函数列表（当前只有处理按钮点击的函数）
        this.events = { button, error }  // 键和值名字一样
        this.init() // 启动事件监听
    }
    // 上报埋点数据
    protected sendRequest(params = {}){
        let userInfo = user()
        const body = {
            ...params,
            ...userInfo
        }
        let blob = new Blob([JSON.stringify(body)], {type: 'application/json'})
        navigator.sendBeacon('http://localhost:3000/tracker', blob) // 可靠上报, 确保页面卸载时（如关闭、跳转）数据不丢失。
    }

    // 初始化事件监听
    private init() {
        Object.keys(this.events).forEach(key => {
            this.events[key](this.sendRequest)  // 开始监听
        })
    }
}*/

class Tracker {
    //TODO 第一个send？？？
    events: ((send: send) => void)[]; // 定义事件处理函数数组
    constructor() {
        this.events = [button, error, reject, ajax, page, onePage]; // 直接存储处理函数
        this.init();
    }

    // 上报埋点数据
    protected sendRequest(params = {}){
        let userInfo = user()
        const body = {
            ...params,
            ...userInfo
        }
        let blob = new Blob([JSON.stringify(body)], {type: 'application/json'})
        navigator.sendBeacon('http://localhost:3000/tracker', blob) // 可靠上报, 确保页面卸载时（如关闭、跳转）数据不丢失。
    }

    private init() {
        // 遍历数组，执行每个处理函数
        this.events.forEach(fn => {
            fn(this.sendRequest);
        });
    }
}

export default Tracker;
```

## src/event/button.ts

```ts
import type { send } from '../type'event
import { Token } from '../type/enum'
export default function button(send: send){
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement
        console.log(target)
        const flag = target.getAttribute(Token.click)
        console.log(flag)
        if(flag){
            send({
                type: 'click',
                text: flag,
                data: target.getBoundingClientRect()
            })
        }
    })
}
```

## src/monitor/error.ts

```ts
import { send } from '../type'

export default function error(send: send){
    // ErrorEvent 是浏览器中用于表示错误事件的接口，专门用于捕获 JavaScript 运行时错误。
    window.addEventListener('error', (event) => {
        console.log(event)
        send({
            type: event.type,
            data: {
                line: event.lineno,
                file: event.filename // 引发错误的脚本文件 URL。
            },
            text: event.message
        })
    })
}
```

## src/monitor/reject.ts

```ts
import { send } from '../type'

export default function reject(send: send){
    // ErrorEvent 是浏览器中用于表示错误事件的接口，专门用于捕获 JavaScript 运行时错误。
    window.addEventListener('unhandledrejection', (event) => {
        console.log(event)
        send({
            type: event.type,
            data: {
                reason: event.reason,
                href: location.href
            },
            text: event.reason
        })
    })
}
```

## src/request/ajax.ts

```ts
import { send } from '../type'

export default function ajax(send: send) {
    const OriginOpen  = XMLHttpRequest.prototype.open
    const OriginSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.open = function(method: string, url: string, async: boolean = true) {
        send({
            type: 'ajax',
            data: {
                method,
                url
            },
            text: 'ajax123456'
        })
        OriginOpen.call(this, method, url, async)
        XMLHttpRequest.prototype.send = function(data: any) {
            send({
                type: 'ajax-send',
                data,
                text: 'ajax-send123456'
            })
            OriginSend.call(this, data)
        }
    }

    const OriginFetch = window.fetch
    window.fetch = function(...args) {
        send({
            type: 'fetch',
            data: args,
            text: 'fetch123456'
        })
        return OriginFetch.apply(this, args)
    }
}
```

## src/pv/page.ts

```ts
import { send } from '../type'

export default function page(send: send){
    window.addEventListener('hashchange', (e) => {
        // console.log(e)
        send({
            type: 'pv-hash',
            data: {
                newURL: e.newURL,
                oldURL: e.oldURL
            },
            text: 'pv-hash'
        })
    })

    window.addEventListener('popstate', (e) => {
        // console.log(e)
        send({
            type: 'pv-history',
            data: {
                state: e.state,
                url: location.href
            },
            text: 'pv-history'
        })
    })

    const pushState = history.pushState
    window.history.pushState = function (state, title, url){
        const res = pushState.call(this, state, title, url)
        const event = new Event('myPushState')
        window.dispatchEvent(event)
        return res
    }

    window.addEventListener('myPushState',e=>{
        console.log(e)
        send({
            type: 'pv=pushState',
            data: {
                url: location.href
            },
            text: 'pv-pushState'
        })
    })
}
```

## src/page/index.ts

```ts
// 统计首屏加载时间
import { send } from '../type';

export default function onePage(send:send){
    let firstScreenTime = 0;
    const ob = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            firstScreenTime = performance.now();
        });
        if(firstScreenTime > 0){
            send({
                type: 'firstScreen',
                data: {
                    time: firstScreenTime
                },
                text: '首屏加载时间'
            });
            ob.disconnect();
        }
    });
    ob.observe(document,{ subtree: true, childList: true});
}
```



