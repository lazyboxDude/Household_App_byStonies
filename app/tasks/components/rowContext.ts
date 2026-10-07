import type { Occurrence } from "../routines/types";
import type { PayInput, RoutinePatch } from "../routines/useRoutines";
import type { Room } from "../types";

export interface Person {
  id: string;
  name: string;
}

// What a row can do. All of it comes from useRoutines, so every view acts the same way.
export interface RowActions {
  resolve: (occ: Occurrence, status: "done" | "skipped") => void;
  swap: (occ: Occurrence, toUserId: string) => void;
  pay: (occ: Occurrence, input: PayInput) => Promise<boolean>;
  update: (id: string, patch: RoutinePatch) => Promise<boolean>;
  remove: (id: string) => void;
}

// Everything a row needs to know about the household around it.
export interface RowContext {
  members: Person[];
  userId: string | undefined;
  rooms: Room[];
  finance: { expensesEnabled: boolean; hasVerteilertopf: boolean };
  actions: RowActions;
}
