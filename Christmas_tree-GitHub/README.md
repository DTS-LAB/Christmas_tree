# EVERGREEN · 豪华互动圣诞树

React 19 + TypeScript + Vite + Tailwind CSS 4 + React Three Fiber / Drei + Three.js + postprocessing。

## 发布到 GitHub Pages

目标仓库：https://github.com/DTS-LAB/Christmas_tree

1. 将项目源码上传到仓库根目录，保留 `.github/workflows/deploy-pages.yml`、`src/`、`public/`、`package.json`、`package-lock.json` 和配置文件。不要上传 `node_modules/` 或 `dist/`。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送到 `main` 或 `master` 会自动构建部署。如果源码已先上传，在 **Actions → Deploy Christmas Tree to GitHub Pages → Run workflow** 手动触发。
4. 等待 `build` 和 `deploy` 都显示绿色，再访问 https://dts-lab.github.io/Christmas_tree/ 。仓库需要已启用 Pages，且账户方案支持该仓库的可见性。

`Christmas_tree-GitHub.zip` 是源码传输包：先解压，再上传其中的文件和文件夹，**不要只把 ZIP 文件上传到仓库**。上传后检查仓库中确实存在 `.github/workflows/deploy-pages.yml`。

资源使用相对路径，同时兼容 GitHub Pages 的 `/Christmas_tree/` 和 Netlify 等平台的根路径。照片依然由每位访问者在自己的浏览器保存，不会自动共享。

## 启动

```powershell
cd D:\圣诞树
npm install
npm run dev -- --port 5173
```

访问 http://127.0.0.1:5173/ 。生产构建：`npm run build`；预览构建：`npm run preview`。

## 交互

- 点击「让星光散落」或底部形态按钮，在散落与成树之间平滑切换。页面空白处按空格同样可以切换。
- 拖动旋转、滚轮缩放，支持暂停自动旋转、调整 Bloom 辉光、重置视角和全屏。
- 点击「添加我的回忆」，选择或拖入 JPG / PNG / WebP。最多 12 张，每张最大 20 MB。
- 照片会缩小到最长边 900 px 并装裱为 3D 拍立得；点击树上照片或管理面板的缩略图可以放大查看。
- 照片仅保存在当前浏览器 localStorage，不发送到服务器。存储空间不足时会提示；清除浏览器站点数据会删除已保存照片。
- 初始 3 张图是本地生成的示例插画；上传第一张自己的照片后，树会改用上传照片。
- 适配手机纵向布局；尊重系统减少动态效果设置（关闭自动旋转并缩短变形过渡）。

## 实现

- 18,000 个粒子由自定义 GPU Shader 在预计算的树形位置与球状散落位置之间插值。
- 170 个彩球、460 个灯点和 30 个礼物使用 InstancedMesh；礼物丝带也使用实例化渲染。
- 位置插值使用与帧率无关的阻尼，实例变换不触发 React 每帧重新渲染。
- Bloom + Vignette 后期、金色螺旋灯带、祖母绿粒子和本地 Lobby HDRI。
- 3D 场景懒加载；DPR 上限 1.75。需要支持 WebGL 2 的现代浏览器及硬件加速。

## 资源来源

- `public/environment/lobby.hdr`：Poly Haven 的 **St Fagans Interior**，即 Drei 的 `lobby` 预设，CC0。
  - https://polyhaven.com/a/st_fagans_interior
  - https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/st_fagans_interior_1k.hdr
- Cormorant Garamond / Manrope 字体由 Google Fonts 获取并本地托管；许可证见 `public/fonts/`。
- 示例插画由 `src/memories.ts` 使用 Canvas 生成，无外部图片依赖。

## 验证

生产构建及 TypeScript 检查：`npm run build`。
浏览器手动验证：WebGL 渲染、散落/聚合、照片上传、预览、刷新持久化、移除，以及 390 px 手机断点布局。
浏览器实拍在 `test-results/`；其中 `upload-test.png` 是生成的测试图，并非用户照片。
