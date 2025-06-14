## effect.ts

```ts
let activeEffect;
interface Options {
    lazy?: boolean;
    scheduler?: Function;
}

export const effect = (fn: Function, options?: Options) => {
    const _effect = () => {
        activeEffect = _effect; // 1. 设置当前激活的副作用函数
        return fn(); // 2. 执行原始函数并返回结果
    }
    _effect.options = options;
    // 当 options.lazy 为 true 时（比如在 computed 中使用的场景），我们不立即执行函数
    if(options && options.lazy){
        return _effect;
    }else{  // 当不传 lazy 选项或 lazy=false 时，需要立即执行副作用函数
        _effect();
        return _effect;
    }
}

let targetMap = new WeakMap();

export const tracker = (target: any, key: string | Symbol) => {
    let depsMap = targetMap.get(target);
    if(!depsMap){
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let deps = depsMap.get(key);
    if(!deps){
        deps = new Set();
        depsMap.set(key, deps);
    }
    if (!activeEffect) return; // 添加安全判断
    deps.add(activeEffect);
    console.log(targetMap);
}

export const trigger = (target: any, key: string | Symbol) => {
    const depsMap = targetMap.get(target);
    const deps: Set<any> = depsMap.get(key);
    if(!deps) return;
    deps.forEach(effect => {
        if(effect.options && effect.options.scheduler){
            effect.options.scheduler(effect);
        }else{
            effect();
        }
    })
}
```

## reactive.ts

```ts
import { tracker, trigger } from './effect'

export const reactive = <T extends object>(value: T) => {
    return new Proxy(value, {
        get(target, key, receiver) {
            tracker(target, key)
            return Reflect.get(target, key, receiver)
        },
        set(target, key, value, receiver) {
            let res = Reflect.set(target, key, value, receiver)
            trigger(target, key);
            return res
        }
    })
}
```

## computed

```ts
import { effect } from './effect'

export const computed = (getter: Function) => {
    let dirty = true; // 第一次获取值时，需要执行getter，所以dirty为true
    let value; // 缓存的计算结果
    const _value = effect(getter,{
        lazy: true,
        scheduler() { // 依赖变化时的调度函数
            dirty = true;
        }
    });

    // 3. 定义计算属性的包装对象
    class ComputedRefImpl {
        get value() {
            if(dirty){
                value = _value(); // 执行 getter 获取新值
                dirty = false;
            }
            return value; // 返回缓存值
        }
    }

    return new ComputedRefImpl(); // 返回计算属性实例
}
```

## watch.ts

```ts
import {effect} from "./effect";

interface Options {
  immediate?: boolean;
  flush?: 'pre' | 'post' | 'sync'; // 控制回调执行时机
}

// 深层遍历对象所有属性，触发它们的 getter 操作   观察 obj 时，obj.a.b 的变化也能触发回调
const traverse = (value: any, seen = new Set()) => {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return value;
  }
  seen.add(value);
  // 处理数组
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      value[index] = traverse(item, seen); // 递归处理数组元素
    });
  }
  // 处理普通对象
  else {
    for (const key in value) {
      value[key] = traverse(value[key], seen); // 递归处理对象属性
    }
  }
  return value;
};

export const watch = (target: any, cb: Function, options?: Options) => {
  // 1. 生成getter函数
  let getter: Function;
  if (typeof target === 'function') {
    getter = target;
  } else {
    getter = () => traverse(target);
  }

  let oldValue, newValue; // 这两个变量是持久性的 因为形成了闭包
  // 2. 调度任务 (变化时执行)
  const job = () => {
    newValue = effectFn();
    cb(newValue, oldValue);
    oldValue = newValue;
  };

  // 3. 创建响应式副作用
  const effectFn = effect(getter, {
    lazy: true,
    scheduler: job
  });

  // 4. 初始化处理
  if(options && options.immediate){
    job(); // 立即执行一次
  }else{
    oldValue = effectFn(); // 手动运行获取初始值
  }
};
```

## ref.ts

```ts
import { reactive } from "./reactive"
import { tracker, trigger } from "./effect"

const isObject = (value: any) => {
    return value !== null && typeof value === 'object';
}

const toReactive = (value: any) => {
    return isObject(value) ? reactive(value) : value;
}

export const ref = <T>(value: T) => {
    return new RefImpl<T>(value);
}

class RefImpl<T> {
    private _value: T;
    constructor(value) {
        this._value = toReactive(value);
    }

    get value() {
        tracker(this, 'value');
        return this._value;
    }
    set value(newValue) {
        if(newValue === this._value) return;
        this._value = toReactive(newValue);
        trigger(this, 'value');
    }
}
```

