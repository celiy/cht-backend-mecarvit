import type { WsHub } from "./createWsHub.js";

let hub: WsHub | null = null;

export function setRealtimeHub(next: WsHub | null): void {
    hub = next;
}

export function getRealtimeHub(): WsHub | null {
    return hub;
}

export function publishRealtime(topic: string, payload: unknown): number {
    return hub?.publish(topic, payload) ?? 0;
}
