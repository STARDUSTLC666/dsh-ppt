import type { PptExecution } from './execution.js';
export interface CourseTranscriptSegment {
    start: number;
    end: number;
    text: string;
}
export interface CourseScanFile {
    name: string;
    path: string;
    ext: string;
    durationSec?: number;
    lesson?: number;
    lessonTitle?: string;
}
export interface CourseScanResult {
    ok: boolean;
    folder: string;
    courseName: string;
    videos: CourseScanFile[];
    zips: Array<CourseScanFile & {
        matchedLesson?: number;
        matchReason?: string;
    }>;
    docs: CourseScanFile[];
    images: CourseScanFile[];
    suggestedLessons: number;
    suggestion: string;
}
export interface CoursePoint {
    title: string;
    points: string[];
    start?: number;
    end?: number;
}
export interface CourseRefined {
    mode: 'llm' | 'extractive';
    coreConcepts: CoursePoint[];
    keySteps: CoursePoint[];
    pitfalls: string[];
    examples: CoursePoint[];
    summary: string[];
    note?: string;
}
export interface CourseLessonResult {
    index: number;
    title: string;
    dir: string;
    source: string;
    durationSec: number;
    slideCount: number;
    htmlPath: string;
    pptxPath: string;
    jsonPath: string;
    lessonPlanPath?: string;
    homeworkPath?: string;
    transcriptPath?: string;
    srtPath?: string;
    stt: 'ok' | 'missing' | 'empty' | 'failed';
    refine: 'llm' | 'extractive' | 'none';
}
export interface CourseBuildResult {
    ok: boolean;
    courseName: string;
    outputDir: string;
    mode: string;
    lessons: CourseLessonResult[];
    overview: {
        htmlPath: string;
        pptxPath: string;
        jsonPath: string;
        slideCount: number;
    };
    courseIndexPath: string;
    reportPath: string;
    materials: Array<{
        lesson: number;
        dir: string;
    }>;
    voiced: string[];
    cleaned: string[];
    warnings: string[];
}
export interface CourseVoiceResult {
    ok: boolean;
    running: boolean;
    message: string;
    srtPath?: string;
    audioPath?: string;
}
export interface CourseCleanResult {
    ok: boolean;
    method: string;
    inputPath: string;
    outputPath: string;
    durationSec: number;
    candidates?: Array<{
        x: number;
        y: number;
        w: number;
        h: number;
    }>;
    note: string;
}
export interface CourseLlm {
    complete(system: string, input: string, signal: AbortSignal): Promise<string>;
}
export interface CourseTranscriber {
    (audioPath: string, signal: AbortSignal): Promise<CourseTranscriptSegment[]>;
}
export interface CourseServiceOptions {
    llm?: CourseLlm;
    speechToText?: unknown;
    transcribe?: CourseTranscriber;
    ffmpegPath?: string;
    ffprobePath?: string;
    home?: string;
    outputDir?: string;
    maxSlides?: number;
}
export declare function nativeCourseLlm(llm: any): CourseLlm;
export declare class CourseService {
    private llm?;
    private speechToText?;
    private transcribeOverride?;
    readonly ffmpegPath: string;
    readonly ffprobePath: string;
    readonly home: string;
    readonly outputDir: string;
    readonly maxSlides: number;
    constructor(options?: CourseServiceOptions);
    /** 由 index.ts 在注入 ['llm', 'speechToText'] 后调用。 */
    setHost(host: {
        llm?: any;
        speechToText?: any;
    }): void;
    scan(rawArgs: unknown, exec?: PptExecution): Promise<CourseScanResult>;
    private probeDuration;
    private resolveTranscriber;
    private extractAudio;
    private transcribeToSegments;
    private splitLessons;
    private refine;
    private buildLesson;
    build(rawArgs: unknown, exec?: PptExecution): Promise<CourseBuildResult>;
    private buildOverview;
    private describeStt;
    private safeUnzip;
    voice(rawArgs: unknown, exec?: PptExecution): Promise<CourseVoiceResult>;
    clean(rawArgs: unknown, exec?: PptExecution): Promise<CourseCleanResult>;
    private detectCandidates;
}
