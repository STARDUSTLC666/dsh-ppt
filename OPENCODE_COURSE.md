# 任务书：课程包一键拆解成课件（dsh-ppt v0.22.0）

## 背景与目标

用户手上有一批**视频课程**（录屏讲解）+ **每节课配套的作业素材压缩包**。他要的是把这个文件夹直接交给插件，
自动拆解、提炼重点、生成一套**精讲课件**并配套**留作业**。

一句话目标：**拖一个文件夹进来 → 选模式 → 拿到整套课件 + 作业**。

## 本机已验证的能力（不要臆造，按这个来）

| 能力 | 情况 |
| --- | --- |
| ffmpeg / ffprobe | `/opt/homebrew/bin/ffmpeg`、`/opt/homebrew/bin/ffprobe`（8.1.2）；`lame` 也在 |
| 解压 | `/usr/bin/unzip`（zip）。**没有 7z/rar**，遇到就明确报"不支持，请先转 zip" |
| ASR | **需要前置条件，不要假设开箱可用**（已实测）：DSH 宿主有 `ctx.speechToText`，但当前指向 `https://api.siliconflow.cn/v1` 且**未配 key**，直接调用会返回 "needs a key"。可用路径见下方「ASR 三级探测」 |
| LLM | DSH 宿主 `ctx.llm`（参考 lib/coaching-model.js 的取法） |
| 音色替换 | VoiceStudio.app 0.5.6，FastAPI 后端默认 `http://127.0.0.1:3900`，有 `/dub/*` 路由（parse-subtitle-text、import-srt、配音生成，支持 speaker clone 与参考音频）。MCP 在 `/mcp/`，stdio 代理为 `python -m backend.mcp_shim` |

## 新增工具（4 个，全部中文描述）

### 1. `ppt_course_scan`（干跑，不落盘）
输入 `folder`。扫描并分类产出清单：视频（.mp4/.mov/.mkv/.avi/.webm/.m4v）、压缩包（.zip）、文档（.pdf/.docx/.pptx/.xlsx/.md/.txt）、图片；给出**建议的课程序号与节数**、每节课的时长（ffprobe）、压缩包与课程的匹配猜测。
用户先看清单再决定，避免一上来就跑几小时。

### 2. `ppt_course_build`（核心，一键出活）
参数：
- `folder`（必填）：课程文件夹绝对路径
- `mode`：`deep` 精讲 / `quick` 快速预览 / `outline` 大纲（默认 `deep`）
- `withHomework`：默认 true
- `useMaterials`：`auto`（默认，有 zip 就解压并融入）/ `none`
- `theme`、`language`、`outputDir`、`overwrite`、`motion`：沿用现有约定
- `maxLessons`、`voice`、`watermark`：见下（voice/watermark 可省略）

流水线：
1. **扫描**（复用 scan 的分类）
2. **抽音轨 + 转写**：ffmpeg 抽 16k 单声道 wav → 宿主 `speechToText.transcribe` → 带时间戳的分段
3. **分课**：按视频文件自然排序为课序；单视频多课时的，按静音/章节切分。产出每课的 `episode.json`（标题、时长、段落、时间戳）
4. **提炼**：用 `ctx.llm` 把每课转写**提炼成结构化要点**：核心概念、关键步骤、易错点、案例/示例、小结。**必须基于转写内容**，每个要点带时间戳溯源；转写缺失/过短时明确降级为"提取式摘要"，不要编造
5. **成稿**：按 `mode` 决定页数与深度
   - `deep`：每课 15–25 页（概念拆解、分段讲解、示例、易错点、练习引导）
   - `quick`：每课 6–10 页（核心结论 + 结构图）
   - `outline`：每课 3–5 页（纯大纲）
   复用现有 `deck-lesson.mjs` 的教学结构与 `buildDeckAsync` 出三件套，**不要另写一套 PPT 生成器**
6. **作业**：`withHomework` 时，每课出一页作业 + 单独 `homework.md`（任务、要用到的素材、评分要点、提交要求）
7. **素材融入**：`useMaterials=auto` 时解压到 `_materials/<课序>/`，按文件名/序号与课程匹配；图片可嵌入课件页，文档/表格在作业里引用并给出路径清单
8. **可选配音**：`voice.enabled` 时，用转写生成 SRT，调 VoiceStudio `/dub/*` 用指定音色产出配音音轨
9. **可选去水印**：`watermark.enabled` 时，用 ffmpeg 处理视频，产出新文件到 `_clean/`

产出目录结构（固定、可预期）：
```
<outputDir>/<课程名>/
  00-课程总览.html/.pptx/.json  +  course-index.md
  第01课-<标题>/  <同名>.html/.pptx/.json + .lesson-plan.md + homework.md
  第02课-.../
  _transcripts/第01课.srt + .json
  _materials/第01课/...
  _voiced/第01课.m4a            （可选）
  _clean/第01课-无水印.mp4      （可选）
  build-report.md              （每步做了什么、跳过了什么、为什么）
```

### 3. `ppt_course_voice`（音色替换）
参数：`input`（视频或 srt）、`voiceId` 或 `refAudio`、`outputDir`、`engine`。
- 优先检测 VoiceStudio 是否在跑（GET `http://127.0.0.1:3900/` 或已知 health 端点，超时 2s）
- 在跑：走 `/dub/*`，用 SRT + 目标音色产出配音
- 没在跑：**明确报"VoiceStudio 未运行，请先启动"**，并给出可选的替代（macOS `say` 仅用于试听，不要冒充成品）
- 绝不假装成功

