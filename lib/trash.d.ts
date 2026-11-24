/**
 * Move multiple regular files or directories to the OS Recycle Bin / Trash in strict order.
 * On Windows, batches all paths into a single PowerShell process with ErrorActionPreference=Stop
 * so moving a 3-file project or clearing an archive runs ~3x faster while stopping immediately on any locked file.
 */
export declare function movePathsToTrash(targetPaths: string[], signal?: AbortSignal): Promise<{
    moved: string[];
    missing: string[];
}>;
/**
 * Move a single existing regular file or directory to the OS Recycle Bin / Trash without external dependencies.
 * Refuses relative paths, Windows UNC network paths, and symbolic links; treats already-missing paths as a no-op.
 */
export declare function movePathToTrash(targetPath: string, signal?: AbortSignal): Promise<{
    moved: boolean;
    missing?: boolean;
}>;
