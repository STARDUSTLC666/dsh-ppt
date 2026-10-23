/** Native image calls use durable DSH attachments and the exact prepared route. */
import type { ModelRoute } from './coaching-model.js';
export interface VisualImage {
    data: Uint8Array;
    name: string;
}
export interface VisualModel {
    routes(signal?: AbortSignal): Promise<Array<ModelRoute & {
        label: string;
    }>>;
    inspect(route: ModelRoute, system: string, input: string, images: VisualImage[], signal: AbortSignal): Promise<string>;
}
export declare function nativeVisualModel(llm: any, attachments: any): VisualModel;
