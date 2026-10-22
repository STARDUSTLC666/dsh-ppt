/** Bounded, tool-free calls through the official DSH llm service. */
export interface ModelRoute {
    provider: string;
    model: string;
}
export interface CoachingModel {
    routes(signal?: AbortSignal): Promise<Array<ModelRoute & {
        label: string;
    }>>;
    generate(route: ModelRoute, system: string, input: string, signal: AbortSignal): Promise<string>;
}
export declare function nativeCoachingModel(llm: any): CoachingModel;
