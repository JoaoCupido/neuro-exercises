export async function isRunningInTauri() {
    try {
        const { isTauri } = await import('@tauri-apps/api/core');
        return isTauri();
    } catch {
        return false; // Browser
    }
}

export async function getPlatform() {
    try {
        const { platform } = await import('@tauri-apps/plugin-os');
        return platform();
    } catch {
        return false; // Browser
    }
}

export const checkIsTauri = await isRunningInTauri();