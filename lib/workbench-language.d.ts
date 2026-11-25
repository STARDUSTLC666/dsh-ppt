export declare function splitBilingualMessage(message: string): {
    zh: string;
    en: string;
} | null;
export declare function englishWorkbenchMessage(message: string): string;
export declare function bilingualQuality<T extends {
    issues?: any[];
}>(report: T): T;
