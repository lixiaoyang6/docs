## HTML 文件输入元素的底层机制
---

### **1. `file` 变量是什么？**

```javascript
const file = document.getElementById('file'); // 获取 <input type="file"> 元素
```

- `file` 是一个 **DOM 元素对象**，类型为 `HTMLInputElement`。
- 它继承了 `input` 元素的通用属性和方法，同时因为 `type="file"`，还拥有 **文件相关的特殊属性**。

---

### **2. `files` 属性的来源**

- **`files` 是 `HTMLInputElement` 的专有属性**，当用户选择文件后，浏览器会将文件信息存储在此属性中。
- **`files` 的值是一个 `FileList` 对象**（类似数组的结构），包含用户选择的文件列表。

---

### **3. `files[0]` 的含义**

- **`FileList` 是一个类数组对象**，可以通过索引访问其中的文件。

- **`files[0]` 表示用户选择的第一个文件**（如果未设置 `multiple` 属性，用户只能选一个文件）。

- 示例：

  ```javascript
  // 用户选择了一个文件
  const fileElement = document.getElementById('file');
  const firstFile = fileElement.files[0]; // 第一个文件的 File 对象
  
  console.log(firstFile.name); // 输出文件名
  console.log(firstFile.size); // 输出文件大小（字节）
  ```

---

### **4. `FileList` 的结构**

- **`FileList` 的特性**：

    - 只读：不能直接修改它（例如删除或添加文件）。
    - 类数组：可以通过 `files[0]`、`files[1]` 访问文件，或使用 `Array.from(files)` 转为数组。
    - 长度属性：`files.length` 表示文件数量。

- **`File` 对象**：

    - 每个文件对应一个 `File` 对象，包含文件名、大小、类型等信息。

    - 例如：

      ```javascript
      const files = fileElement.files;
      Array.from(files).forEach(file => {
        console.log(`文件名：${file.name}，类型：${file.type}`);
      });
      ```

---

### **5. 实际工作原理**

1. **用户选择文件**：点击 `<input type="file">` 按钮，选择文件后，浏览器会将文件信息填充到 `files` 属性。

2. **JavaScript 访问**：通过 `file.files` 获取 `FileList`，再通过索引访问具体文件。

3. **未选择文件时的表现**：

   ```javascript
   // 用户未选择文件时
   console.log(file.files); // 输出空的 FileList 对象
   console.log(file.files.length); // 0
   console.log(file.files[0]); // undefined
   ```

---

### **6. 完整示例**

```html
<input type="file" id="file" multiple>
<button onclick="showFiles()">显示文件信息</button>

<script>
  function showFiles() {
    const fileInput = document.getElementById('file');
    const files = fileInput.files;

    if (files.length === 0) {
      alert('请先选择文件！');
      return;
    }

    Array.from(files).forEach((file, index) => {
      console.log(`文件 ${index + 1}:`);
      console.log('名称:', file.name);
      console.log('大小:', file.size + ' 字节');
      console.log('类型:', file.type);
    });
  }
</script>
```

---

### **7. 关键总结**

- **`file` 是 DOM 元素**，`files` 是它的属性。
- **`files` 存储用户选择的文件**，类型为 `FileList`。
- **`files[0]` 是第一个文件的 `File` 对象**，通过索引可以访问其他文件。
- **必须监听 `change` 事件或等待用户操作**，才能获取到有效的 `files` 数据。

理解这一机制后，你可以轻松操作文件上传功能！