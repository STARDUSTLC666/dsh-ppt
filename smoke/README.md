# dsh-ppt 冒烟清单

按老流程 SOP：脚手架 → 全量测试 → 真实 profile 启动冒烟 → 双语文档 → 目录 PR。

## 1. 单测与 CLI 冒烟

```bash
cd dsh-ppt
pnpm install
pnpm run build
pnpm test
pnpm run smoke:cli   # 使用 smoke/sample-deck.md 生成 .smoke-deck 三件套
```

## 2. 真实 profile 启动冒烟

本机 DSH 从源码树 `C:\Users\29022\deepseek-harness` 通过 `pnpm dsh` 启动。正确姿势：

```powershell
# 1. 在 DSH 源码树内安装本地插件到 smoke profile
cd C:\Users\29022\deepseek-harness
pnpm dsh plugin --profile smoke add E:\deepseek\dsh-ppt

# 2. 确认 smoke profile 的 bundles 为：
#    @deepseek-ai/dsh-base
#    @deepseek-ai/dsh-web-app
#    dsh-ppt
#    （插件命令自动写入 base + dsh-ppt；web-app 需手动补上）

# 3. 避免与正在运行的 web profile 抢 3080 端口，smoke profile 的
#    cordis.patch.yml 需覆盖：
#    - id: webserver
#      config: { host: 127.0.0.1, port: 3180 }

# 4. 启动（注意：自定义 profile 不能写 `--profile smoke web`）
pnpm dsh --profile smoke
```

观察点：

- 启动 stderr 无 `[dsh-ppt]` 报错。
- 会话工具列表出现 `ppt_create` / `ppt_themes`。
- 技能列表出现 `dsh-ppt`。
- 调 `ppt_create` 后在工作区出现 `.html` / `.pptx` / `.json` 三件套。

## 3. 验收对话

> 把这句话做成 PPT：「AI 客服把首次响应时间压缩到 8 秒」，主题用 data，语言用中文。

预期：返回三个绝对路径，HTML 可双击放映，PPTX 可打开编辑。
