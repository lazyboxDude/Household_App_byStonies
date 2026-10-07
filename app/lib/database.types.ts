// Generated from the Supabase project schema (project ref: ohrupayieofhfsgxomud).
// Regenerate with the Supabase CLI or MCP `generate_typescript_types` after
// any migration — do not hand-edit.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          amount: number
          category: string
          created_at: string
          household_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          household_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          household_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          date: string
          household_id: string
          id: string
          location: string | null
          photo_url: string | null
          source_cleaning_task_id: string | null
          source_occurrence_id: string | null
          time: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          date: string
          household_id: string
          id?: string
          location?: string | null
          photo_url?: string | null
          source_cleaning_task_id?: string | null
          source_occurrence_id?: string | null
          time?: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          date?: string
          household_id?: string
          id?: string
          location?: string | null
          photo_url?: string | null
          source_cleaning_task_id?: string | null
          source_occurrence_id?: string | null
          time?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_source_cleaning_task_id_fkey"
            columns: ["source_cleaning_task_id"]
            isOneToOne: false
            referencedRelation: "cleaning_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_source_occurrence_id_fkey"
            columns: ["source_occurrence_id"]
            isOneToOne: true
            referencedRelation: "routine_occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_tasks: {
        Row: {
          assignee: string | null
          created_at: string
          household_id: string
          id: string
          last_done: string | null
          migrated_routine_id: string | null
          next_due: string
          recurrence: string
          room_id: string
          supplies: string[]
          title: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          household_id: string
          id?: string
          last_done?: string | null
          migrated_routine_id?: string | null
          next_due?: string
          recurrence: string
          room_id: string
          supplies?: string[]
          title: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          household_id?: string
          id?: string
          last_done?: string | null
          migrated_routine_id?: string | null
          next_due?: string
          recurrence?: string
          room_id?: string
          supplies?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_tasks_migrated_routine_id_fkey"
            columns: ["migrated_routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          created_at: string
          household_id: string
          id: string
          monthly_payment: number
          name: string
          owner_user_id: string | null
          remaining: number
          total: number
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          monthly_payment?: number
          name: string
          owner_user_id?: string | null
          remaining?: number
          total?: number
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          monthly_payment?: number
          name?: string
          owner_user_id?: string | null
          remaining?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "debts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          household_id: string
          id: string
          note: string | null
          title: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          date?: string
          household_id: string
          id?: string
          note?: string | null
          title: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          household_id?: string
          id?: string
          note?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          calendar_feed_token: string
          created_at: string
          created_by: string
          enabled_features: string[]
          id: string
          invite_code: string
          name: string
          ownership_mode: string
        }
        Insert: {
          calendar_feed_token?: string
          created_at?: string
          created_by: string
          enabled_features?: string[]
          id?: string
          invite_code: string
          name: string
          ownership_mode?: string
        }
        Update: {
          calendar_feed_token?: string
          created_at?: string
          created_by?: string
          enabled_features?: string[]
          id?: string
          invite_code?: string
          name?: string
          ownership_mode?: string
        }
        Relationships: []
      }
      member_stats: {
        Row: {
          current_xp: number
          household_id: string
          level: number
          total_tasks_completed: number
          total_xp_earned: number
          user_id: string
          xp_to_next_level: number
        }
        Insert: {
          current_xp?: number
          household_id: string
          level?: number
          total_tasks_completed?: number
          total_xp_earned?: number
          user_id: string
          xp_to_next_level?: number
        }
        Update: {
          current_xp?: number
          household_id?: string
          level?: number
          total_tasks_completed?: number
          total_xp_earned?: number
          user_id?: string
          xp_to_next_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_stats_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_stats_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      money_onboarding: {
        Row: {
          completed: boolean
          fixed_costs: Json
          goals: string[]
          household_id: string
          income: Json
          income_variable: boolean
          mood: string | null
          step: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          fixed_costs?: Json
          goals?: string[]
          household_id: string
          income?: Json
          income_variable?: boolean
          mood?: string | null
          step?: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          fixed_costs?: Json
          goals?: string[]
          household_id?: string
          income?: Json
          income_variable?: boolean
          mood?: string | null
          step?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_onboarding_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pots: {
        Row: {
          created_at: string
          household_id: string
          id: string
          name: string
          owner_user_id: string | null
          saved: number
          target: number
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          name: string
          owner_user_id?: string | null
          saved?: number
          target?: number
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          saved?: number
          target?: number
        }
        Relationships: [
          {
            foreignKeyName: "pots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          household_id: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          household_id: string
          icon?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          household_id?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_absences: {
        Row: {
          created_at: string
          from_date: string
          household_id: string
          id: string
          to_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_date: string
          household_id: string
          id?: string
          to_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_date?: string
          household_id?: string
          id?: string
          to_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_absences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_occurrences: {
        Row: {
          amount: number | null
          assigned_to: string | null
          created_at: string
          done_at: string | null
          done_by: string | null
          expense_id: string | null
          due_date: string
          household_id: string
          id: string
          locked: boolean
          notified_at: string | null
          routine_id: string
          split: Json | null
          status: string
          vt_tx_id: string | null
        }
        Insert: {
          amount?: number | null
          assigned_to?: string | null
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          due_date: string
          expense_id?: string | null
          household_id: string
          id?: string
          locked?: boolean
          notified_at?: string | null
          routine_id: string
          split?: Json | null
          status?: string
          vt_tx_id?: string | null
        }
        Update: {
          amount?: number | null
          assigned_to?: string | null
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          due_date?: string
          expense_id?: string | null
          household_id?: string
          id?: string
          locked?: boolean
          notified_at?: string | null
          routine_id?: string
          split?: Json | null
          status?: string
          vt_tx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_occurrences_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_occurrences_vt_tx_id_fkey"
            columns: ["vt_tx_id"]
            isOneToOne: false
            referencedRelation: "verteilertopf_tx"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_occurrences_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_occurrences_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_occurrences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_occurrences_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_settings: {
        Row: {
          fairness_weights: Json | null
          household_id: string
          living_mode: string | null
          updated_at: string
        }
        Insert: {
          fairness_weights?: Json | null
          household_id: string
          living_mode?: string | null
          updated_at?: string
        }
        Update: {
          fairness_weights?: Json | null
          household_id?: string
          living_mode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_settings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_settlements: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          from_user: string
          household_id: string
          id: string
          to_user: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          from_user: string
          household_id: string
          id?: string
          to_user: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          from_user?: string
          household_id?: string
          id?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_settlements_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_settlements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_settlements_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          active_months: number[] | null
          amount: number | null
          amount_kind: string | null
          assignee_id: string | null
          assignment: string
          created_at: string
          created_by: string | null
          effort: number
          expense_category: string | null
          household_id: string
          icon: string
          id: string
          kind: string
          lead_days: number
          mode: string
          payer_id: string | null
          room_id: string | null
          rotation: string[] | null
          schedule: Json
          show_in_calendar: boolean
          split: Json | null
          supplies: string[]
          title: string
        }
        Insert: {
          active_months?: number[] | null
          amount?: number | null
          amount_kind?: string | null
          assignee_id?: string | null
          assignment?: string
          created_at?: string
          created_by?: string | null
          effort?: number
          expense_category?: string | null
          household_id: string
          icon?: string
          id?: string
          kind: string
          lead_days?: number
          mode?: string
          payer_id?: string | null
          room_id?: string | null
          rotation?: string[] | null
          schedule: Json
          show_in_calendar?: boolean
          split?: Json | null
          supplies?: string[]
          title: string
        }
        Update: {
          active_months?: number[] | null
          amount?: number | null
          amount_kind?: string | null
          assignee_id?: string | null
          assignment?: string
          created_at?: string
          created_by?: string | null
          effort?: number
          expense_category?: string | null
          household_id?: string
          icon?: string
          id?: string
          kind?: string
          lead_days?: number
          mode?: string
          payer_id?: string | null
          room_id?: string | null
          rotation?: string[] | null
          schedule?: Json
          show_in_calendar?: boolean
          split?: Json | null
          supplies?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          completed: boolean
          created_at: string
          household_id: string
          id: string
          price: number | null
          store: string | null
          text: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          household_id: string
          id?: string
          price?: number | null
          store?: string | null
          text: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          household_id?: string
          id?: string
          price?: number | null
          store?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          household_id: string
          id: string
          name: string
        }
        Insert: {
          household_id: string
          id?: string
          name: string
        }
        Update: {
          household_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          completed: boolean
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          is_shared: boolean
          points: number
          title: string
        }
        Insert: {
          assignee?: string | null
          completed?: boolean
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          is_shared?: boolean
          points?: number
          title: string
        }
        Update: {
          assignee?: string | null
          completed?: boolean
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          is_shared?: boolean
          points?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      verteilertopf_bills: {
        Row: {
          amount: number
          created_at: string
          household_id: string
          id: string
          months: number[]
          name: string
        }
        Insert: {
          amount: number
          created_at?: string
          household_id: string
          id?: string
          months?: number[]
          name: string
        }
        Update: {
          amount?: number
          created_at?: string
          household_id?: string
          id?: string
          months?: number[]
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "verteilertopf_bills_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      verteilertopf_config: {
        Row: {
          bills: number
          household_id: string
          joint: number
          min_buffer: number
          onboarding_completed: boolean
          opening_bills: number
          opening_joint: number
          opening_main: number
          opening_taxes: number
          taxes: number
          updated_at: string
        }
        Insert: {
          bills?: number
          household_id: string
          joint?: number
          min_buffer?: number
          onboarding_completed?: boolean
          opening_bills?: number
          opening_joint?: number
          opening_main?: number
          opening_taxes?: number
          taxes?: number
          updated_at?: string
        }
        Update: {
          bills?: number
          household_id?: string
          joint?: number
          min_buffer?: number
          onboarding_completed?: boolean
          opening_bills?: number
          opening_joint?: number
          opening_main?: number
          opening_taxes?: number
          taxes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verteilertopf_config_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      verteilertopf_tx: {
        Row: {
          account: string
          amount: number
          created_at: string
          date: string
          description: string
          household_id: string
          id: string
          kind: string
          tx_group: string | null
        }
        Insert: {
          account: string
          amount: number
          created_at?: string
          date: string
          description?: string
          household_id: string
          id?: string
          kind: string
          tx_group?: string | null
        }
        Update: {
          account?: string
          amount?: number
          created_at?: string
          date?: string
          description?: string
          household_id?: string
          id?: string
          kind?: string
          tx_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verteilertopf_tx_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_calendar_feed: { Args: { p_token: string }; Returns: Json }
      rotate_calendar_feed_token: {
        Args: { p_household_id: string }
        Returns: string
      }
      create_household: {
        Args: { p_name: string; p_ownership_mode?: string }
        Returns: {
          created_at: string
          created_by: string
          enabled_features: string[]
          id: string
          invite_code: string
          name: string
          ownership_mode: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      household_ownership_mode: {
        Args: { p_household_id: string }
        Returns: string
      }
      is_household_member: {
        Args: { p_household_id: string }
        Returns: boolean
      }
      is_household_owner: { Args: { p_household_id: string }; Returns: boolean }
      join_household: {
        Args: { p_invite_code: string }
        Returns: {
          created_at: string
          created_by: string
          enabled_features: string[]
          id: string
          invite_code: string
          name: string
          ownership_mode: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      shares_household_with: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
