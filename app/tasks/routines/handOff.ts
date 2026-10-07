// "Abgeben": who a task can be handed to, and how many taps it takes. Pure, so it is testable.
//
// With two people there is only one answer, so it is a single tap (and the undo bar takes it back).
// With more people the person picks. A task that sits with someone else can be taken over in one tap.

export type HandOff =
  | { kind: "none" }
  | { kind: "direct"; toId: string; takeOver: boolean }
  | { kind: "choose"; optionIds: string[] };

export function handOffFor(assignedTo: string | null, userId: string | undefined, memberIds: string[]): HandOff {
  if (!userId || memberIds.length < 2 || !memberIds.includes(userId)) return { kind: "none" };
  if (assignedTo && assignedTo !== userId) return { kind: "direct", toId: userId, takeOver: true };
  const others = memberIds.filter((id) => id !== userId);
  if (others.length === 1) return { kind: "direct", toId: others[0], takeOver: false };
  return { kind: "choose", optionIds: others };
}