## renderer.ts

```ts
import { VNode } from './vnode'
import { reactive } from "../reactivity/reactive";
import { effect } from "../reactivity/effect";
import { queueJob } from "./queue";

let _uid = 1;
export const createRenderer = () => {
    const unmount = (vnode: VNode) => {
        const p = vnode.el.parentNode
        p && p.removeChild(vnode.el)
    }

    const setElementText = (el: HTMLElement, text) => {
        el.textContent = text // 设置时，会删除所有子节点并替换为指定字符串的文本节点。
    }

    const insert = (el: HTMLElement, parent, anchor = null)=> {
        parent.insertBefore(el, anchor)
    }

    const createElement = (tag): HTMLElement => {
        return document.createElement(tag)
    }

    const mountElement = (vnode: VNode, container: any, anchor = null) => {
        const root = createElement(vnode.tag);
        vnode.el = root // 让每个虚拟节点"记住"它所对应的真实DOM元素
        if(typeof vnode.children ==='string'){
            setElementText(root, vnode.children)
        }else if(Array.isArray(vnode.children)){
            vnode.children.forEach(child => {
                patch(null, child, root)
            })
        }
        if(vnode.props){
            for(let key in vnode.props){
                console.log(key);
                if(key.startsWith('on')){
                    for(let event in vnode.props[key]){
                        root.addEventListener(event, vnode.props[key][event])
                    }
                }else{
                    root.setAttribute(key, vnode.props[key])
                }
            }
        }
        insert(root, container, anchor)
    }

    const patchElement = (n1, n2) => {
        const el = n2.el = n1.el // 因为是更新阶段，所以n1.el一定存在
        // patchChildren(n1, n2, el)
        patchKeyChildren(n1, n2, el)
    }

    const patchChildren = (n1: VNode, n2:  VNode, container) => {
        n2.el = n1.el
        if(typeof n2.children === 'string'){
            // 不写也可以 因为textContent会覆盖所有子节点
            if (Array.isArray(n1.children)) {
                // 旧节点是数组，卸载所有旧子节点
                n1.children.forEach(child => unmount(child));
            }
            setElementText(container, n2.children)
        }else if(Array.isArray(n2.children)){
            if(Array.isArray(n1.children)){
                n1.children.forEach((child)=>{
                    unmount(child)
                })
                n2.children.forEach((child) => {
                    patch(null, child, container)
                })
            }else{
                setElementText(container, '') // 注意
                n2.children.forEach((child) => {
                    patch(null, child, container)
                })
            }
        }
    }

    const isSameVNodeType = (n1, n2) => {
        return n1.type === n2.type && n1.key === n2.key;
    };

    function getSequence(arr: number[]): number[] {
        const p = arr.slice()
        const result = [0]
        let i, j, u, v, c
        const len = arr.length
        for (i = 0; i < len; i++) {
            const arrI = arr[i]
            if (arrI !== 0) {
                j = result[result.length - 1]
                if (arr[j] < arrI) {
                    p[i] = j
                    result.push(i)
                    continue
                }
                u = 0
                v = result.length - 1
                while (u < v) {
                    c = (u + v) >> 1
                    if (arr[result[c]] < arrI) {
                        u = c + 1
                    } else {
                        v = c
                    }
                }
                if (arrI < arr[result[u]]) {
                    if (u > 0) {
                        p[i] = result[u - 1]
                    }
                    result[u] = i
                }
            }
        }
        u = result.length
        v = result[u - 1]
        while (u-- > 0) {
            result[u] = v
            v = p[v]
        }
        return result
    }

    const patchKeyChildren = (n1, n2, container) => {
        let j = 0;
        // 这里代码有问题 没有判断n1.children是否为数组
        const oldChildren = n1.children as VNode[];
        const newChildren = n2.children as VNode[];
        let e1 = oldChildren.length - 1;
        let e2 = newChildren.length - 1;
        while(j <= e1 && j <= e2){
            const n1 = oldChildren[j];
            const n2 = newChildren[j];
            if(isSameVNodeType(n1, n2)){
                patch(n1, n2, container);
            }else{
                break;
            }
            j++;
        }
        while(j <= e1 && j <= e2){
            const oldChild = oldChildren[e1];
            const newChild = newChildren[e2];
            if(isSameVNodeType(oldChild, newChild)){
                patch(oldChild, newChild, container);
            }else{
                break;
            }
            e1--;
            e2--;
        }
        if(j > e1){
            while(j <= e2){
                patch(null, newChildren[j], container);
                j++;
            }
        }else if(j > e2){
            while(j <= e1){
                unmount(oldChildren[j]);
                j++;
            }
        }else{
            const s1 = j;
            const s2 = j;
            const keyToNewIndexMap = new Map();
            for(let i = s2; i <= e2; i++){
                const n2 = newChildren[i];
                keyToNewIndexMap.set(n2.key, i);
            }
            let patched = 0; // 已处理结点的个数
            let pos = s2; // 待处理的新结点索引
            let moved = false; // 是否存在结点需要移动
            const toBePatched = e2 - s2 + 1; // 需要处理的新节点数量
            const newIndexToOldIndexMap = new Array(toBePatched).fill(-1); // 新节点索引到旧节点索引的映射

            for(let i = s1; i <= e1; i++){
                const oldChild = oldChildren[i];
                const key = keyToNewIndexMap.get(oldChild.key);
                if(key !== undefined){
                    const newChild = newChildren[key];
                    patch(oldChild, newChild, container);
                    patched++;
                    newIndexToOldIndexMap[key - s2] = i; // 新结点索引为相对索引 旧节点索引为绝对索引
                    if(key < pos){
                        moved = true; // 发现需要移动的节点
                    }else{
                        pos = key; // 更新最大已处理位置
                    }
                }else{
                    unmount(oldChild); // 无法复用的节点，卸载
                }
            }
            if(moved){
                const seq = getSequence(newIndexToOldIndexMap);
                console.log(seq, newIndexToOldIndexMap);
                let s = seq.length - 1; // LIS 栈顶指针，用于倒序遍历 LIS
                let i = toBePatched - 1; // 倒序遍历新节点列表的索引指针 新节点的相对索引
                for(i; i >= 0; i--){
                    // CASE 1: 全新节点（需要创建）
                    if(newIndexToOldIndexMap[i] == -1){
                        const pos = i + s2; // 新节点的绝对索引
                        const newVnode = newChildren[pos];
                        let anchor;
                        if(pos + 1 < newChildren.length){
                            anchor = newChildren[pos + 1].el;
                        }else{
                            anchor = null;
                        }
                        patch(null, newVnode, container, anchor);
                    }else if(i !== seq[s]){ // CASE 2: 需要移动的节点
                        const pos = i + s2;
                        const newVnode = newChildren[pos];
                        let anchor = null;
                        if(pos + 1 < newChildren.length){
                            // 为什么newChildren[pos + 1]有el属性？ mountElement函数执行时赋值的
                            anchor = newChildren[pos + 1].el;
                        }
                        // 为什么newVnode.el有值？ 因为if(moved)之前patch过 也就是内容已经更新了 现在只是移动位置
                        insert(newVnode.el, container, anchor);
                    }else{ // CASE 3: 保持不变的节点（属于LIS）
                        s--;
                    }
                }
            }
        }
    }

    const mountComponent = (vnode, container, anchor = null) => {
        const componentOptions = vnode.tag;
        if(typeof componentOptions !== "string"){
            const { data, render, beforeCreate, created, beforeMount, mounted, beforeUpdate, updated } = componentOptions;
            beforeCreate && beforeCreate();
            const state = reactive(data());
            const Instance = {
                state,
                subTree: null,
                isMounted: false,
                uid: _uid++,
            }
            vnode.component = Instance;
            created && created.call(state, state);
            effect(()=>{
                console.log(vnode, container, anchor);
                const subTree = render.call(state, state);
                if(!Instance.isMounted){
                    beforeMount && beforeMount.call(state, state);
                    // 首次渲染
                    patch(null, subTree, container, anchor);
                    Instance.isMounted = true;
                    mounted && mounted.call(state, state);
                }else{
                    //  更新
                    beforeUpdate && beforeUpdate.call(state, state);
                    patch(Instance.subTree, subTree, container, anchor);
                    updated && updated.call(state, state);
                }
                Instance.subTree = subTree;
            },{
                scheduler: queueJob
            })
        }
    }

    const patch = (n1, n2, container, anchor = null) => {
        // console.log(n1, n2, container);
        const { tag } = n2;
        if(!n1){
            //console.log("挂载")
            if(typeof tag === "string"){
                mountElement(n2, container, anchor);
            }else{
                mountComponent(n2, container, anchor);
            }
        }else{
            //console.log("更新")
            if(typeof n2.children === "string"){
                patchChildren(n1, n2, n1.el);
            }else{
                patchElement(n1, n2)
            }
        }
    }

    const render = (vnode: VNode, container) => {
        if(vnode){
            patch(container._vnode, vnode, container)
        }else{

        }
        container._vnode = vnode
    }
    return {
        render,
        createElement,
    }
}

export const createApp = (vnode) => {
    const renderer = createRenderer()
    return {
        mount(container) {
            renderer.render(vnode, container)
        }
    }
}
```

