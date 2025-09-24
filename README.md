# 照片变年轻（Next.js 版）

一个基于 Next.js 的单页应用，提供照片上传、调用火山引擎即梦 AI 修图接口，并返回处理后的结果图。支持拖拽上传、处理进度提示以及结果下载。

## 功能概览
- ✅ 拖拽或点击上传照片（限制 10 MB 内的 JPG/PNG）
- ✅ 前端实时校验文件类型与大小
- ✅ 服务端调用火山引擎 `CVSync2AsyncSubmitTask` / `GetResult` 接口
- ✅ 内置超时与重试机制，提升调用稳定性
- ✅ 返回 Base64 Data URL，可直接预览并下载

## 快速开始
1. 安装依赖：
   ```bash
   npm install
   ```
2. 配置环境变量，在项目根目录创建 `.env.local`：
   ```bash
   VOLCENGINE_ACCESS_KEY_ID=你的AccessKeyId
   VOLCENGINE_SECRET_ACCESS_KEY=你的SecretAccessKey
   # 可选覆盖项
   # VOLCENGINE_REQ_KEY=jimeng_t2i_v40
   # VOLCENGINE_PROMPT=精修这张照片，让照片人物变年轻，保持原有特征，提升肌肤质感，减少皱纹
   # VOLCENGINE_REGION=cn-north-1
   # VOLCENGINE_SERVICE=cv
   # VOLCENGINE_VERSION=2022-08-31
   # UPLOAD_MAX_FILE_SIZE_BYTES=10485760
   # VOLCENGINE_POLL_INTERVAL_MS=2000
   # VOLCENGINE_MAX_POLL_ATTEMPTS=30
   ```
3. 启动开发服务器：
   ```bash
   npm run dev
   ```
4. 访问 `http://localhost:3000` 上传体验。

> **提示**：如果密钥是 Base64 编码的，也可以直接填写，服务端会自动判断并解码。

## 项目结构
```
app/
  api/process-image/route.ts  # 服务端路由，封装火山引擎签名与重试
  components/                 # 客户端组件
    ErrorMessage.tsx
    PhotoUpload.tsx
  globals.css                 # 全局样式
  layout.tsx                  # 根布局
  page.tsx                    # 首页
next.config.js
package.json
README.md
...
```

## 可用脚本
- `npm run dev`：启动开发模式
- `npm run build`：构建生产包
- `npm run start`：以生产模式启动
- `npm run lint`：运行 ESLint 检查

## 安全注意事项
- 切勿将真实的火山引擎 AK/SK 提交到版本库
- 生产环境请结合密钥管控（如环境变量、密钥管理服务）
- 若需部署在无公网的环境，请确保能访问火山引擎 API

欢迎继续扩展界面、增加处理状态提示、或接入更多图像能力。
