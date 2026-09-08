# Feature Research: Homsy, Sweepy, Bring!

Analysis of three household apps to inform our roadmap. Findings feed the TODO list
below so we know what's next after the current work (Cleaning Plan in Tasks).

## Homsy (household/family organizer)
- Chores scheduled daily/weekly/monthly, auto-rotating between household members.
- Tasks assigned to a specific person, who gets notified and sees it on their own list.
- Completion streaks per person to keep contribution visible and fair.
- One app covering chores + grocery list + meal planner + shared calendar + expense tracker.
- Works offline, syncs when back online; each family member has their own login.

## Sweepy (cleaning schedule)
- Setup flow: add each **room** in the house, then add **tasks** per room, each with its
  own **frequency** and a starting "cleanliness state".
- Room-level cleanliness indicator (not just a flat task list) — you see which rooms are
  neglected at a glance.
- Auto-generates a **daily schedule** per person from all room tasks combined.
- Prioritizes tasks that are most overdue / most urgent.
- Gamification: coins for completed tasks, spendable on a virtual home; group leaderboard.

## Bring! (shopping list)
- Real-time shared list sync + push notifications when someone checks off / adds an item.
- Automatic categorization of items into aisles, with user-customizable categories.
- Recipe "templates" that add a whole ingredient list to the shopping list in one tap.
- Voice control via Siri/Alexa.
- Loyalty cards stored in-app; light/dark mode and tile/list view toggle.

## What we're taking from each

| Idea | Source | Where it lands in our app |
|---|---|---|
| Rooms → tasks → frequency setup flow | Sweepy | Tasks: Cleaning Plan (**being built now**) |
| Cleaning supplies attached to a task | (extension of Sweepy's room model) | Tasks: Cleaning Plan (**being built now**) |
| Recurrence + auto-generated due dates | Homsy + Sweepy | Tasks: Cleaning Plan (**being built now**) |
| Cleaning task → calendar entry | (our own synthesis) | Tasks ↔ Calendar link (**being built now**) |
| Per-room cleanliness/urgency indicator | Sweepy | Backlog |
| Task rotation between household members | Homsy | Backlog |
| Completion streaks per person | Homsy + Sweepy | Backlog |
| Recipe templates → shopping list | Bring! | Backlog |
| Auto-categorized shopping items (custom aisles) | Bring! | Backlog |
| Push notifications on shared-list changes | Bring! | Backlog (needs real backend, not just localStorage) |
| Coins/virtual reward shop | Sweepy | Backlog, optional |

## TODO — roadmap for later sessions

### Now
- [ ] Tasks page: general household tasks (one-off + daily), e.g. "buy a toolbox",
      "set up smart home" — keep the existing gamified list.
- [ ] Tasks page: **Cleaning Plan** sub-feature
  - [ ] Define rooms
  - [ ] Add tasks per room
  - [ ] Attach cleaning supplies to a task
  - [ ] Set recurrence per task (daily/weekly/biweekly/monthly/once)
  - [ ] Link cleaning tasks to the Calendar (auto-create/update the next due date as an event)

### Next
- [ ] Per-room cleanliness indicator (clean → needs attention → overdue) on a room overview.
- [ ] Task rotation: assign a recurring task to rotate automatically between household members.
- [ ] Completion streaks per person + simple leaderboard (a real one, not the current mock data).
- [ ] Persist Tasks/Cleaning Plan/Rooms in Appwrite (`app/lib/appwrite.ts` is already wired for
      auth; add a Databases collection so data isn't stuck in `localStorage` per device).

### Later / nice-to-have
- [ ] Shopping: recipe "templates" that add all ingredients at once.
- [ ] Shopping: user-customizable categories/aisles instead of the fixed list in
      `app/shopping/constants.ts`.
- [ ] Shopping: loyalty card wallet.
- [ ] Push notifications for shared-list and shared-task changes (needs a backend, not just
      client-side localStorage).
- [ ] Optional coins/virtual-reward layer on top of the existing XP/level system.
- [ ] General UI pass: the current look was flagged as needing improvement — revisit once the
      Cleaning Plan data model above is in place, so the redesign has real content to design for.

## Data model sketch (Cleaning Plan)

```ts
type Recurrence = "daily" | "weekly" | "biweekly" | "monthly" | "once";

interface Room {
  id: string;
  name: string;
  icon: string; // lucide icon key
}

interface CleaningTask {
  id: string;
  roomId: string;
  title: string;
  supplies: string[];   // e.g. ["All-purpose cleaner", "Microfiber cloth"]
  recurrence: Recurrence;
  assignee?: string;
  lastDone?: string;    // ISO date
  nextDue: string;      // ISO date, derived from lastDone + recurrence
}
```

Each `CleaningTask`'s `nextDue` is mirrored into the shared `calendar_events` localStorage
key (id `cleaning-<taskId>`) so it shows up on the Calendar page automatically, and is
recomputed/moved forward whenever the task is marked done.
