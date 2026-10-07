// A plain to-do without a date. Everything that has a date or comes back is a routine
// (see routines/types.ts).
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  assignee: string | null;
  created_by: string | null;
  is_shared: boolean;
}

export interface Room {
  id: string;
  name: string;
  icon: string;
}
