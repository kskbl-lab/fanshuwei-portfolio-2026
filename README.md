# 范殊玮作品集 · 2026

当前网站：https://kskbl-lab.github.io/fanshuwei-portfolio-2026/

## 当前版本

2026-09-16 发布本地草稿 14：独立首页、快手、睿琪和个人作品页面；共 34 件展示作品（快手 18 / 个人 6 / PictureThis 3 / Woodsense 7）。

当前页面源文件位于 `site/`，是原生 HTML / CSS / JavaScript，无外部前端运行依赖。Node.js 22+ 可运行：

```sh
npm run dev
npm run build
```

`dev` 在本机 4187 端口预览；`build` 将 `site/` 复制到 `dist/`。
推送 main 后，由 `.github/workflows/deploy.yml` 自动发布 GitHub Pages。

## 作品管理

线上「素材管理」沿用原网站编辑密码。新增、编辑、删除恢复及排序保存到原 Supabase 项目。
新目录保存在原 `portfolio_state/main` 行的 `media.portfolio_catalog_v4`，不会移除旧版 `projects`、`core_items` 或旧素材映射。
首次没有新版云端目录时，读取 `site/catalog.js` 的已确认清单（revision 58），不会因为访客浏览而写入云端。
写入使用 updated_at 条件检查，避免同时编辑时静默覆盖。

与原云端文件逐字节相同的现有素材沿用原链接，其余当前展示素材随 GitHub Pages 发布；没有重复上传到 Supabase。日后从管理面板上传的新文件仍进入原 portfolio-media bucket。
预览也会读取云端目录；在预览中解锁并保存作品，同样会修改线上目录。普通布局代码调试无需解锁。
如需纯本地维护，请使用单独保留的 portfolio-draft 及其 preview-server.cjs。

睿琪六个视频保留未压缩的有声原文件。旧草稿中已移出展示的作品只留在本地，不随本次发布上传；未来在线删除的作品仍支持回收恢复。

## 旧版备份

替换前的源码提交：`0aea0a4a26dba5322a0230253fcc8d1ec5cecedc`。
旧版备份仅保存在本机，未推送额外的远程备份分支，也未另建旧版线上站点。
原 React 源码仍留在 `src/`，仅作历史参考，不是当前发布页面；历史构建命令为 `npm run build:legacy`。

本次另外保存了原发布文件、当时的云端作品目录、25 个原始素材、可离线运行的预览、独立开发源码和完整 Git bundle，交付为本地 ZIP。
恢复旧版作品清单应以该快照为准，仅切换 Git 分支不能回滚云端数据库。

原网站的云端访问策略及前端编辑入口保持兼容；前端密码提示不替代数据库层身份认证。
