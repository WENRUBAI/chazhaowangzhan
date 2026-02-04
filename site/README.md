自媒体工作台（Next.js 静态站）：热点收集、材料库、对照卡与脚本。

## Getting Started

安装依赖：

```bash
npm install
```

本地开发：

```bash
npm run dev
```

## 部署

### Vercel

直接把仓库导入 Vercel 即可（本项目是静态导出）。

### GitHub Pages

仓库自带 GitHub Actions 工作流：`.github/workflows/deploy.yml`。
注意事项：

- 默认分支按 `main` 配置。
- 对于项目页（`https://<user>.github.io/<repo>`），工作流会自动设置 `NEXT_PUBLIC_BASE_PATH=/<repo>`。
- 如果你是用户页（`https://<user>.github.io`，仓库名通常是 `<user>.github.io`），工作流会自动设置空的 basePath。

## SEO

- `public/robots.txt` 已包含站点地图声明
- `public/sitemap.xml` 目前是占位符，请把 `https://example.com` 改成你的真实域名
