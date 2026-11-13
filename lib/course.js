/**
 * course.ts —— 课程包一键拆解成课件（dsh-ppt 0.22.0）。
 *
 * 只做「把视频课程文件夹拆成精讲课件 + 作业」的编排，不编造课程内容：
 *  - 扫描：分类视频 / 压缩包 / 文档 / 图片，给课程序号与时长。
 *  - 抽音轨 + 转写：ffmpeg 抽 16k 单声道 wav → 三级探测 ASR → 带时间戳分段。
 *  - 提炼：LLM 把转写提炼成结构化要点（溯源时间戳）；无 LLM / 转写过短降级为提取式摘要。
 *  - 成稿：复用 deck-advanced.mjs 的 buildDeckAsync 出三件套，页数与深度按 mode 控制。
 *  - 作业 / 素材融入 / 可选配音 / 可选去水印。
 *
 * 零新依赖：只用 node 内置 + 宿主 ffmpeg/ffprobe/unzip + 宿主 llm/speechToText。
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, resolve, sep, relative } from 'node:path';
import { unzipSync } from 'fflate';
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v']);
const ZIP_EXTS = new Set(['.zip']);
const DOC_EXTS = new Set(['.pdf', '.docx', '.pptx', '.xlsx', '.md', '.txt']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);
const VOICE_STUDIO_BASE = 'http://127.0.0.1:3900';
function asRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function cwdOf(exec) {
    return exec?.agent?.session.header.cwd ?? process.cwd();
}
function abort(signal) {
    signal?.throwIfAborted();
}
function isWithin(base, target) {
    const rel = relative(resolve(base), resolve(target));
    return rel === '' || (!rel.startsWith('..') && !rel.startsWith(sep));
}
function runProcess(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let stdout = '';
        let stderr = '';
        let timer;
        const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const finish = (error) => {
            if (settled)
                return;
            settled = true;
            if (timer)
                clearTimeout(timer);
            if (error)
                reject(error);
        };
        child.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
        child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
        child.on('error', (error) => finish(error));
        child.on('close', (code) => {
            if (settled)
                return;
            settled = true;
            if (timer)
                clearTimeout(timer);
            resolve({ code, stdout, stderr });
        });
        const onAbort = () => {
            if (settled)
                return;
            try {
                child.kill('SIGKILL');
            }
            catch { /* ignore */ }
            finish(new Error('任务已取消 / Cancelled'));
        };
        if (opts.signal) {
            if (opts.signal.aborted) {
                onAbort();
                return;
            }
            opts.signal.addEventListener('abort', onAbort, { once: true });
        }
        if (opts.timeoutMs) {
            timer = setTimeout(() => {
                try {
                    child.kill('SIGKILL');
                }
                catch { /* ignore */ }
                finish(new Error('命令执行超时（' + opts.timeoutMs + 'ms）'));
            }, opts.timeoutMs);
        }
    });
}
// ---------------------------------------------------------------------------
// LLM 适配：DSH 宿主 llm → CourseLlm（参考 coaching-model.js 的流式读取）
// ---------------------------------------------------------------------------
export function nativeCourseLlm(llm) {
    return {
        async complete(system, input, signal) {
            if (!llm || typeof llm.listProviders !== 'function')
                throw new Error('宿主未提供可用的 LLM 服务');
            const providers = llm.listProviders();
            if (!Array.isArray(providers) || providers.length === 0)
                throw new Error('没有配置可用的模型服务');
            let route;
            let modelId;
            for (const provider of providers.slice(0, 20)) {
                try {
                    const models = await llm.listModels(provider.id);
                    const usable = models.find((m) => !m.inputModalities || m.inputModalities.includes('text'));
                    if (usable) {
                        route = { provider: provider.id, model: usable.id };
                        modelId = usable.id;
                        break;
                    }
                }
                catch { /* try next provider */ }
            }
            if (!route)
                throw new Error('没有配置可用的文本模型');
            const active = AbortSignal.any([signal, AbortSignal.timeout(120_000)]);
            let rejectAbort;
            const aborted = new Promise((_, reject) => { rejectAbort = reject; });
            const onAbort = () => rejectAbort(new Error('模型调用已停止 / Model call stopped'));
            active.addEventListener('abort', onAbort, { once: true });
            let stream;
            try {
                active.throwIfAborted();
                const it = llm.stream({ provider: route.provider, model: modelId, system, tools: [], maxTokens: 6000, signal: active,
                    messages: [{ role: 'user', content: [{ type: 'text', text: input }] }] })[Symbol.asyncIterator]();
                stream = it;
                const blocks = new Map();
                let stopped = false;
                for (;;) {
                    const part = await Promise.race([it.next(), aborted]);
                    if (part.done)
                        break;
                    const chunk = part.value;
                    if (chunk.type === 'tool-call-delta' || (chunk.type === 'block-end' && chunk.block?.type === 'tool-call'))
                        throw new Error('模型尝试调用工具 / Unexpected tool call');
                    if (chunk.type === 'text-delta')
                        blocks.set(chunk.index, (blocks.get(chunk.index) || '') + String(chunk.text || ''));
                    if (chunk.type === 'block-end' && chunk.block?.type === 'text')
                        blocks.set(chunk.index, String(chunk.block.text || ''));
                    if ([...blocks.values()].reduce((sum, text) => sum + text.length, 0) > 30_000)
                        throw new Error('模型输出过长 / Model output limit');
                    if (chunk.type === 'finish') {
                        if (chunk.reason?.kind !== 'stop')
                            throw new Error('模型输出未完整结束 / Incomplete model output');
                        stopped = true;
                        break;
                    }
                }
                const output = [...blocks].sort(([a], [b]) => a - b).map(([, text]) => text).join('');
                if (!stopped || !output.trim())
                    throw new Error('模型未返回完整文本 / No complete model response');
                return output;
            }
            finally {
                active.removeEventListener('abort', onAbort);
                if (stream?.return)
                    void Promise.resolve(stream.return()).catch(() => { });
            }
        },
    };
}
// ---------------------------------------------------------------------------
// ASR 三级探测
// ---------------------------------------------------------------------------
function probeHttp(url, signal, timeoutMs = 2000) {
    return new Promise((resolvePromise) => {
        const controller = new AbortController();
        const timer = setTimeout(() => { controller.abort(); resolvePromise(false); }, timeoutMs);
        const onAbort = () => { clearTimeout(timer); resolvePromise(false); };
        signal.addEventListener('abort', onAbort, { once: true });
        fetch(url, { method: 'GET', signal: controller.signal })
            .then((res) => { clearTimeout(timer); resolvePromise(res.ok); })
            .catch(() => { clearTimeout(timer); resolvePromise(false); })
            .finally(() => signal.removeEventListener('abort', onAbort));
    });
}
function readAsrConfig(home) {
    try {
        const path = join(home, 'asr.json');
        if (!existsSync(path))
            return {};
        const raw = JSON.parse(readFileSync(path, 'utf8'));
        if (!raw || typeof raw !== 'object')
            return {};
        const baseUrl = typeof raw.baseUrl === 'string' && raw.baseUrl.trim() ? raw.baseUrl.trim() : undefined;
        let key = typeof raw.key === 'string' && raw.key.trim() ? raw.key.trim() : undefined;
        if (!key && typeof raw.keyEnv === 'string' && raw.keyEnv.trim())
            key = process.env[raw.keyEnv.trim()];
        return { baseUrl, key };
    }
    catch {
        return {};
    }
}
async function fetchTranscribe(baseUrl, key, audioPath, signal) {
    const bytes = readFileSync(audioPath);
    const boundary = '----dshpptcourse' + Date.now().toString(36);
    const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`);
    const mid = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nzh\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, bytes, mid]);
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal.addEventListener('abort', onAbort, { once: true });
    try {
        const res = await fetch(baseUrl.replace(/\/$/, '') + '/v1/audio/transcriptions', {
            method: 'POST', signal: controller.signal,
            headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, authorization: `Bearer ${key}` },
            body,
        });
        if (!res.ok)
            throw new Error('ASR 返回 HTTP ' + res.status);
        const data = await res.json();
        return normalizeAsrResponse(data);
    }
    finally {
        signal.removeEventListener('abort', onAbort);
    }
}
function normalizeAsrResponse(data) {
    if (Array.isArray(data)) {
        return data.filter((s) => s && typeof s.text === 'string').map((s) => ({
            start: Number(s.start ?? s.start_time ?? 0) || 0,
            end: Number(s.end ?? s.end_time ?? s.start ?? 0) || 0,
            text: String(s.text),
        }));
    }
    if (data && typeof data === 'object' && Array.isArray(data.segments)) {
        return data.segments.filter((s) => s && typeof s.text === 'string').map((s) => ({
            start: Number(s.start ?? 0) || 0,
            end: Number(s.end ?? 0) || 0,
            text: String(s.text),
        }));
    }
    if (data && typeof data.text === 'string') {
        return [{ start: 0, end: 0, text: String(data.text) }];
    }
    return [];
}
/** 把 DSH 宿主 speechToText.transcribe 包装成统一转写接口。 */
function hostTranscriber(speechToText) {
    if (!speechToText || typeof speechToText.transcribe !== 'function')
        return undefined;
    return async (audioPath, signal) => {
        const data = await speechToText.transcribe({ path: audioPath, language: 'zh', signal });
        return normalizeAsrResponse(data);
    };
}
// ---------------------------------------------------------------------------
// 服务本体
// ---------------------------------------------------------------------------
/**
 * 修复 ZIP 条目文件名的编码。
 * fflate 在没有 UTF-8 标志（通用标志位 11）时按 latin1 还原文件名，
 * 于是 macOS/Windows 打的包含中文的包会显示成「ä½ä¸š...」这类乱码。
 * 这里把 latin1 字符串还原成原始字节，再依次尝试 UTF-8、GBK（Windows 常见）。
 */
function decodeZipEntryName(name) {
    if (!/[\u0080-\u00ff]/.test(name))
        return name;
    const bytes = Buffer.from(name, 'latin1');
    const utf8 = bytes.toString('utf8');
    if (!utf8.includes('\ufffd'))
        return utf8;
    try {
        const gbk = new TextDecoder('gbk').decode(bytes);
        if (gbk && !gbk.includes('\ufffd'))
            return gbk;
    }
    catch {
        /* 运行环境没有 GBK 解码器时保持原样，不阻断解压 */
    }
    return name;
}
export class CourseService {
    llm;
    speechToText;
    transcribeOverride;
    ffmpegPath;
    ffprobePath;
    home;
    outputDir;
    maxSlides;
    constructor(options = {}) {
        this.llm = options.llm;
        this.speechToText = options.speechToText;
        this.transcribeOverride = options.transcribe;
        this.ffmpegPath = options.ffmpegPath || '/opt/homebrew/bin/ffmpeg';
        this.ffprobePath = options.ffprobePath || '/opt/homebrew/bin/ffprobe';
        this.home = options.home || process.env.DSH_HOME || join(homedir(), '.dsh');
        this.outputDir = options.outputDir || '';
        this.maxSlides = options.maxSlides || 120;
    }
    /** 由 index.ts 在注入 ['llm', 'speechToText'] 后调用。 */
    setHost(host) {
        if (host?.llm)
            this.llm = nativeCourseLlm(host.llm);
        this.speechToText = host?.speechToText;
    }
    // -- 扫描 ------------------------------------------------------------------
    async scan(rawArgs, exec) {
        abort(exec?.signal);
        const args = asRecord(rawArgs);
        const folder = typeof args.folder === 'string' && args.folder.trim() !== '' ? args.folder.trim() : '';
        if (folder === '')
            throw new Error('课程扫描失败：folder 不能为空，请提供课程文件夹绝对路径');
        const abs = resolve(cwdOf(exec), folder);
        if (!existsSync(abs))
            throw new Error('课程扫描失败：找不到文件夹 ' + abs + '，请检查路径');
        if (!statSync(abs).isDirectory())
            throw new Error('课程扫描失败：' + abs + ' 不是文件夹');
        const entries = readdirSync(abs)
            .map((name) => ({ name, path: join(abs, name) }))
            .filter((e) => { try {
            return statSync(e.path).isFile();
        }
        catch {
            return false;
        } });
        const videos = [];
        const zips = [];
        const docs = [];
        const images = [];
        for (const e of entries) {
            const ext = extname(e.name).toLowerCase();
            if (VIDEO_EXTS.has(ext)) {
                videos.push({ name: e.name, path: e.path, ext, durationSec: await this.probeDuration(e.path, exec?.signal) });
            }
            else if (ZIP_EXTS.has(ext)) {
                zips.push({ name: e.name, path: e.path, ext });
            }
            else if (DOC_EXTS.has(ext)) {
                docs.push({ name: e.name, path: e.path, ext });
            }
            else if (IMAGE_EXTS.has(ext)) {
                images.push({ name: e.name, path: e.path, ext });
            }
        }
        const collator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' });
        videos.sort((a, b) => collator.compare(a.name, b.name));
        zips.sort((a, b) => collator.compare(a.name, b.name));
        docs.sort((a, b) => collator.compare(a.name, b.name));
        images.sort((a, b) => collator.compare(a.name, b.name));
        videos.forEach((v, i) => { v.lesson = i + 1; v.lessonTitle = deriveLessonTitle(v.name); });
        // 压缩包与课程的匹配猜测
        for (const z of zips) {
            const num = firstNumber(z.name);
            if (num !== undefined && videos.some((v) => v.lesson === num)) {
                z.matchedLesson = num;
                z.matchReason = '压缩包名与第 ' + num + ' 课序号一致';
                continue;
            }
            const stem = basename(z.name, extname(z.name)).toLowerCase();
            const hit = videos.find((v) => basename(v.name, extname(v.name)).toLowerCase().includes(stem) || stem.includes(basename(v.name, extname(v.name)).toLowerCase()));
            if (hit && hit.lesson !== undefined) {
                z.matchedLesson = hit.lesson;
                z.matchReason = '压缩包名与「' + hit.name + '」相似';
            }
        }
        const courseName = sanitizeName(basename(abs));
        const suggestedLessons = Math.max(1, videos.length);
        const suggestion = videos.length === 0
            ? '未发现视频（.mp4/.mov/.mkv/.avi/.webm/.m4v）。请确认课程视频放在该文件夹内，或改传 .zip 转写。'
            : '建议共 ' + suggestedLessons + ' 节课。先确认这份清单（课序、时长、素材匹配）再调 ppt_course_build，避免长任务跑错方向。';
        return { ok: true, folder: abs, courseName, videos, zips, docs, images, suggestedLessons, suggestion };
    }
    async probeDuration(path, signal) {
        try {
            const { stdout } = await runProcess(this.ffprobePath, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path], { signal, timeoutMs: 15000 });
            const n = Number(String(stdout).trim());
            return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
        }
        catch {
            return undefined;
        }
    }
    // -- ASR 探测 --------------------------------------------------------------
    async resolveTranscriber(signal) {
        if (this.transcribeOverride)
            return { id: 'injected', transcribe: this.transcribeOverride };
        // 第 1 级：VoiceStudio 本地转写（免费且私有）
        if (await probeHttp(VOICE_STUDIO_BASE + '/system/asr-backends', signal, 2000)) {
            return { id: 'voicestudio', transcribe: (audioPath, s) => fetchTranscribe(VOICE_STUDIO_BASE + '/v1', 'local', audioPath, s) };
        }
        // 第 2 级：DSH 宿主 / asr.json
        const cfg = readAsrConfig(this.home);
        if (cfg.baseUrl && cfg.key) {
            const hostFn = hostTranscriber(this.speechToText);
            if (hostFn)
                return { id: 'dsh', transcribe: hostFn };
            return { id: 'asr-json', transcribe: (audioPath, s) => fetchTranscribe(cfg.baseUrl, cfg.key, audioPath, s) };
        }
        const hostFn = hostTranscriber(this.speechToText);
        if (hostFn)
            return { id: 'dsh', transcribe: hostFn };
        // 第 3 级：全不可用
        throw new Error('ASR 转写不可用，无法从视频抽取文字。三条出路任选其一：\n' +
            '1. 启动 VoiceStudio（本机已装 0.5.6，最省事，还能用于后面的配音）；\n' +
            '2. 在 DSH「视频分镜设置」页填写 ASR key；\n' +
            '3. 把 ' + join(this.home, 'asr.json') + ' 的 baseUrl 指向 http://127.0.0.1:3900/v1（VoiceStudio 在跑时等效第 1 档）。');
    }
    // -- 抽音轨 + 转写 ---------------------------------------------------------
    async extractAudio(videoPath, wavPath, signal) {
        abort(signal);
        mkdirSync(dirname(wavPath), { recursive: true });
        const { code, stderr } = await runProcess(this.ffmpegPath, ['-y', '-i', videoPath, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wavPath], { signal, timeoutMs: 120_000 });
        if (code !== 0)
            throw new Error('抽音轨失败（' + videoPath + '）：' + stderr.slice(-400));
    }
    async transcribeToSegments(videoPath, wavPath, signal) {
        let transcriber;
        try {
            transcriber = await this.resolveTranscriber(signal);
        }
        catch {
            return { segments: [], stt: 'missing' };
        }
        try {
            await this.extractAudio(videoPath, wavPath, signal);
            const segments = await transcriber.transcribe(wavPath, signal);
            if (!segments.length)
                return { segments: [], stt: 'empty' };
            return { segments, stt: 'ok' };
        }
        catch (error) {
            if (error instanceof Error && /needs a key|key|未配置|401|403|ASR/.test(error.message))
                return { segments: [], stt: 'missing' };
            return { segments: [], stt: 'failed' };
        }
    }
    // -- 分课 ------------------------------------------------------------------
    async splitLessons(videoPath, durationSec, signal) {
        abort(signal);
        if (durationSec <= 600)
            return [{ start: 0, end: durationSec }];
        // 长视频：静音检测切分（失败则回退为单节课）
        try {
            const { stdout } = await runProcess(this.ffmpegPath, ['-i', videoPath, '-af', 'silencedetect=noise=-35dB:d=0.8', '-f', 'null', '-'], { signal, timeoutMs: 120_000 });
            const boundaries = [...stdout.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
            const cuts = boundaries.filter((t) => t > 20 && t < durationSec - 20);
            if (cuts.length === 0)
                return [{ start: 0, end: durationSec }];
            const chunks = [];
            let prev = 0;
            for (const t of cuts) {
                chunks.push({ start: prev, end: t });
                prev = t;
            }
            chunks.push({ start: prev, end: durationSec });
            return chunks.filter((c) => c.end - c.start > 10);
        }
        catch {
            return [{ start: 0, end: durationSec }];
        }
    }
    // -- 提炼 ------------------------------------------------------------------
    async refine(segments, title, signal) {
        const text = segments.map((s) => s.text).join(' ').trim();
        if (text.length < 20)
            return { mode: 'extractive', coreConcepts: [], keySteps: [], pitfalls: [], examples: [], summary: [], note: '转写过短，无法提炼，仅做提取式摘要。' };
        if (!this.llm)
            return extractiveRefine(segments, '宿主未提供 LLM，降级为提取式摘要。');
        const transcript = segments.map((s) => `[${fmtTime(s.start)}-${fmtTime(s.end)}] ${s.text}`).join('\n');
        const system = '你是课程内容提炼助手。只依据下方转写内容提炼，不编造、不补充转写之外的事实。每个要点必须带转写时间戳溯源。输出严格 JSON。';
        const input = '课程标题：' + title + '\n转写内容（带时间戳）：\n' + transcript + '\n\n' +
            '请输出 JSON：{"coreConcepts":[{"title":"概念名","points":["要点"],"start":秒,"end":秒}],"keySteps":[{"title":"步骤名","points":["要点"],"start":秒,"end":秒}],"pitfalls":["易错点"],"examples":[{"title":"案例名","points":["要点"]}],"summary":["小结"]}';
        try {
            const raw = await this.llm.complete(system, input, signal);
            const data = parseLlmJson(raw);
            if (!data || typeof data !== 'object')
                return extractiveRefine(segments, 'LLM 未返回可解析的结构，降级为提取式摘要。');
            return {
                mode: 'llm',
                coreConcepts: normPoints(data.coreConcepts),
                keySteps: normPoints(data.keySteps),
                pitfalls: Array.isArray(data.pitfalls) ? data.pitfalls.map(String).filter(Boolean) : [],
                examples: normPoints(data.examples),
                summary: Array.isArray(data.summary) ? data.summary.map(String).filter(Boolean) : [],
            };
        }
        catch (error) {
            return extractiveRefine(segments, 'LLM 提炼失败，降级为提取式摘要：' + (error instanceof Error ? error.message : String(error)));
        }
    }
    // -- 成稿 ------------------------------------------------------------------
    async buildLesson(options) {
        const { generateCoursePlan, renderCoursePlanMarkdown } = await loadCourseEngine();
        const plan = generateCoursePlan({
            topic: options.title, mode: options.mode, language: options.language, refined: options.refined,
            withHomework: options.withHomework, lessonIndex: options.lessonIndex, materials: options.materials,
            stt: options.segments.length ? 'ok' : 'missing', durationSec: Math.max(1, Math.round(options.segments.length ? options.segments[options.segments.length - 1].end : 0)),
        });
        const deck = await loadBuildDeckAsync();
        const out = await deck({
            title: options.title, slides: plan.slides, theme: options.theme, lang: options.language, motion: options.motion,
            outputDir: options.outputDir, fileName: options.fileName, overwrite: options.overwrite === true, cwd: process.cwd(), signal: options.signal,
        });
        const lessonPlanPath = out.jsonPath.slice(0, -5) + '.lesson-plan.md';
        writeFileSync(lessonPlanPath, renderCoursePlanMarkdown(plan, options.segments), 'utf8');
        let homeworkPath;
        if (options.withHomework) {
            homeworkPath = out.jsonPath.slice(0, -5) + '.homework.md';
            writeFileSync(homeworkPath, renderHomeworkMarkdown(plan, options.materials, options.materialDir, options.language), 'utf8');
        }
        return { slideCount: out.slideCount, htmlPath: out.htmlPath, pptxPath: out.pptxPath, jsonPath: out.jsonPath, lessonPlanPath, homeworkPath };
    }
    // -- build 主流程 ----------------------------------------------------------
    async build(rawArgs, exec) {
        abort(exec?.signal);
        const args = asRecord(rawArgs);
        const scanResult = await this.scan({ folder: args.folder }, exec);
        const mode = (args.mode === 'quick' || args.mode === 'outline') ? args.mode : 'deep';
        const withHomework = args.withHomework !== false;
        const useMaterials = args.useMaterials === 'none' ? 'none' : 'auto';
        const theme = typeof args.theme === 'string' && args.theme.trim() !== '' ? args.theme.trim() : 'soft';
        const language = typeof args.language === 'string' && ['zh', 'en', 'bilingual'].includes(args.language) ? args.language : 'zh';
        const motion = args.motion === 'off' ? 'off' : undefined;
        const maxLessons = clampInt(args.maxLessons, 100, 1, 200);
        const overwrite = args.overwrite === true;
        const voice = asRecord(args.voice);
        const watermark = asRecord(args.watermark);
        const baseOut = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? args.outputDir.trim() : this.outputDir || '.';
        const outputRoot = resolve(cwdOf(exec), baseOut, sanitizeName(scanResult.courseName));
        const warnings = [];
        const signal = exec?.signal ?? new AbortController().signal;
        // 素材融入
        const materials = [];
        if (useMaterials === 'auto') {
            for (const z of scanResult.zips) {
                const lesson = z.matchedLesson ?? 1;
                const dest = join(outputRoot, '_materials', '第' + pad2(lesson) + '课');
                try {
                    const files = await this.safeUnzip(z.path, dest, signal);
                    materials.push({ lesson, dir: dest, files });
                }
                catch (error) {
                    warnings.push('素材解压失败（' + z.name + '）：' + (error instanceof Error ? error.message : String(error)));
                }
            }
        }
        // 逐课
        const lessons = [];
        const lessonIndex = 0;
        let produced = 0;
        for (const video of scanResult.videos) {
            if (produced >= maxLessons) {
                warnings.push('已达 maxLessons=' + maxLessons + '，其余视频跳过。');
                break;
            }
            abort(signal);
            const durationSec = video.durationSec ?? 0;
            const chunks = await this.splitLessons(video.path, durationSec, signal);
            const title = video.lessonTitle || ('第' + pad2(video.lesson ?? 0) + '课');
            for (const chunk of chunks) {
                if (produced >= maxLessons)
                    break;
                produced += 1;
                const index = produced;
                const segKey = '第' + pad2(index) + '课';
                const transcriptDir = join(outputRoot, '_transcripts');
                const wavPath = join(transcriptDir, segKey + '.wav');
                const { segments, stt } = await this.transcribeToSegments(video.path, wavPath, signal);
                const refined = stt === 'ok' ? await this.refine(segments, title, signal) : { mode: 'extractive', coreConcepts: [], keySteps: [], pitfalls: [], examples: [], summary: [], note: stt === 'missing' ? 'ASR 不可用，无转写，无法提炼。' : '转写为空，无法提炼。' };
                const refineKind = stt === 'ok' ? refined.mode : 'none';
                // 写转写缓存
                let transcriptPath;
                let srtPath;
                if (segments.length) {
                    transcriptPath = join(transcriptDir, segKey + '.json');
                    srtPath = join(transcriptDir, segKey + '.srt');
                    writeFileSync(transcriptPath, JSON.stringify({ title, source: video.name, segments }, null, 2) + '\n', 'utf8');
                    writeFileSync(srtPath, segmentsToSrt(segments), 'utf8');
                }
                const lessonDir = join(outputRoot, segKey + '-' + sanitizeName(title));
                const matDir = materials.find((m) => m.lesson === index)?.dir;
                const matFiles = materials.find((m) => m.lesson === index)?.files;
                let lesson;
                if (segments.length === 0) {
                    // 无转写：不产出假装有内容的课件，只记录跳过原因
                    lesson = { index, title, dir: lessonDir, source: video.name, durationSec: durationSec, slideCount: 0, htmlPath: '', pptxPath: '', jsonPath: '', stt, refine: refineKind };
                    warnings.push('第 ' + index + ' 课「' + title + '」无可用转写，未生成课件（' + (refined.note || stt) + '）。');
                }
                else {
                    const built = await this.buildLesson({
                        title, subtitle: '视频课：' + video.name, segments, refined, mode, theme, language, motion,
                        outputDir: lessonDir, fileName: sanitizeName(title), withHomework, lessonIndex: index,
                        materialDir: matDir, materials: matFiles, overwrite, signal,
                    });
                    lesson = { index, title, dir: lessonDir, source: video.name, durationSec: durationSec, slideCount: built.slideCount, htmlPath: built.htmlPath, pptxPath: built.pptxPath, jsonPath: built.jsonPath, lessonPlanPath: built.lessonPlanPath, homeworkPath: built.homeworkPath, transcriptPath, srtPath, stt, refine: refineKind };
                }
                lessons.push(lesson);
            }
        }
        // 课程总览
        const overviewDir = join(outputRoot, '00-课程总览');
        const overview = await this.buildOverview(scanResult.courseName, lessons, scanResult, { mode, theme, language, motion, outputDir: overviewDir, overwrite, signal });
        const courseIndexPath = join(outputRoot, 'course-index.md');
        writeFileSync(courseIndexPath, renderCourseIndex(scanResult, lessons, materials), 'utf8');
        const reportPath = join(outputRoot, 'build-report.md');
        writeFileSync(reportPath, renderBuildReport(scanResult, lessons, materials, warnings, { mode, withHomework, useMaterials, voice, watermark, sttBackend: await this.describeStt() }), 'utf8');
        // 可选配音 / 去水印
        const voiced = [];
        const cleaned = [];
        if (voice.enabled === true) {
            for (const l of lessons) {
                if (!l.srtPath)
                    continue;
                try {
                    const v = await this.voice({ input: l.srtPath, voiceId: voice.voiceId, refAudio: voice.refAudio, outputDir: join(outputRoot, '_voiced'), engine: voice.engine }, exec);
                    if (v.audioPath)
                        voiced.push(v.audioPath);
                }
                catch (error) {
                    warnings.push('配音失败（第 ' + l.index + ' 课）：' + (error instanceof Error ? error.message : String(error)));
                }
            }
        }
        if (watermark.enabled === true) {
            for (const l of lessons) {
                try {
                    const c = await this.clean({ input: l.source, method: watermark.method, regions: watermark.regions, auto: watermark.auto, outputDir: join(outputRoot, '_clean') }, exec);
                    if (c.ok)
                        cleaned.push(c.outputPath);
                }
                catch (error) {
                    warnings.push('去水印失败（第 ' + l.index + ' 课）：' + (error instanceof Error ? error.message : String(error)));
                }
            }
        }
        return {
            ok: true, courseName: scanResult.courseName, outputDir: outputRoot, mode, lessons,
            overview: { htmlPath: overview.htmlPath, pptxPath: overview.pptxPath, jsonPath: overview.jsonPath, slideCount: overview.slideCount },
            courseIndexPath, reportPath,
            materials: materials.map((m) => ({ lesson: m.lesson, dir: m.dir })),
            voiced, cleaned, warnings,
        };
    }
    async buildOverview(courseName, lessons, scan, opts) {
        const slides = [{ layout: 'cover', title: courseName, subtitle: '共 ' + lessons.length + ' 节课 · 课程总览' }];
        for (const l of lessons) {
            slides.push({ layout: 'bullets', title: '第 ' + pad2(l.index) + ' 课：' + l.title, bullets: [
                    '时长：' + fmtDuration(l.durationSec),
                    '来源：' + l.source,
                    l.stt === 'ok' ? '转写：已生成（提炼 ' + (l.refine === 'llm' ? '由 LLM 完成' : '提取式摘要') + '）' : '转写：' + (l.stt === 'missing' ? 'ASR 不可用' : '为空'),
                ] });
        }
        slides.push({ layout: 'closing', title: '开始学习', subtitle: '从第 1 课开始，逐课观看视频并配合课件。' });
        const deck = await loadBuildDeckAsync();
        const out = await deck({ title: courseName, slides, theme: opts.theme, lang: opts.language, motion: opts.motion, outputDir: opts.outputDir, fileName: '00-课程总览', overwrite: opts.overwrite === true, cwd: process.cwd(), signal: opts.signal });
        return { htmlPath: out.htmlPath, pptxPath: out.pptxPath, jsonPath: out.jsonPath, slideCount: out.slideCount };
    }
    async describeStt() {
        try {
            const t = await this.resolveTranscriber(new AbortController().signal);
            return t.id;
        }
        catch {
            return 'unavailable';
        }
    }
    // -- 素材解压（zip-slip 防护） -------------------------------------------
    async safeUnzip(zipPath, destDir, signal) {
        abort(signal);
        const bytes = readFileSync(zipPath);
        if (bytes.length > 256 * 1024 * 1024)
            throw new Error('压缩包超过 256 MiB，已拒绝');
        let rawEntries;
        try {
            rawEntries = unzipSync(bytes);
        }
        catch (error) {
            throw new Error('压缩包无法解析：' + (error instanceof Error ? error.message : String(error)));
        }
        // 修复中文文件名乱码；同名条目保留先出现的那个
        const entries = {};
        for (const [name, data] of Object.entries(rawEntries)) {
            const fixed = decodeZipEntryName(name);
            if (!(fixed in entries))
                entries[fixed] = data;
        }
        const names = Object.keys(entries);
        if (names.length === 0)
            throw new Error('压缩包为空');
        if (names.length > 2000)
            throw new Error('压缩包条目超过 2000 个，已拒绝，避免解压爆炸');
        // 1. 逐个校验路径，防 zip-slip（../ 越界、绝对路径、盘符）
        let total = 0;
        for (const [name, data] of Object.entries(entries)) {
            const normalized = name.replace(/\\/g, '/');
            if (normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized))
                throw new Error('压缩包含绝对路径条目，已拒绝：' + name);
            if (normalized.split('/').some((seg) => seg === '..'))
                throw new Error('压缩包含越界路径（../），已拒绝：' + name);
            total += data.length;
        }
        if (total > 256 * 1024 * 1024)
            throw new Error('压缩包解压后总量超过 256 MiB，已拒绝');
        // 2. 解压到目标目录，逐条写盘（目录条目跳过）
        mkdirSync(destDir, { recursive: true });
        const files = [];
        for (const [name, data] of Object.entries(entries)) {
            if (name.endsWith('/'))
                continue;
            const normalized = name.replace(/\\/g, '/');
            const target = resolve(destDir, normalized);
            if (!isWithin(destDir, target))
                throw new Error('压缩包条目越界，已拒绝：' + name);
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, data);
            files.push(target);
        }
        return files;
    }
    // -- 配音 ------------------------------------------------------------------
    async voice(rawArgs, exec) {
        abort(exec?.signal);
        const args = asRecord(rawArgs);
        const input = typeof args.input === 'string' ? args.input.trim() : '';
        if (input === '')
            throw new Error('配音失败：input 不能为空，请提供视频或 srt 路径');
        const running = await probeHttp(VOICE_STUDIO_BASE + '/', exec?.signal ?? new AbortController().signal, 2000);
        if (!running) {
            throw new Error('VoiceStudio 未运行，请先启动（本机已装 0.5.6）。替代方案：macOS `say` 仅用于试听，不能作为成品配音。');
        }
        // 生成 SRT（视频则抽音轨 + 转写）
        let srtPath;
        if (extname(input).toLowerCase() === '.srt') {
            srtPath = input;
        }
        else {
            const abs = resolve(cwdOf(exec), input);
            const wav = join(tmpBase(), 'voice-' + Date.now().toString(36) + '.wav');
            const { segments } = await this.transcribeToSegments(abs, wav, exec?.signal ?? new AbortController().signal);
            const outDir = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? resolve(cwdOf(exec), args.outputDir) : dirname(abs);
            mkdirSync(outDir, { recursive: true });
            srtPath = join(outDir, basename(abs, extname(abs)) + '.srt');
            writeFileSync(srtPath, segmentsToSrt(segments), 'utf8');
        }
        // 调用 VoiceStudio /dub/*（最佳努力，绝不假装成功）
        const voiceId = typeof args.voiceId === 'string' ? args.voiceId : undefined;
        const refAudio = typeof args.refAudio === 'string' ? args.refAudio : undefined;
        const engine = typeof args.engine === 'string' ? args.engine : 'voicestudio';
        let audioPath;
        try {
            const srtText = readFileSync(srtPath, 'utf8');
            const res = await fetch(VOICE_STUDIO_BASE + '/dub/import-srt', {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ srt: srtText, voiceId, refAudio, engine }),
            });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data && typeof data === 'object' && typeof data.audioPath === 'string')
                    audioPath = data.audioPath;
                else if (data && typeof data === 'object' && typeof data.audio === 'string')
                    audioPath = data.audio;
            }
        }
        catch { /* 接口结构未知，不阻断 */ }
        return {
            ok: audioPath !== undefined,
            running: true,
            message: audioPath
                ? '配音已生成：' + audioPath
                : 'VoiceStudio 正在运行，SRT 已就绪（' + srtPath + '），但 /dub/import-srt 未返回成品音频路径。请按其实际路由确认配音生成，本工具不冒充成功。',
            srtPath, audioPath,
        };
    }
    // -- 去水印 ----------------------------------------------------------------
    async clean(rawArgs, exec) {
        abort(exec?.signal);
        const args = asRecord(rawArgs);
        const input = typeof args.input === 'string' && args.input.trim() !== '' ? args.input.trim() : '';
        if (input === '')
            throw new Error('去水印失败：input 不能为空，请提供视频路径');
        const method = (args.method === 'blur' || args.method === 'box' || args.method === 'crop') ? args.method : 'delogo';
        const abs = resolve(cwdOf(exec), input);
        if (!existsSync(abs))
            throw new Error('去水印失败：找不到视频 ' + abs);
        const outDir = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? resolve(cwdOf(exec), args.outputDir) : dirname(abs);
        mkdirSync(outDir, { recursive: true });
        const outPath = join(outDir, basename(abs, extname(abs)) + '-无水印.mp4');
        let regions = [];
        if (Array.isArray(args.regions) && args.regions.length > 0) {
            regions = args.regions.map((r) => {
                const x = Math.max(0, Math.trunc(Number(r?.x) || 0));
                const y = Math.max(0, Math.trunc(Number(r?.y) || 0));
                const w = Math.max(1, Math.trunc(Number(r?.w) || 0));
                const h = Math.max(1, Math.trunc(Number(r?.h) || 0));
                if (w < 1 || h < 1)
                    throw new Error('去水印失败：regions 的 w/h 必须为正整数');
                return { x, y, w, h };
            });
        }
        else if (args.auto === true) {
            regions = await this.detectCandidates(abs, exec?.signal);
            if (regions.length === 0) {
                return { ok: false, method, inputPath: abs, outputPath: outPath, durationSec: 0, candidates: [], note: '自动探测未找到稳定叠加物，或画面整体静止无法判断。请提供 regions 手工指定水印区域。' };
            }
            // 候选必须确认：直接返回候选，不执行
            return { ok: false, method, inputPath: abs, outputPath: outPath, durationSec: 0, candidates: regions, note: '自动探测仅给出候选区域，需你确认后再带 regions 执行，不保证自动识别一定准。' };
        }
        else {
            throw new Error('去水印失败：请提供 regions（可靠方式）或传 auto:true 做候选探测。');
        }
        const filter = buildWatermarkFilter(method, regions);
        const durationBefore = await this.probeDuration(abs, exec?.signal);
        const { code, stderr } = await runProcess(this.ffmpegPath, ['-y', '-i', abs, '-vf', filter, '-c:a', 'copy', outPath], { signal: exec?.signal, timeoutMs: 300_000 });
        if (code !== 0)
            throw new Error('去水印失败（' + method + '）：' + stderr.slice(-400));
        const durationAfter = await this.probeDuration(outPath, exec?.signal);
        const unchanged = durationBefore !== undefined && durationAfter !== undefined && Math.abs(durationBefore - durationAfter) <= 1;
        return {
            ok: true, method, inputPath: abs, outputPath: outPath, durationSec: durationAfter ?? 0,
            note: unchanged ? '时长不变。' : '注意：输出时长与原片不一致（可能由滤镜重编码导致），请检查。delogo 为邻域插值修补，画面会有痕迹；纯遮挡用 box 最稳。',
        };
    }
    async detectCandidates(videoPath, signal) {
        // 抽 8 帧灰度原始数据，计算时间方差，找边缘稳定叠加物（仅作候选）。
        abort(signal);
        const duration = await this.probeDuration(videoPath, signal);
        if (!duration || duration <= 0)
            return [];
        const S = 8, W = 320;
        const frames = [];
        for (let i = 1; i <= S; i++) {
            const t = duration * i / (S + 1);
            const { stdout } = await runProcess(this.ffmpegPath, ['-ss', String(t), '-i', videoPath, '-frames:v', '1', '-vf', 'scale=' + W + ':-2,format=gray', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { signal, timeoutMs: 30000 });
            const buf = Buffer.from(stdout, 'binary');
            if (buf.length < W * 100)
                continue;
            frames.push(new Uint8Array(buf));
        }
        if (frames.length < 3)
            return [];
        const height = Math.min(...frames.map((f) => Math.floor(f.length / W)));
        const pixels = W * height;
        const mean = new Float32Array(pixels);
        const sq = new Float32Array(pixels);
        for (const f of frames) {
            for (let p = 0; p < pixels; p++) {
                const v = f[p];
                mean[p] += v / frames.length;
                sq[p] += v * v / frames.length;
            }
        }
        // 静态掩码 + 与整体静态背景均值的偏差
        let staticCount = 0, staticSum = 0;
        const isStatic = new Uint8Array(pixels);
        for (let p = 0; p < pixels; p++) {
            const variance = Math.max(0, sq[p] - mean[p] * mean[p]);
            if (variance < 40) {
                isStatic[p] = 1;
                staticCount++;
                staticSum += mean[p];
            }
        }
        if (staticCount === 0 || staticCount > pixels * 0.6)
            return [];
        const bgMean = staticSum / staticCount;
        const candidates = [];
        const visited = new Uint8Array(pixels);
        for (let p = 0; p < pixels; p++) {
            if (!isStatic[p] || visited[p])
                continue;
            if (Math.abs(mean[p] - bgMean) < 60)
                continue;
            // BFS 连通
            const stack = [p];
            visited[p] = 1;
            let minX = W, maxX = 0, minY = height, maxY = 0, n = 0;
            while (stack.length) {
                const q = stack.pop();
                const x = q % W, y = Math.floor(q / W);
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                n++;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || nx >= W || ny < 0 || ny >= height)
                        continue;
                    const np = ny * W + nx;
                    if (!isStatic[np] || visited[np])
                        continue;
                    if (Math.abs(mean[np] - bgMean) < 60)
                        continue;
                    visited[np] = 1;
                    stack.push(np);
                }
            }
            if (n >= 40 && n < pixels * 0.2)
                candidates.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
        }
        candidates.sort((a, b) => (b.w * b.h) - (a.w * a.h));
        return candidates.slice(0, 4).map((c) => ({ ...c, confidence: 'heuristic' }));
    }
}
let enginePromise = null;
let deckPromise = null;
async function loadCourseEngine() {
    if (enginePromise === null) {
        const url = new URL('../skills/dsh-ppt/scripts/deck-course.mjs', import.meta.url);
        enginePromise = import(url.href).then((m) => m).catch((e) => { enginePromise = null; throw e; });
    }
    return enginePromise;
}
async function loadBuildDeckAsync() {
    if (deckPromise === null) {
        const url = new URL('../skills/dsh-ppt/scripts/deck-advanced.mjs', import.meta.url);
        deckPromise = import(url.href).then((m) => m.buildDeckAsync).catch((e) => { deckPromise = null; throw e; });
    }
    return deckPromise;
}
// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------
function pad2(n) { return String(n).padStart(2, '0'); }
function sanitizeName(name) {
    const cleaned = name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
    return cleaned === '' ? '课程' : cleaned;
}
function deriveLessonTitle(fileName) {
    const base = basename(fileName, extname(fileName));
    const stripped = base.replace(/^[\s\d一二三四五六七八九十百零〇]+[\.\-_、\s：:]*[课节讲]?[\.\-_、\s：:]*/u, '').replace(/[_-]+/g, ' ').trim();
    return stripped === '' ? base : stripped;
}
function firstNumber(name) {
    const m = /\d+/.exec(name);
    return m ? Number(m[0]) : undefined;
}
function clampInt(value, fallback, min, max) {
    const n = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
    return Math.min(max, Math.max(min, n));
}
function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor((s % 3600) / 60)) + ':' + pad2(s % 60);
}
function fmtDuration(sec) {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    return m > 0 ? m + ' 分 ' + (s % 60) + ' 秒' : s + ' 秒';
}
function segmentsToSrt(segments) {
    return segments.map((s, i) => {
        return (i + 1) + '\n' + srtTime(s.start) + ' --> ' + srtTime(s.end) + '\n' + s.text + '\n';
    }).join('\n');
}
function srtTime(sec) {
    const ms = Math.max(0, Math.round(sec * 1000));
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), mm = ms % 1000;
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s) + ',' + String(mm).padStart(3, '0');
}
function parseLlmJson(raw) {
    const text = raw.trim();
    try {
        return JSON.parse(text);
    }
    catch { /* fall through */ }
    const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
    if (fence) {
        try {
            return JSON.parse(fence[1].trim());
        }
        catch { /* fall through */ }
    }
    const brace = /{[\s\S]*}/.exec(text);
    if (brace) {
        try {
            return JSON.parse(brace[0]);
        }
        catch { /* fall through */ }
    }
    return undefined;
}
function normPoints(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((c) => ({
        title: typeof c?.title === 'string' ? c.title : '',
        points: Array.isArray(c?.points) ? c.points.map(String).filter(Boolean) : [],
        start: typeof c?.start === 'number' ? c.start : undefined,
        end: typeof c?.end === 'number' ? c.end : undefined,
    })).filter((c) => c.title !== '' || c.points.length > 0);
}
function extractiveRefine(segments, note) {
    const text = segments.map((s) => s.text).join(' ');
    const sentences = text.split(/(?<=[。！？!?；;])/).map((s) => s.trim()).filter((s) => s.length > 4);
    const by = (re) => sentences.filter((s) => re.test(s)).slice(0, 8);
    const stepRe = /首先|然后|接着|最后|第一步|第二步|第三步|步骤|开始|先|再|接下来|首先/;
    const pitRe = /注意|避免|容易|错误|坑|不要|别|小心|常见问题|切记/;
    const exRe = /例如|比如|举例|案例|示例|演示|实例/;
    const core = sentences.length > 0 ? sentences.slice(0, Math.min(6, sentences.length)) : [];
    return {
        mode: 'extractive',
        coreConcepts: core.map((s, i) => ({ title: '要点 ' + (i + 1), points: [s] })),
        keySteps: by(stepRe).length ? by(stepRe).map((s, i) => ({ title: '步骤 ' + (i + 1), points: [s] })) : [],
        pitfalls: by(pitRe),
        examples: by(exRe).length ? by(exRe).map((s, i) => ({ title: '案例 ' + (i + 1), points: [s] })) : [],
        summary: [sentences[0] || '', sentences[sentences.length - 1] || ''].filter(Boolean),
        note,
    };
}
function buildWatermarkFilter(method, regions) {
    if (method === 'crop') {
        if (regions.length !== 1)
            throw new Error('crop 只支持单个区域（regions 恰好一个）');
        const r = regions[0];
        return 'crop=' + r.w + ':' + r.h + ':' + r.x + ':' + r.y;
    }
    if (method === 'box') {
        return regions.map((r) => 'drawbox=x=' + r.x + ':y=' + r.y + ':w=' + r.w + ':h=' + r.h + ':color=black:t=fill').join(',');
    }
    if (method === 'delogo') {
        return regions.map((r) => 'delogo=x=' + r.x + ':y=' + r.y + ':w=' + r.w + ':h=' + r.h).join(',');
    }
    // blur：crop + boxblur + overlay 链
    const labels = regions.map((_, i) => ['[c' + i + ']', '[b' + i + ']']);
    const parts = ['[0:v]split=' + regions.length + labels.map((l, i) => l[0]).join('')];
    regions.forEach((r, i) => { parts.push(labels[i][0] + 'crop=' + r.w + ':' + r.h + ':' + r.x + ':' + r.y + ',boxblur=10:2' + labels[i][1]); });
    let prev = '[0:v]';
    regions.forEach((r, i) => {
        const out = i === regions.length - 1 ? '[vout]' : '[o' + i + ']';
        parts.push(prev + labels[i][1] + 'overlay=' + r.x + ':' + r.y + out);
        prev = out;
    });
    return parts.join(';');
}
function renderHomeworkMarkdown(plan, materials, materialDir, language) {
    const en = language === 'en';
    const L = (zh, eng) => (en ? eng : zh);
    const lines = ['# ' + plan.title + ' · ' + L('课后作业', 'Homework'), ''];
    lines.push('## ' + L('任务', 'Tasks'));
    lines.push('');
    lines.push('1. ' + L('观看本课视频，结合课件梳理核心概念与关键步骤。', 'Watch the lesson video and summarize the core concepts and key steps using the slides.'));
    lines.push('2. ' + L('独立完成课件「练习巩固」页的题目。', 'Complete the practice questions on the practice slide on your own.'));
    lines.push('3. ' + L('把本课小结改写成自己的话，不超过 5 句。', 'Rewrite the summary in your own words (max 5 sentences).'));
    lines.push('');
    lines.push('## ' + L('要用到的素材', 'Materials'));
    lines.push('');
    if (materialDir)
        lines.push('- ' + L('作业素材目录：', 'Material directory: ') + materialDir);
    if (materials && materials.length)
        for (const m of materials)
            lines.push('  - ' + m);
    else if (!materialDir)
        lines.push('- ' + L('（本课未匹配到作业素材压缩包）', '(No material archive matched this lesson)'));
    lines.push('');
    lines.push('## ' + L('评分要点', 'Rubric'));
    lines.push('');
    lines.push('- ' + L('核心概念是否复述准确（40%）', 'Accurate restatement of core concepts (40%)'));
    lines.push('- ' + L('练习/实操是否完成并给出过程（40%）', 'Completed practice with shown steps (40%)'));
    lines.push('- ' + L('小结是否用自己的语言、并提出 1 个疑问（20%）', 'Original summary plus one question (20%)'));
    lines.push('');
    lines.push('## ' + L('提交要求', 'Submission'));
    lines.push('');
    lines.push('- ' + L('提交书面小结 + 过程截图/记录，并附 1 个你仍有的疑问。', 'Submit a written summary plus process screenshots/notes and one open question.'));
    lines.push('');
    return lines.join('\n');
}
function renderCourseIndex(scan, lessons, materials) {
    const lines = ['# ' + scan.courseName + ' · 课程索引', ''];
    lines.push('共 ' + lessons.length + ' 节课。', '');
    for (const l of lessons) {
        lines.push('## 第 ' + pad2(l.index) + ' 课：' + l.title);
        lines.push('- 时长：' + fmtDuration(l.durationSec) + ' · 来源：' + l.source);
        if (l.htmlPath)
            lines.push('- 课件：' + l.htmlPath);
        if (l.homeworkPath)
            lines.push('- 作业：' + l.homeworkPath);
        lines.push('');
    }
    if (materials.length) {
        lines.push('## 作业素材', '');
        for (const m of materials)
            lines.push('- 第 ' + pad2(m.lesson) + ' 课：' + m.dir);
        lines.push('');
    }
    return lines.join('\n');
}
function renderBuildReport(scan, lessons, materials, warnings, opts) {
    const lines = ['# ' + scan.courseName + ' · 生成报告', ''];
    lines.push('- 模式：' + opts.mode + ' · 作业：' + (opts.withHomework ? '生成' : '跳过') + ' · 素材：' + opts.useMaterials);
    lines.push('- 转写后端：' + opts.sttBackend);
    lines.push('- 视频：' + scan.videos.length + ' 个 · 压缩包：' + scan.zips.length + ' 个', '');
    lines.push('## 每课做了什么', '');
    for (const l of lessons) {
        lines.push('- 第 ' + pad2(l.index) + ' 课「' + l.title + '」：' + (l.stt === 'ok' ? '转写成功 → 提炼（' + (l.refine === 'llm' ? 'LLM' : '提取式摘要') + '）→ 生成 ' + l.slideCount + ' 页' : '无转写（' + l.stt + '），跳过课件'));
    }
    lines.push('');
    if (materials.length) {
        lines.push('## 素材', '');
        for (const m of materials)
            lines.push('- 第 ' + pad2(m.lesson) + ' 课素材：' + m.dir);
        lines.push('');
    }
    lines.push('## 跳过的步骤与原因', '');
    if (warnings.length === 0)
        lines.push('- （无跳过项）');
    else
        for (const w of warnings)
            lines.push('- ' + w);
    if (opts.voice.enabled === true)
        lines.push('- 配音：已请求（voice.enabled=true），见 _voiced/。');
    if (opts.watermark.enabled === true)
        lines.push('- 去水印：已请求（watermark.enabled=true），见 _clean/。');
    lines.push('');
    return lines.join('\n');
}
function tmpBase() {
    const base = process.env.TMPDIR || '/tmp';
    return base;
}