## vnode.ts

```ts
export interface Component {
    render(): VNode;
    data(): object;
    beforeCreate?(): void;
    created?(): void;
    beforeMount?(): void;
    mounted?(): void;
    beforeUpdate?(): void;
    updated?(): void;
}

interface Instance {
    uid: number;
    subTree?: VNode | null;
    isMounted?: boolean;
    state: object;
}

export class VNode {
    tag: string | Component;
    el?: HTMLElement;
    key?: string | number ;
    children?: VNode[] | string;
    props?: Record<any, any>;
}
```

## h.ts

```ts
import { VNode } from './vnode';
import { createRenderer } from "./renderer";
const renderer = createRenderer();

export const h = (tag: string, props?: Record<any, any>, children?:  VNode[] | VNode | string): VNode => {
    const el = renderer.createElement(tag);
    const root = {
        tag,
        children,
        props,
        el
    }
    if(props){
        for(const key in props){
            el.setAttribute(key, props[key]);
        }
    }

    if(Array.isArray(children)){
        children.forEach(child => {
            child.el = renderer.createElement(child.tag);
        })
    }else if(typeof children === 'object' && children !== null){
        const el = renderer.createElement(children.tag);
        children.el = el;
        root.children = [children];
    }

    return root as VNode;
}
```

## queue.ts

