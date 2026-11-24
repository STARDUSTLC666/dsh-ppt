/**
 * Move an existing regular file or directory to the OS Recycle Bin / Trash without external dependencies.
 * Refuses relative paths and symbolic links; treats already-missing paths as a no-op.
 */
export declare function movePathToTrash(targetPath: string, signal?: AbortSignal): Promise<{
    moved: boolean;
    missing?: boolean;
}>;
