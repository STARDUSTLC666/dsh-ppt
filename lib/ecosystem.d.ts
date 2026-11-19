import type { DeckEngine, PptCitationStyle, PptCiteArgs, PptCiteResult, PptRemotionArgs, PptRemotionResult } from './types.js';
export interface NormalizedAuthor {
    given: string;
    family: string;
    name: string;
}
export interface NormalizedCitation {
    id: string;
    bibKey: string;
    doi: string;
    title: string;
    authors: NormalizedAuthor[];
    containerTitle: string;
    publisher: string;
    year: number;
    volume: string;
    issue: string;
    page: string;
    url: string;
    type: string;
}
export interface PaceSlideBudget {
    slide: number;
    slideId?: string;
    title: string;
    layout: string;
    seconds: number;
    minutes: number;
    status: 'ok' | 'over-budget' | 'under-budget';
}
export interface PaceBudgetReport {
    slideCount: number;
    estimatedSeconds: number;
    estimatedMinutes: number;
    targetMinutes: number | null;
    deltaMinutes: number;
    deltaSeconds?: number;
    overBudget: boolean;
    status?: 'on-track' | 'over-budget' | 'under-budget';
    overrunSlides: number[];
    overBudgetSlides?: number[];
    slides: PaceSlideBudget[];
}
export declare function normalizeDoi(raw: unknown): string;
export declare function parseBibtexEntries(text: string): NormalizedCitation[];
export declare function loadCitationEntriesFromFile(filePath: string): NormalizedCitation[];
export declare function discoverCitationStorePath(cwd: string): string | undefined;
export declare function formatShortSourceCitation(entry: NormalizedCitation, num: number, includeDoi?: boolean): string;
export declare function formatReferenceEntry(entry: NormalizedCitation, num: number, style?: PptCitationStyle): string;
export declare function attachCitationsToDeck(options: PptCiteArgs & {
    cwd?: string;
    signal?: AbortSignal;
    engine: DeckEngine;
}): Promise<PptCiteResult>;
export declare function computePaceBudgetFallback(manifest: any, targetMinutesOverride?: number): PaceBudgetReport;
export declare function renderOnePagerHtmlFallback(manifest: any, lang?: string): string;
export declare function buildRemotionBundleFiles(manifest: any, options?: {
    fps?: number;
    format?: 'landscape' | 'portrait' | 'square';
    themeTokens?: Record<string, string>;
    paceBudget?: PaceBudgetReport;
}): {
    files: Record<string, string>;
    storyboard: Record<string, unknown>;
    fps: number;
    totalFrames: number;
    totalSeconds: number;
};
export declare function exportRemotionBundle(options: PptRemotionArgs & {
    cwd?: string;
    signal?: AbortSignal;
    engine: DeckEngine;
}): Promise<PptRemotionResult>;