```ts
const queue: Set<Function> = new Set();
let isFlush = false;
const p = Promise.resolve();

export const queueJob = (job: Function)=> {
  queue.add(job);
  if (!isFlush) {
    isFlush = true; // 避免重复更新
    p.then(() => {
      queue.forEach(job => job());
      queue.clear();
      isFlush = false;
    });
  }
}

export const nextTick = (fn?: (...args: any[])=> void) => {
  return fn ? p.then(fn) : p;
}
```

## Button.ts

```ts
import { VNode, Component } from "../renderer/vnode"
import { h } from "../renderer/h"
import { nextTick } from "../renderer/queue"

const Button = {
    data() {
        return {
            name: 'Button',
            age: 18+"岁"
        }
    },
    beforeCreate() { console.log('beforeCreated'); },
    created() { console.log('created'); },
    beforeMount() { console.log('beforeMount'); },
    mounted() { console.log('mounted'); },
    beforeUpdate() { console.log('beforeUpdate'); },
    updated() { console.log('updated'); },
    render():VNode {
        return h('div', {id: 1}, [
            {
                tag: 'p',
                key: 1,
                children: this.name,
                props: {
                    id: "p1",
                    on: {
                        click: () => {
                            //this.name = 'Button000';
                            console.log('click');
                            for(let i=0;i<10;i++){
                                this.name = 'Button'+i;
                                //TODO 为什么下面这一行存在就会循环输出  不存在就是输出最后一次
                                // console.log(this.name);
                            }
                            nextTick(() => {
                                const p1 = document.querySelector("#p1");
                                console.log("p1.innerHTML", p1.innerHTML);
                            });
                        }
                    }
                }
            },
            {
                tag: 'p',
                key: 2,
                children: this.age,
            }
        ])
    }
}

export const MyButton: VNode = {
    tag: Button,
}
```

## main.ts

