## Multer

Multer 是 Node.js 中用于处理 `multipart/form-data` 类型表单数据的中间件，常用于文件上传。以下是其核心功能及使用方法的详细说明：

---

### **一、核心概念**

1. **适用场景**
    - 处理表单中通过 `<input type="file">` 上传的文件。
    - 解析 `enctype="multipart/form-data"` 的请求。

2. **基础特性**
    - **内存存储**：文件暂存于内存（适合小文件或需进一步处理到云存储的场景）。
    - **磁盘存储**：文件保存到本地目录（适合直接持久化存储）。

---

### **二、安装与基础配置**

1. **安装**

   ```bash
   npm install multer
   ```

2. **基础代码示例**

   ```javascript
   const express = require('express');
   const multer = require('multer');
   const app = express();
   
   // 存储配置
   const storage = multer.diskStorage({
     destination: (req, file, cb) => {
       cb(null, 'uploads/'); // 保存至 uploads 目录
     },
     filename: (req, file, cb) => {
       cb(null, Date.now() + '-' + file.originalname); // 文件名添加时间戳防重复
     }
   });
   
   const upload = multer({ storage });
   
   app.post('/upload', upload.single('file'), (req, res) => {
     console.log(req.file); // 上传成功后的文件信息
     res.send('File uploaded');
   });
   
   app.listen(3000);
   ```

---

### **三、配置详解**

1. **存储引擎（Storage）**

    - **DiskStorage**

      ```javascript
      multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, './uploads'); // 指定路径（需确保目录存在）
        },
        filename: (req, file, cb) => {
          // 定制文件名（避免重名+安全过滤）
          const sanitizedName = file.originalname.replace(/[^\w.-]/g, '');
          cb(null, `${Date.now()}-${sanitizedName}`);
        }
      });
      ```

    - **MemoryStorage**

      ```javascript
      const storage = multer.memoryStorage();
      const upload = multer({ storage });
      ```

2. **过滤文件（File Filter）**  
   验证文件类型或拒绝指定文件：

   ```javascript
   const upload = multer({
     storage,
     fileFilter: (req, file, cb) => {
       const allowedTypes = ['image/jpeg', 'image/png'];
       if (allowedTypes.includes(file.mimetype)) {
         cb(null, true); // 接受文件
       } else {
         cb(new Error('仅支持 JPG/PNG 格式'), false); // 拒绝文件
       }
     }
   });
   ```

3. **限制文件大小**

   ```javascript
   const upload = multer({
     storage,
     limits: {
       fileSize: 5 * 1024 * 1024, // 最大 5MB
       files: 3                   // 最多 3 个文件
     }
   });
   ```

---

### **四、不同上传方式的处理**

| 方法                                        | 适用场景                 | 文件访问路径 |
| ------------------------------------------- | ------------------------ | ------------ |
| `.single('field')`                          | 单个文件上传             | `req.file`   |
| `.array('field', max)`                      | 多个同名文件上传         | `req.files`  |
| `.fields([{ name: 'field', max: 1 }, ...])` | 多字段不同文件上传       | `req.files`  |
| `.none()`                                   | 处理无文件字段的文本表单 | `req.body`   |

**示例：多文件上传**

```javascript
app.post('/upload-multi', upload.array('photos', 3), (req, res) => {
  req.files.forEach(file => {
    console.log(`文件 ${file.originalname} 已保存至 ${file.path}`);
  });
  res.send('多个文件上传成功');
});
```

---

### **五、错误处理**

1. **捕获 Multer 错误**

   ```javascript
   app.post('/upload', upload.single('file'), (req, res) => {
     // 处理文件
   }, (err, req, res, next) => {
     if (err instanceof multer.MulterError) {
       res.status(400).send(`文件上传错误: ${err.message}`);
     } else if (err) {
       res.status(500).send('服务器错误');
     }
   });
   ```

2. **常见错误类型**

    - `LIMIT_FILE_SIZE`：文件超过大小限制。
    - `LIMIT_FILE_COUNT`：文件数量超过限制。
    - `LIMIT_UNEXPECTED_FILE`：字段匹配错误。

---

### **六、安全与最佳实践**

1. **安全措施**

    - **检查文件类型**：拒绝执行文件（如 `.exe`、`.php`）。

    - **设置文件扩展名**：直接从 MIME 类型推断扩展名（防止篡改）。

      ```javascript
      const getExt = (mimeType) => {
        const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png' };
        return extMap[mimeType] || '.tmp';
      };
      filename: (req, file, cb) => cb(null, Date.now() + getExt(file.mimetype));
      ```

    - **控制上传目录权限**：避免目录遍历攻击。

2. **云存储集成示例（AWS S3）**

   ```javascript
   const aws = require('aws-sdk');
   const multerS3 = require('multer-s3');
   
   const s3 = new aws.S3({ region: 'us-east-1' });
   
   const upload = multer({
     storage: multerS3({
       s3,
       bucket: 'my-bucket',
       contentType: multerS3.AUTO_CONTENT_TYPE,
       key: (req, file, cb) => {
         cb(null, `uploads/${Date.now()}-${file.originalname}`);
       }
     })
   });
   ```

---

### **七、实际应用场景**

- **用户头像上传**：通过裁剪工具处理后保存到 CDN。
- **批量导入数据**：上传 CSV/Excel 文件解析后存入数据库。
- **图片/视频托管**：结合云存储生成安全访问链接。

---

通过合理配置 Multer，开发者能够高效、安全地实现文件上传逻辑，避免常见的安全漏洞和性能瓶颈。建议结合具体场景选择存储策略，并始终对用户上传内容进行严格校验。

