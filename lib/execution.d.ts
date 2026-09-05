import type { ResolvedPptConfig } from './config.js';
import type { DeckEngine, PptThemesResult } from './types.js';
/** The Harness execution fields used by this plugin; optional for direct callers. */
export interface PptExecution {
    readonly signal?: AbortSignal;
    readonly agent?: {
        readonly session: {
            readonly header: {
                readonly cwd?: string;
            };
        };
    };
}
/** Build executors with a shared engine loader; resolve paths separately for each call. */
export declare function createPptExecutors(config: ResolvedPptConfig, loadEngine?: () => Promise<DeckEngine>): {
    themes(rawArgs: unknown, exec?: PptExecution): Promise<PptThemesResult>;
    create(rawArgs: unknown, exec?: PptExecution): Promise<import("./types.js").PptCreateResult>;
};