```ts
import { reactive } from "./reactivity/reactive";
import { effect } from "./reactivity/effect";
import { computed } from "./reactivity/computed";
import { watch } from "./reactivity/watch";
import { ref } from "./reactivity/ref"
import { createApp } from "./renderer/renderer"
import { VNode } from "./renderer/vnode"
import { h } from "./renderer/h"
import { MyButton } from "./component/Button"

const app = document.querySelector("#app");
createApp(MyButton).mount(app);
/*const vnode = h('div',{
    id: 1,
},'hello world')

const vnode = h('div',{
    id: 1,
},{
    tag: 'p',
    children: 'hello world'
})

const vnode = h('div',{id: 1},[
    {
        tag: 'p',
        children: 'hello world'
    },
    {
        tag: 'p',
        children: 'hello china'
    }
])
console.log(vnode);
createApp(vnode).mount(app);*/

/*const obj = reactive({
    name: "John",
    age: 30,
});

effect(() => {
/!*    const vnode: VNode = {
        tag: "div",
        children: [
            {
                tag: "p",
                key: 1,
                children: "p1"
            },
            {
                tag: "p",
                key: 2,
                children: "p2"
            },
            {
                tag: "p",
                key: 3,
                children: "p3"
            }
        ]
    }
    const vnode2: VNode = {
        tag: "div",
        children: [
            {
                tag: "p",
                key: 1,
                children: "p111"
            },
            {
                tag: "p",
                key: 2,
                children: "p2222"
            },
            {
                tag: "p",
                key: 3,
                children: "p3333"
            }
        ]
    }*!/
    const vnode: VNode = {
        tag: "div",
        children: [
            {
                tag: "p",
                key: 1,
                children: "p1"
            },
            {
                tag: "p",
                key: 2,
                children: "p2"
            },
            {
                tag: "p",
                key: 3,
                children: "p3"
            },
            {
                tag: "p",
                key: 4,
                children: "p4"
            },
            {
                tag: "p",
                key: 5,
                children: "p5"
            }
        ]
    }
    const vnode2: VNode = {
        tag: "div",
        children: [
            {
                tag: "p",
                key: 1,
                children: "p111"
            },
            {
                tag: "p",
                key: 3,
                children: "p333"
            },
            {
                tag: "p",
                key: 4,
                children: "p444"
            },
            {
                tag: "p",
                key: 2,
                children: "p222"
            },
            {
                tag: "p",
                key: 7,
                children: "p777"
            },
            {
                tag: "p",
                key: 6,
                children: "p666"
            }
        ]
    }
    createApp(vnode).mount(app);
    setTimeout(() => {
        createApp(vnode2).mount(app);
    }, 1000);

});*/


// 验证ref
/*const b = ref("hello");
effect(() => {
    app.innerHTML = b.value;
});
setTimeout(() => {
    b.value = "world";
}, 1000);*/

// 验证watch
/*watch(obj, (newVal, oldVal) => {
    console.log(newVal, oldVal);
})

watch(() => obj.name, (newVal, oldVal) => {
    console.log(newVal, oldVal);
},{
    immediate: true
})

setTimeout(() => {
    obj.name = "Bob";
}, 1000);*/

// 验证computed
/*let name = computed(() => {
    console.log("computed name");
    return obj.name.toUpperCase()
});

console.log(name.value); // computed name
console.log(name.value);
setTimeout(() => {
    obj.name = "Bob";
    console.log(name.value);
}, 1000);*/


// 验证reactive
/*effect(() => {
    app.innerHTML = obj.name;
});

setTimeout(() => {
    obj.name = "Bob";
}, 1000);*/
```



## effect相关

```ts
let activeEffect;

export const effect = (fn: Function) => {
    const _effect = () => {
        activeEffect = _effect;
        fn();
    }
    _effect();
}
```

可以这么说，`effect`函数是一个用于注册副作用函数的包装器，而`_effect`函数才是真正被存储和调用的副作用函数。

### 关键要点
1. **`effect`函数的作用**：它主要负责创建并启动副作用函数，其核心任务就是管理副作用函数的执行上下文。
2. **`_effect`函数的特性**：
    - 它是对原始传入函数`fn`的一层包装。
    - 会在执行原始函数`fn`之前，把自身（也就是`_effect`）设置为当前活跃的副作用函数。
    - 它是响应式系统能够追踪到的实际副作用函数。
3. **依赖收集的触发时机**：当执行`fn`时，如果访问了响应式对象的属性，就会触发依赖收集操作，此时这些属性就会将当前的`activeEffect`（也就是`_effect`）记录下来。

### 执行流程
```javascript
effect(() => {
  // 这个箭头函数就是传入的fn
  console.log(state.value); // 访问响应式数据
});

// 实际执行过程
1. effect(fn) 被调用
2. 创建 _effect 函数并设置 activeEffect = _effect
3. 执行 _effect()
4. 在 _effect 内部执行 fn()
5. fn() 访问响应式数据，触发依赖收集
6. 响应式数据记录 activeEffect（即 _effect）作为依赖
7. 当响应式数据变化时，直接调用 _effect
```

