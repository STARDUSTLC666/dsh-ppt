import type { ResolvedPptConfig } from './config.js';
import type { DeckEngine, PptAbsorbResult, PptCiteResult, PptCreateResult, PptRemotionResult, PptThemesResult } from './types.js';
/** The Harness execution fields used by this plugin; optional for direct callers. */
export interface PptExecution {
    readonly signal?: AbortSignal;
    readonly agent?: {
        readonly session: {
            readonly header: {
                readonly cwd?: string;
            };
            requestContext?(): any;
            requestHeader?(): any;
        };
    };
}
export declare function getEngine(): Promise<DeckEngine>;
/** Build executors with a shared engine loader; resolve paths separately for each call. */
export declare function createPptExecutors(config: ResolvedPptConfig, loadEngine?: () => Promise<DeckEngine>): {
    themes(rawArgs: unknown, exec?: PptExecution): Promise<PptThemesResult>;
    create(rawArgs: unknown, exec?: PptExecution): Promise<PptCreateResult>;
    absorb(rawArgs: unknown, exec?: PptExecution): Promise<PptAbsorbResult>;
    templates(rawArgs: unknown, exec?: PptExecution): Promise<{
        fewShotSlides?: any[] | undefined;
        researchPlan: Record<string, unknown>;
        planMarkdown: string;
        artDirector?: Record<string, unknown> | undefined;
        directorPrompt?: unknown;
        exemplars?: import("./types.js").PptExemplarSummary[] | undefined;
        ok: boolean;
        templates: unknown[];
    } | {
        promptGuide: string;
        fewShotSlides?: Record<string, unknown>[] | undefined;
        exemplar: import("./types.js").PptExemplarSummary;
        artDirector?: Record<string, unknown> | undefined;
        directorPrompt?: unknown;
        exemplars?: import("./types.js").PptExemplarSummary[] | undefined;
        ok: boolean;
        templates: unknown[];
    } | {
        artDirector?: Record<string, unknown> | undefined;
        directorPrompt?: unknown;
        exemplars?: import("./types.js").PptExemplarSummary[] | undefined;
        ok: boolean;
        templates: unknown[];
    }>;
    edit(rawArgs: unknown, exec?: PptExecution): Promise<PptCreateResult>;
    undo(rawArgs: unknown, exec?: PptExecution): Promise<PptCreateResult>;
    check(rawArgs: unknown, exec?: PptExecution): Promise<import("./types.js").PptQualityResult | import("./types.js").PptCheckResult>;
    render(rawArgs: unknown, exec?: PptExecution): Promise<import("./types.js").PptRenderResult>;
    data(rawArgs: unknown, exec?: PptExecution): Promise<PptCreateResult | Record<string, any>>;
    importPptx(rawArgs: unknown, exec?: PptExecution): Promise<PptCreateResult>;
    fromOffice(rawArgs: unknown, exec?: PptExecution): Promise<PptCreateResult>;
    cite(rawArgs: unknown, exec?: PptExecution): Promise<PptCiteResult & {
        jsonPath?: string;
    }>;
    remotion(rawArgs: unknown, exec?: PptExecution): Promise<PptRemotionResult>;
};
