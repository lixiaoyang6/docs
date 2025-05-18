## 前端代码

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
</head>
<body>
    <h3>大文件上传</h3>
    <input type="file" id="file">
    <button id="upload">上传</button>
    <div id="progress"></div>
    <script src="./index.js"></script>
</body>
</html>
```



### index.js

```js
const upload = document.getElementById('upload');
const file = document.getElementById('file');
const worker = new Worker('./worker.js');
const chunkSize = 1024 * 1024 * 5; // 5MB
const chunks = [];

upload.addEventListener('click', () => {
  // fs可能没读取到 要判断
  // console.log("file",file);
  // files 是 HTMLInputElement 的专有属性，当用户选择文件后，浏览器会将文件信息存储在此属性中。
  const fs = file.files[0];
  console.log("fs",fs);
  const chunkCount = Math.ceil(fs.size / chunkSize);
  chunks.push(...Array.from({ length: chunkCount}, (_, i) => fs.slice(i * chunkSize, (i + 1) * chunkSize)))
  console.log("chunks",chunks);
  worker.postMessage({
    chunks,
    filename: fs.name
  });
});

worker.onmessage = async function(e) {
  const {filename, hash} = e.data;
  // console.log(`File ${filename} hash: ${hash}`);

  const res = await fetch(`http://localhost:3000/verify?hash=${hash}`);
  const { files } = await res.json();
  console.log("已上传文件files",files);

  const set = new Set(files);

  const tasks = chunks.map((chunk, index) => ({chunk, index})).filter(({ index }) => {
    return !set.has(`${filename}-${index}`)
  });
  // console.log("tasks", tasks);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (const {chunk, index} of tasks) {
    // 在 JavaScript 中，FormData是一个用于构造表单数据的 Web API 对象，
    // 专门用来处理 `multipart/form-data` 类型的 HTTP 请求（常见于文件上传场景）
    const formData = new FormData();
    formData.append("filename", filename);
    formData.append("hash", hash);
    formData.append("index", index);
    formData.append("file", chunk); // 写在最后
    await fetch("http://localhost:3000/upload", {
      method: "POST",
      body: formData
    })

    // await sleep(2000); // 休眠 2s
  }
  await fetch(`http://localhost:3000/merge?hash=${hash}&filename=${filename}`);
}
```



### worker.js

```js
self.importScripts('./spark-md5.min.js');

self.onmessage = function(event) {
  const { chunks, filename } = event.data;
  console.log(`Received ${chunks.length} chunks for ${filename}`);

  // 初始化 MD5 计算器（针对 ArrayBuffer 优化）
  const spark = new self.SparkMD5.ArrayBuffer();
  let currentChunk = 0;

  function loadNext() {
    // 创建文件阅读器 Blob 转 ArrayBuffer
    const reader = new FileReader();

    // 分块读取完成回调
    reader.onload = function(e) {
      console.log(e.target.result); // `e.target.result` 是当前分块的 `ArrayBuffer` 数据。

      // 将当前分块的 ArrayBuffer 数据注入 MD5 计算流程
      spark.append(e.target.result);

      currentChunk++;

      if (currentChunk < chunks.length) {
        loadNext();
      } else {
        // 全部处理完毕，回传最终哈希值和文件名
        self.postMessage({
          filename,
          hash: spark.end() // 生成最终 MD5
        });
      }
    }

    // 读取当前分块为 ArrayBuffer（异步操作）
    reader.readAsArrayBuffer(chunks[currentChunk]);
  }

  // 启动处理流程
  loadNext();
}
```

## 后端代码

### index.js

```js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());

// 存储配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(req.body)
    fs.mkdirSync(`uploads/${req.body.hash}`, { recursive: true }); // ?
    cb(null, `uploads/${req.body.hash}/`);
  },
  filename: function (req, file, cb) {
    cb(null, `${req.body.filename}-${req.body.index}`);
  }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ success: true });
});

app.get("/merge", async (req, res) => {
  const { hash, filename } = req.query;
  const files = fs.readdirSync(`uploads/${hash}`);
  console.log(files);
  const fileArrSort = files.sort((a, b) => a.split("-")[1] - b.split("-")[1])
  const filePath = path.join(__dirname, hash); // 最终文件存放路径
  fs.mkdirSync(filePath, { recursive: true}); // 创建路径对应的文件夹

  // 创建写入流
  const writeStream = fs.createWriteStream(path.join(filePath, filename));

  for(const file of fileArrSort){
    await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(path.join(__dirname, `uploads/${hash}`, file));
      readStream.pipe(writeStream, { end: false }); // end: false 表示不自动关闭目标流
      readStream.on('end', () => {
        fs.unlinkSync(path.join(__dirname, `uploads/${hash}`, file));
        resolve();
      });
      readStream.on('error', reject);
    });
  }

  res.json({ success: true });
})

app.get("/verify", (req, res) => {
  const { hash } = req.query;
  const isExist = fs.existsSync(`uploads/${hash}`);
  if(!isExist){
    res.json({
      success: false,
      files: []
    });
  }
  const files = fs.readdirSync(`uploads/${hash}`);
  res.json({
    success: true,
    files
  });
})

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```