### 设计目的
这样设计的主要目的是为了分离关注点：
- `effect`函数专注于副作用函数的注册和上下文管理工作。
- `_effect`函数则专注于依赖收集和触发更新的相关逻辑。

通过这种方式，整个响应式系统能够更清晰地追踪副作用函数，同时也便于处理嵌套的effect、依赖清理等复杂的情况。



## computed

```ts
import { effect } from './effect'

export const computed = (getter: Function) => {
    let dirty = true; // 第一次获取值时，需要执行getter，所以dirty为true
    let value; // 缓存的计算结果
    const _value = effect(getter,{
        lazy: true,
        scheduler() { // 依赖变化时的调度函数
            dirty = true;
        }
    });

    // 3. 定义计算属性的包装对象
    class ComputedRefImpl {
        get value() {
            if(dirty){
                value = _value(); // 执行 getter 获取新值
                dirty = false;
            }
            return value; // 返回缓存值
        }
    }

    return new ComputedRefImpl(); // 返回计算属性实例
}
```

这段代码实现了一个计算属性(computed property)的核心逻辑，下面我来解答你的两个问题：

### 问题1：dirty 和 value 变量的持久性

`dirty` 和 `value` 变量的持久性是通过闭包(Closure)实现的。当 `computed` 函数被调用时：

1. `dirty` 和 `value` 作为局部变量被创建
2. `ComputedRefImpl` 类的 `get value()` 方法通过闭包引用了这两个变量
3. 每次调用 `get value()` 时，访问的都是同一个 `dirty` 和 `value` 实例
4. 即使 `computed` 函数执行完毕，这两个变量也会因为被闭包引用而持续存在

这种设计使得计算属性能够：
- 第一次访问时执行 getter 并缓存结果
- 依赖变化时标记为 dirty
- 下次访问时重新计算并更新缓存

### 问题2：ComputedRefImpl 类的作用

`ComputedRefImpl` 类是计算属性的核心实现，它的主要作用是：

1. **封装计算逻辑**：将 getter 函数封装在 effect 中，实现响应式追踪
2. **缓存计算结果**：使用 `value` 变量存储计算结果，避免重复计算
3. **延迟计算**：通过 `lazy: true` 选项，只有在访问 `.value` 时才执行计算
4. **脏值检查**：使用 `dirty` 标志判断是否需要重新计算
5. **自动更新**：依赖变化时，通过 scheduler 标记为 dirty，下次访问时触发重新计算

### 执行流程详解

```javascript
// 1. 创建计算属性
const fullName = computed(() => {
  return `${state.firstName} ${state.lastName}`
})

// 2. 访问计算属性
console.log(fullName.value) // 首次访问，执行 getter 并缓存结果

// 3. 依赖变化时
state.firstName = 'John' // 触发 scheduler，dirty 被标记为 true

// 4. 再次访问计算属性
console.log(fullName.value) // 因为 dirty 为 true，重新执行 getter 并更新缓存
```

### 设计优势

1. **性能优化**：
   - 只有在依赖变化后首次访问时才重新计算
   - 多次访问期间使用缓存结果，避免重复计算

2. **响应式更新**：
   - 自动追踪所有依赖
   - 依赖变化时自动标记为脏值

3. **接口一致性**：
   - 通过 `.value` 访问，与 ref 接口保持一致
   - 可以像普通响应式对象一样使用

这种实现方式与 Vue 3 的计算属性设计思想高度一致，体现了"懒执行 + 缓存 + 自动依赖追踪"的核心特性。



## 实现computed中effect函数变化

```ts
let activeEffect;

export const effect = (fn: Function) => {
    const _effect = () => {
        activeEffect = _effect;
        fn();
    }
    _effect();
}
```

```ts
let activeEffect;
interface Options {
    lazy?: boolean;
    scheduler?: () => void;
}

export const effect = (fn: Function, options?: Options) => {
    const _effect = () => {
        activeEffect = _effect; // 1. 设置当前激活的副作用函数
        return fn(); // 2. 执行原始函数并返回结果
    }
    _effect.options = options;
    // 当 options.lazy 为 true 时（比如在 computed 中使用的场景），我们不立即执行函数
    if(options && options.lazy){
        return _effect;
    }else{  // 当不传 lazy 选项或 lazy=false 时，需要立即执行副作用函数
        _effect();
        return _effect;
    }
}
```

