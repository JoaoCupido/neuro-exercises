import { invoke } from '@tauri-apps/api/core';

let portCache = null;

export async function getTauriPort() {
    if (typeof window === "undefined") {
        return null; // SSR safe
    }

    if (portCache !== null) {
        return portCache;
    }

    try {
        //const port = await window.__TAURI__.core.invoke('get_port');
        portCache = await invoke('get_port');
        return portCache;
    } catch (error) {
        console.error('Failed to get Tauri port:', error);
        return 9527;
    }
}
