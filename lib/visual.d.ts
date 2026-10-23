import type { DeckEngine } from './types.js';
import type { ModelRoute } from './coaching-model.js';
import type { VisualModel } from './visual-model.js';
export type VisualContext = {
    id: string;
    path: string;
    manifest: any;
    engine: DeckEngine & {
        readDeckProject(options: any): {
            manifest: any;
        };
    };
};
type Action = {
    slideId: string;
    type: string;
    value?: number;
};
type Finding = {
    slideId: string;
    kind: string;
    region: string;
    issue: string;
    box: number[];
    action?: Action;
};
export declare class PptVisual {
    readonly directory: string;
    private model?;
    private active;
    constructor(directory: string, model?: VisualModel);
    setModel(model?: VisualModel): void;
    dispose(): void;
    options(signal?: AbortSignal): Promise<{
        available: boolean;
        routes: (ModelRoute & {
            label: string;
        })[];
    }>;
    private path;
    private read;
    private locked;
    private write;
    private bound;
    private unchanged;
    private roundPath;
    private state;
    private render;
    list(context: VisualContext): {
        id: string;
        status: "ready" | "busy" | "paused" | "complete";
        revision: number;
        createdAt: string;
    }[];
    get(context: VisualContext, id: unknown): {
        stale: boolean;
        canAdopt: boolean;
        rounds: {
            deckId: string;
            revision: number;
            ids: string[];
            cursor: number;
            findings: Finding[];
            applied: Action[];
            missingFonts: string[];
            rendered: boolean;
            pptxHash: string;
        }[];
        version: 1;
        id: string;
        projectId: string;
        deckId: string;
        revision: number;
        title: string;
        language: "zh" | "en";
        route: ModelRoute;
        repairs: number;
        maxCalls: number;
        usedCalls: number;
        status: "ready" | "busy" | "paused" | "complete";
        phase: "render" | "inspect" | "repair" | "done";
        createdAt: string;
        updatedAt: string;
        reason?: string;
        error?: string;
    };
    create(context: VisualContext, body: Record<string, unknown>, signal?: AbortSignal): Promise<{
        stale: boolean;
        canAdopt: boolean;
        rounds: {
            deckId: string;
            revision: number;
            ids: string[];
            cursor: number;
            findings: Finding[];
            applied: Action[];
            missingFonts: string[];
            rendered: boolean;
            pptxHash: string;
        }[];
        version: 1;
        id: string;
        projectId: string;
        deckId: string;
        revision: number;
        title: string;
        language: "zh" | "en";
        route: ModelRoute;
        repairs: number;
        maxCalls: number;
        usedCalls: number;
        status: "ready" | "busy" | "paused" | "complete";
        phase: "render" | "inspect" | "repair" | "done";
        createdAt: string;
        updatedAt: string;
        reason?: string;
        error?: string;
    }>;
    private findings;
    step(context: VisualContext, id: unknown, body: Record<string, unknown>, signal?: AbortSignal): Promise<{
        stale: boolean;
        canAdopt: boolean;
        rounds: {
            deckId: string;
            revision: number;
            ids: string[];
            cursor: number;
            findings: Finding[];
            applied: Action[];
            missingFonts: string[];
            rendered: boolean;
            pptxHash: string;
        }[];
        version: 1;
        id: string;
        projectId: string;
        deckId: string;
        revision: number;
        title: string;
        language: "zh" | "en";
        route: ModelRoute;
        repairs: number;
        maxCalls: number;
        usedCalls: number;
        status: "ready" | "busy" | "paused" | "complete";
        phase: "render" | "inspect" | "repair" | "done";
        createdAt: string;
        updatedAt: string;
        reason?: string;
        error?: string;
    }>;
    stop(context: VisualContext, id: unknown): {
        stale: boolean;
        canAdopt: boolean;
        rounds: {
            deckId: string;
            revision: number;
            ids: string[];
            cursor: number;
            findings: Finding[];
            applied: Action[];
            missingFonts: string[];
            rendered: boolean;
            pptxHash: string;
        }[];
        version: 1;
        id: string;
        projectId: string;
        deckId: string;
        revision: number;
        title: string;
        language: "zh" | "en";
        route: ModelRoute;
        repairs: number;
        maxCalls: number;
        usedCalls: number;
        status: "ready" | "busy" | "paused" | "complete";
        phase: "render" | "inspect" | "repair" | "done";
        createdAt: string;
        updatedAt: string;
        reason?: string;
        error?: string;
    };
    page(context: VisualContext, id: unknown, roundIndex: unknown, slideId: unknown): {
        ok: boolean;
        data: string;
    };
    adoption(context: VisualContext, id: unknown): {
        path: string;
        render: import("./types.js").PptRenderResult;
    };
    remove(context: VisualContext, id: unknown): {
        removed: boolean;
    };
    markdown(context: VisualContext, id: unknown): string;
}
export {};
