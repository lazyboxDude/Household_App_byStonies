"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { DEFAULT_ROOMS } from "./constants";
import type { Room } from "./types";

// The household's rooms (Küche, Bad, ...), live. A household that has none yet gets the usual four.
export function useRooms(householdId: string | undefined) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Guards the seed-insert below against overlapping loads (e.g. React Strict Mode's double-invoked
  // effects), which would otherwise both see an empty list and each insert their own default rooms.
  const seedingRef = useRef(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    if (error) return;
    let list = (data ?? []) as Room[];
    if (list.length === 0 && !seedingRef.current) {
      seedingRef.current = true;
      const { data: seeded } = await supabase
        .from("rooms")
        .insert(DEFAULT_ROOMS.map((r) => ({ household_id: householdId, name: r.name.en, icon: r.icon })))
        .select();
      list = (seeded ?? []) as Room[];
    }
    setRooms(list);
  }, [householdId]);

  useEffect(() => {
    // Standard fetch-on-mount: sets isLoading(false) once the first load is done.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setIsLoading(false));
  }, [load]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`rooms-${householdId}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `household_id=eq.${householdId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, load]);

  const addRoom = useCallback(
    async (name: string, icon: string): Promise<Room | null> => {
      const trimmed = name.trim();
      if (!householdId || !trimmed) return null;
      const { data, error } = await supabase
        .from("rooms")
        .insert({ household_id: householdId, name: trimmed, icon })
        .select()
        .single();
      if (error || !data) return null;
      setRooms((prev) => [...prev, data as Room]);
      return data as Room;
    },
    [householdId]
  );

  // The tasks of a deleted room stay, they just belong to no room any more (set null in the database).
  const deleteRoom = useCallback(
    async (roomId: string) => {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) load();
    },
    [load]
  );

  return { rooms, isLoading, addRoom, deleteRoom };
}
