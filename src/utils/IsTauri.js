export async function isRunningInTauri() {
    try {
        const { isTauri } = await import('@tauri-apps/api/core');
        return isTauri();
    } catch {
        return false; // Browser
    }
}

export const checkIsTauri = await isRunningInTauri();