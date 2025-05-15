## FormData

在 JavaScript 中，`FormData` 是一个用于构造 **表单数据（form-data）** 的 Web API 对象，专门用来处理 `multipart/form-data` 类型的 HTTP 请求（常见于文件上传场景）。在你的代码中，它用于将文件分块（`chunk`）和其他元数据一起发送到服务端。

---

### **FormData 的作用详解**

#### **1. 数据结构**

- **键值对存储**：通过 `append` 方法添加字段，每个字段由 `name` 和 `value` 组成。
- **支持多种数据类型**：可附加字符串、Blob（如文件）、File 对象等。

#### **2. 在你的代码中的用途**

```javascript
const formData = new FormData();
formData.append("filename", filename);  // 文件名（如 example.txt）
formData.append("hash", hash);          // 文件哈希（用于校验完整性）
formData.append("index", index);        // 分块序号（如第 3 块）
formData.append("file", chunk);          // 文件分块数据（二进制内容）
```

- **服务端接收示例**：  
  在 Node.js（使用 Express + Multer）中，可通过以下方式获取：

  ```javascript
  // 上传接口
  app.post("/upload", upload.single("file"), (req, res) => {
    const { filename, hash, index } = req.body; // 非文件字段
    const fileChunk = req.file;                 // 文件字段（对应 formData.append("file", chunk)）
  });
  ```

#### **3. 为什么用 FormData？**

- **原生支持文件传输**：浏览器会自动将 `FormData` 转换为 `multipart/form-data` 格式，适合传输二进制文件。
- **兼容分块上传**：每个分块独立发送时，附带元数据（如 `hash`、`index`），服务端可据此重组文件。

---

### **FormData 的底层行为**

#### **1. HTTP 请求头**

当使用 `FormData` 时，浏览器会自动设置请求头：

```http
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryABC123
```

- **boundary**：分隔符，用于划分不同字段的边界。

#### **2. 请求体格式**

发送的请求体内容大致如下：

```
------WebKitFormBoundaryABC123
Content-Disposition: form-data; name="filename"

example.txt
------WebKitFormBoundaryABC123
Content-Disposition: form-data; name="hash"

a1b2c3d4
------WebKitFormBoundaryABC123
Content-Disposition: form-data; name="index"

3
------WebKitFormBoundaryABC123
Content-Disposition: form-data; name="file"; filename="chunk-3"
Content-Type: application/octet-stream

<二进制文件内容>
------WebKitFormBoundaryABC123--
```

---

### **注意事项**

1. **字段顺序无关**：服务端通过字段名（如 `filename`、`file`）解析数据，与 `append` 顺序无关。

2. **文件字段建议放在最后**：某些服务端框架（如 Multer）要求文件字段是最后一个字段，否则可能解析失败。

3. **Blob/File 对象的处理**：

   ```javascript
   formData.append("file", chunk, "chunk-3.dat"); // 第三个参数为文件名（可选）
   ```

---

### **替代方案**

- **Base64 编码**：将文件转为字符串通过 JSON 发送，但体积膨胀约 33%，效率低。
- **二进制流**：直接发送 `Blob`，但无法附带元数据，需通过 URL 参数或自定义 Header 传递。

---

通过 `FormData`，你可以高效、规范地实现文件分块上传，是 Web 开发中处理文件传输的标准方案。