现在会返回_effect 函数实例，在get时根据dirty来决定副作用函数是否执行

现在变成了return fn()



## _effect.options = options;作用

使得以下代码能够访问effect时能够访问到它对应的options

如果scheduler存在，则不执行副作用函数，而是置dirty为true

```ts
export const trigger = (target: any, key: string | Symbol) => {
    const depsMap = targetMap.get(target);
    const deps: Set<any> = depsMap.get(key);
    if(!deps) return;
    deps.forEach(effect => {
        if(effect.options && effect.options.scheduler){
            effect.options.scheduler();
        }else{
            effect();
        }
    })
}
```



## 为什么watch第一步是生成getter？

```ts
  // 1. 生成getter函数
  let getter: Function;
  if (typeof target === 'function') {
    getter = target;
  } else {
    getter = () => traverse(target);
  }
```

在 Vue 3 的 `watch` 实现中，**生成 getter 函数是关键的第一步**，这与 Vue 响应式系统的工作原理密切相关。让我通过三个核心原因解释这一设计：


### 1. **统一不同监听目标的处理方式**
`watch` 支持多种类型的监听目标：
- **响应式对象/数组**（如 `watch(state)`）
- **计算属性或函数返回值**（如 `watch(() => state.count * 2)`）
- **多个数据源**（如 `watch([() => state.a, () => state.b])`）

通过生成统一的 **getter 函数**，可以将不同类型的目标转换为一致的依赖收集形式：
- 对于对象/数组，使用 `traverse` 递归访问所有属性
- 对于函数，直接执行函数获取返回值

**示例**：
```javascript
// 监听对象
watch(state, (newVal, oldVal) => { /* ... */ })
// 转换为：getter = () => traverse(state)

// 监听计算属性
watch(() => state.count * 2, (newVal, oldVal) => { /* ... */ })
// 转换为：getter = () => state.count * 2
```


### 2. **触发依赖收集（核心机制）**
Vue 的响应式系统基于 **Proxy + 依赖收集**：
- 当访问响应式对象的属性时（触发 `getter`），Vue 会记录哪些副作用依赖于该属性
- 当属性值变化时（触发 `setter`），Vue 会通知所有依赖更新

**生成 getter 的目的**：
- 通过执行 getter 函数，强制访问被监听的数据源
- 让 Vue 响应式系统捕获这些访问，建立依赖关系

**示例**：
```javascript
const state = reactive({ count: 0 });

watch(() => state.count, (newVal, oldVal) => {
  console.log(`count changed: ${oldVal} -> ${newVal}`);
});

// 背后的逻辑：
// 1. getter = () => state.count
// 2. 执行 getter() 时，访问了 state.count
// 3. Vue 记录："这个 watch 依赖于 state.count"
// 4. 当 state.count 变化时，通知 watch 更新
```


### 3. **支持深层监听和懒执行**
#### 深层监听（Deep Watch）
当监听整个对象时（如 `watch(state)`），需要递归遍历所有属性：
- `traverse` 函数会递归访问对象的每个属性，触发所有属性的 `getter`
- 这样即使修改深层嵌套的属性（如 `state.a.b.c = 1`），Vue 也能捕获到变化

#### 懒执行（Lazy Execution）
通过将监听逻辑封装在 getter 中，可以实现：
- **延迟计算**：只有在依赖变化时才重新执行 getter
- **手动控制初始值**：首次执行 getter 获取 `oldValue`，后续执行获取 `newValue`


### 总结：getter 是连接 `watch` 和响应式系统的桥梁
| 作用                | 具体解释                                                                 |
|---------------------|--------------------------------------------------------------------------|
| **统一接口**        | 将不同类型的监听目标（对象、函数）转换为统一的函数调用形式               |
| **触发依赖收集**    | 通过执行 getter 访问响应式数据，让 Vue 记录依赖关系                       |
| **支持高级特性**    | 深层监听、延迟计算、新旧值对比等功能都依赖于 getter 的设计               |

**简化流程图**：
```
watch(目标, 回调) → 生成 getter → 执行 getter 收集依赖 → 依赖变化时重新执行 getter → 调用回调
```

这种设计让 `watch` 既能处理简单的属性监听，也能处理复杂的深层对象监听，同时保持了与 Vue 响应式系统的无缝集成。



## 异步任务队列机制

这段代码实现了一个高效的任务调度机制，核心是利用 **微任务队列** 进行异步批处理和去重，常见于前端框架（如 Vue 3 的调度器）。以下是逐部分解析：

