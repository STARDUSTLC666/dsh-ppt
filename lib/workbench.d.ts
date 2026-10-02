import { type PptExecution } from './execution.js';
import type { DeckEngine } from './types.js';
export declare const PPT_WORKBENCH_ROUTE = "/api/dsh-ppt/workbench";
export declare const PPT_DOWNLOAD_ROUTE = "/api/dsh-ppt/download";
type WorkbenchEngine = DeckEngine & {
    readDeckProject(options: Record<string, unknown>): {
        manifest: any;
        path: string;
    };
};
type Options = {
    catalogPath?: string;
    loadEngine?: () => Promise<WorkbenchEngine>;
};
export declare class PptWorkbench {
    readonly catalogPath: string;
    private readonly loadEngine;
    private readonly renders;
    constructor(options?: Options);
    private catalog;
    /** Recording a completed tool never turns a successful generation into an error. */
    remember(result: any, args: unknown, exec?: PptExecution): Promise<void>;
    private project;
    private view;
    private revision;
    private patch;
    action(body: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>;
    fetchDownload(request: Request): Promise<Response>;
    fetch(request: Request): Promise<Response>;
}
export declare function installPptWorkbench(ctx: any, workbench: PptWorkbench): void;
export {};
