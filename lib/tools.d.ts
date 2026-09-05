import type { ResolvedPptConfig } from './config.js';
import { type PptExecution } from './execution.js';
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    output: {
        schema: Record<string, unknown>;
        render: (args: unknown, value: unknown) => Array<{
            type: 'text';
            text: string;
        }>;
    };
    execute: (rawArgs: unknown, exec?: PptExecution) => Promise<unknown>;
}
/** Assemble presentation schemas, rendering and the session-aware executors. */
export declare function buildPptTools(config: ResolvedPptConfig): ToolDefinition[];