---

### 一、核心变量与设计意图
```typescript
const queue: Set<Function> = new Set();  // 任务队列（Set 自动去重）
let isFlush = false;                     // 防抖标志，避免重复调度
const p = Promise.resolve();             // 微任务触发器（已完成的 Promise）
```
- **`queue`**：`Set<Function>` 存储待执行任务，**自动过滤重复任务**（同一函数不会多次执行）。
- **`isFlush`**：标记队列是否正在等待/执行，**防止重复调度微任务**。
- **`p`**：通过 `Promise.resolve()` 创建已解决的 Promise，其 `then` 方法用于触发**微任务**（比 `setTimeout` 等宏任务优先级更高）。

---

### 二、`queueJob`：任务调度函数
```typescript
export const queueJob = (job: Function) => {
  queue.add(job);          // 添加任务（自动去重）
  if (!isFlush) {          // 首次添加任务时启动调度
    isFlush = true;        // 锁定状态
    p.then(() => {         // 下一个微任务批次执行
      queue.forEach(job => job()); // 执行所有任务
      queue.clear();       // 清空队列
      isFlush = false;    // 重置状态
    });
  }
}
```
#### 工作流程：
1. **同步阶段**：  
   多次调用 `queueJob` 时，任务被加入 `Set` 并去重。首次任务触发微任务调度（`p.then`），后续任务仅加入队列。
2. **微任务阶段**：  
   当同步代码执行完毕，引擎处理微任务队列，此时一次性执行所有任务并清空队列。

#### 设计优势：
- **批处理**：合并同步操作中的多次任务，**减少重复计算/渲染**（如避免频繁更新 UI）。
- **自动去重**：同一任务函数在单次批次中**仅执行一次**（适合组件更新等场景）。
- **高效调度**：利用微任务在**当前事件循环末尾执行**，比 `setTimeout` 更快且不阻塞渲染。

---

### 三、`nextTick`：等待下一次 DOM 更新
```typescript
export const nextTick = (fn?: (...args: any[]) => void) => {
  return fn ? p.then(fn) : p;  // 支持回调或返回 Promise
}
```
#### 使用场景：
```typescript
// 方式 1：传入回调
nextTick(() => {
  console.log("DOM 已更新");
});

// 方式 2：作为 Promise 使用
await nextTick();
console.log("DOM 已更新");
```
- **作用**：在 `queueJob` 的微任务执行后触发回调（即 DOM 更新后）。
- **原理**：复用 `p.then()` 确保回调在**同一微任务队列**中顺序执行。

---

### 四、执行时序示例
```typescript
queueJob(() => console.log("Task 1"));
queueJob(() => console.log("Task 2"));
queueJob(() => console.log("Task 1")); // 被 Set 去重

nextTick(() => console.log("nextTick"));

console.log("Start");
// 输出顺序：
// Start
// Task 1
// Task 2
// nextTick
```
1. 同步代码执行（`Start` 最先输出）。
2. 微任务阶段执行 `queueJob` 队列（去重后输出 `Task 1`、`Task 2`）。
3. `nextTick` 回调在队列清空后执行。

---

### 五、实际应用场景
1. **前端框架更新机制**  
   Vue 3 使用类似 `queueJob` 合并组件的 `update` 函数，避免重复渲染。
2. **批量操作优化**  
   如连续修改数据时，合并最终计算逻辑（避免中间状态导致的性能浪费）。
3. **异步任务调度**  
   确保任务在 DOM 更新后执行（如获取更新后的元素尺寸）。

---

### 六、扩展：与宏任务的对比
| **调度方式** | 触发时机               | 优先级 | 示例                |
|------------|-----------------------|--------|---------------------|
| 微任务       | 当前任务结束、渲染前     | 高     | `Promise.then()`    |
| 宏任务       | 渲染后、下一事件循环开始 | 低     | `setTimeout()`      |

> 微任务更早执行，适合需要**快速响应但无需渲染介入**的操作（如更新计算）。

---

### 总结
- **核心目的**：通过微任务合并同步操作中的任务，提升性能。
- **关键设计**：  
  - `Set` 自动去重 → 避免重复任务。  
  - `isFlush` 状态锁 → 防止多次调度。  
  - `Promise.resolve()` → 微任务触发器。  
- **适用场景**：框架级更新调度、高频操作优化（如动画、数据流处理）。