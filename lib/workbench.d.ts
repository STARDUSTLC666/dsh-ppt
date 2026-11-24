import { type PptExecution } from './execution.js';
import type { DeckEngine } from './types.js';
import { PptCoaching } from './coaching.js';
import type { CoachingModel } from './coaching-model.js';
import { PptVisual } from './visual.js';
import type { VisualModel } from './visual-model.js';
export declare const PPT_WORKBENCH_ROUTE = "/api/dsh-ppt/workbench";
export declare const PPT_DOWNLOAD_ROUTE = "/api/dsh-ppt/download";
type WorkbenchEngine = DeckEngine & {
    readDeckProject(options: Record<string, unknown>): {
        manifest: any;
        path: string;
    };
    absorbPptx?(options: any): Promise<any>;
};
type TrashPathFn = (targetPath: string, signal?: AbortSignal) => Promise<{
    moved: boolean;
    missing?: boolean;
} | void> | void;
type Options = {
    catalogPath?: string;
    loadEngine?: () => Promise<WorkbenchEngine>;
    coachingModel?: CoachingModel;
    visualModel?: VisualModel;
    trashPath?: TrashPathFn;
};
export declare class PptWorkbench {
    readonly catalogPath: string;
    readonly coaching: PptCoaching;
    readonly visual: PptVisual;
    private readonly loadEngine;
    private readonly customTrashPath?;
    private readonly renders;
    constructor(options?: Options);
    private collectProjectArtifacts;
    private trashTargets;
    private catalog;
    private recentProjects;
    /** Recording a completed tool never turns a successful generation into an error. */
    remember(result: any, args: unknown, exec?: PptExecution): Promise<void>;
    private appendCatalog;
    private project;
    private view;
    private revision;
    private themeId;
    private brandPatch;
    private itemsPatch;
    private patch;
    private pptxBytes;
    private officeBytes;
    private flagshipDemoSlides;
    action(body: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>;
    fetchDownload(request: Request): Promise<Response>;
    fetch(request: Request): Promise<Response>;
}
export declare function installPptWorkbench(ctx: any, workbench: PptWorkbench): void;
export {};
