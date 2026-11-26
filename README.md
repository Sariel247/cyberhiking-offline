# 赛博徒步 · 离线版

以公开仓库 PlutoCA/cyberhiking 为代码起点，参考官方网站公开玩法与内容整理的单机离线版本。非官方社区改造版。

- React + TypeScript + Vite
- 本地 LocalStorage 存档
- 已移除在线 Gemini 依赖，改为本地规则提示
- PWA Service Worker 离线缓存
- 官网商店数据：核心背负7件、生存装备20件、物资补给17件、特殊装备4件
- 初始预算22,200；默认65L背包1.8kg，负重上限25kg

本地运行需 Node.js 20：npm install、npm run dev；构建：npm run build。

GitHub Pages 预期地址：https://sariel247.github.io/cyberhiking-offline/。首次访问需联网缓存资源，之后可在同一浏览器离线打开。

代码基础：https://github.com/PlutoCA/cyberhiking
官网参考：https://cyberhiking.com/（检查版本v0.1.55）

鳌太线为高风险自然区域，本项目仅为虚拟游戏，不构成现实徒步建议。