### 4. `ppt_course_clean`（去水印）
参数：`input`（视频）、`method`：`delogo`（去/插值，默认）/ `blur` / `box`（纯遮挡）/ `crop`、`regions`：[{x,y,w,h}]、`auto`（bool）、`outputDir`。
- 有 `regions` 就按给定区域处理 —— 这是**唯一可靠**的方式
- `auto=true` 时做**候选区域探测**（多帧差分找稳定叠加物），产出的是"候选"，必须让用户确认后再执行，不要声称自动识别一定准
- ffmpeg 滤镜：`delogo=x:y:w:h` / `boxblur` / `drawbox` / `crop`；输出新文件，不动原件
- 明确说明：delogo 是邻域插值修补，画面会有痕迹；纯遮挡用 `box` 最稳

## ASR 三级探测（重要，先探测再动手）

按顺序尝试，任一可用即用；全不可用时**明确报错并给出可选方案**，绝不允许伪造转写内容。

1. **VoiceStudio 本地转写（首选，免费且私有）**
   VoiceStudio 暴露 OpenAI 兼容端点 `POST http://127.0.0.1:3900/v1/audio/transcriptions`。
   探测：GET `http://127.0.0.1:3900/system/asr-backends` 或 `/dictation/readiness`（2s 超时）。
   可用则用 multipart 上传 wav，字段 `file` + `model=whisper-1` + `language=zh`。
   **前提：VoiceStudio 应用必须正在运行**。未运行就跳到下一档。

2. **DSH 宿主 / asr.json**
   读 `$DSH_HOME/asr.json`（默认 `~/.dsh/asr.json`）。`baseUrl` + `key`（或 `keyEnv` 指向的环境变量）齐全才算可用。
   asr.json 支持 `manage: {start, stop, idleMs, waitMs}` 托管本地服务，文档里说明这个用法。

3. **都不可用** → 抛出中文错误，明确列出三条出路：
   - 启动 VoiceStudio（本机已装 0.5.6，最省事，可同时用于后面的配音）
   - 在 DSH「视频分镜设置」页填 ASR key
   - 或把 `~/.dsh/asr.json` 的 `baseUrl` 指向 `http://127.0.0.1:3900/v1`（VoiceStudio 在跑时等效第 1 档）

**测试时必须用 stub 覆盖 STT**（注入假的 transcribe），不要依赖真实服务，否则 CI 环境跑不了。

## 硬性要求

1. **不编造课程内容**。提炼必须溯源到转写的时间戳；转写质量差时降级为提取式摘要并标注。
2. **优雅降级**：没有 LLM / 没有 STT / VoiceStudio 没开时，分别给出明确的中文原因和可继续的部分，不要整条流水线崩掉。
3. **可中断、可续跑**：长任务要能 `signal` 取消；已完成的分步产物（转写、解压）落盘缓存，重跑不重复转写。
4. **路径安全**：解压防 zip-slip（`../` 越界），不写到输出目录之外；单文件与总量上限。
5. **中文报错**，错误里说清"哪一步、哪个文件、下一步怎么办"。
6. **零新依赖**：不要装 npm/pip 包，用现有 ffmpeg/宿主服务实现。
7. **不要动**现有 10 个工具的行为；`ppt_lesson_create` / `ppt_lesson_generate` 保持原样。

## 测试（必须写，用合成素材，不依赖真实课程）

新增 `test/course.test.mjs`：
- 用 ffmpeg 合成一个 2–3 秒测试视频（纯色 + 正弦音）到临时目录，验证：scan 正确分类、抽音轨成功、分课逻辑
- 用 stub 的 `speechToText`（返回固定分段）与 stub `llm`（返回固定结构）跑通 build，断言产出三件套 + homework.md + build-report.md 存在且 JSON 可解析
- 缺 STT / 缺 LLM / VoiceStudio 未运行时：断言给出明确中文原因、不崩、不产出假成品
- zip-slip 防护：构造带 `../` 的 zip，断言被拒绝
- 三种 mode 的页数区间符合预期
- 水印：给 `regions` 调 ffmpeg，断言输出文件存在且时长不变

## 交付前自查

```
npx tsc -p tsconfig.json
node scripts/build-client.mjs && node scripts/build-updates.mjs
node --test "test/*.test.mjs"      # 现有 227 项不得退化
npm pack --dry-run
```
文档同步：`skills/dsh-ppt/SKILL.md` 增"课程包转课件"触发条件；新增 `skills/dsh-ppt/references/course.md`（流水线、模式对照、素材匹配规则、音色与水印用法与限制）；`README.md` / `README.en.md` / `docs/USAGE.md` 各加一段示例；`CHANGELOG.md` 加 **0.22.0**（中英双语，别丢历史），`package.json` 版本 0.22.0。

## 边界

- 不要 `git add/commit/push`、不要 `npm publish`
- 不要改依赖、不要改 engines
- 全程中文汇报；结束时说明：新增文件、四个工具的调用示例、哪些能力已实测通过、哪些受本机环境限制
