"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False while rendering on the server, true in the browser. Anything that needs `document`
// (a portal, for instance) waits for it, without an effect that sets state.
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
