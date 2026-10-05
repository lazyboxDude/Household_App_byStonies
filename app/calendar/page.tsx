"use client";
import Tesseract from 'tesseract.js';
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, X, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';
import FeatureOnboarding from '../components/FeatureOnboarding';
import { showToast } from '../../lib/toast';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  type: 'task' | 'shopping' | 'event';
  location?: string;
  photo?: string; // base64 data URL or a real URL
  // Set for events mirrored from a cleaning task (see app/tasks/calendarSync.ts).
  // They are managed from the Tasks page, so they are read-only here.
  sourceCleaningTaskId?: string;
}

// A bare "yyyy-MM-dd" parses as UTC midnight in JS, which can shift a day
// backwards in timezones behind UTC — force local-midnight parsing instead.
function parseDateOnly(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

function toCalendarEvent(ev: Tables<'calendar_events'>): CalendarEvent {
  return {
    id: ev.id,
    title: ev.title,
    date: parseDateOnly(ev.date),
    // A Postgres `time` column can come back as "HH:mm:ss"; the UI only uses "HH:mm".
    time: ev.time.slice(0, 5),
    type: ev.type as CalendarEvent['type'],
    location: ev.location ?? undefined,
    photo: ev.photo_url ?? undefined,
    sourceCleaningTaskId: ev.source_cleaning_task_id ?? undefined,
  };
}

const byTime = (a: CalendarEvent, b: CalendarEvent) => a.time.localeCompare(b.time);

export default function CalendarPage() {
  const { household } = useAuth();
  const householdId = household?.id;
  const isEnabled = household?.enabledFeatures.includes("calendar") ?? false;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [newEventTime, setNewEventTime] = useState('12:00');
  const [isSaving, setIsSaving] = useState(false);
  const [newEventType, setNewEventType] = useState<'task' | 'shopping' | 'event'>('event');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventPhoto, setNewEventPhoto] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!householdId) return;
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('household_id', householdId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    if (error) {
      showToast('Could not load events', 'error');
    } else {
      setEvents((data ?? []).map(toCalendarEvent));
    }
    setIsLoading(false);
  }, [householdId]);

  useEffect(() => {
    // Standard fetch-on-mount: loadEvents sets isLoading(false) once done.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`calendar-${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `household_id=eq.${householdId}` },
        loadEvents
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadEvents]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  // Weeks start on Monday (matches the household's locale, not date-fns' Sunday default).
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const openModal = (event?: CalendarEvent) => {
    if (event) {
      setEditingEvent(event);
      setNewEventTitle(event.title);
      setNewEventTime(event.time);
      setNewEventType(event.type);
      setNewEventLocation(event.location || '');
      setNewEventDate(format(event.date, 'yyyy-MM-dd'));
      setNewEventPhoto(event.photo || null);
    } else {
      setEditingEvent(null);
      setNewEventTitle('');
      setNewEventTime('12:00');
      setNewEventType('event');
      setNewEventLocation('');
      setNewEventDate(format(selectedDate, 'yyyy-MM-dd'));
      setNewEventPhoto(null);
    }
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate || !householdId || isSaving) return;

    const row = {
      title: newEventTitle.trim(),
      time: newEventTime,
      type: newEventType,
      date: newEventDate,
      location: newEventLocation.trim() || null,
      photo_url: newEventPhoto || null,
    };

    setIsSaving(true);
    const { data, error } = editingEvent
      ? await supabase.from('calendar_events').update(row).eq('id', editingEvent.id).select().single()
      : await supabase.from('calendar_events').insert({ household_id: householdId, ...row }).select().single();
    setIsSaving(false);

    // Keep the modal open on failure so the input isn't lost.
    if (error || !data) {
      showToast('Could not save event. Please try again.', 'error');
      return;
    }

    const saved = toCalendarEvent(data);
    setEvents((prev) =>
      editingEvent ? prev.map((ev) => (ev.id === saved.id ? saved : ev)) : [...prev, saved]
    );
    // Jump to the saved day so a changed date doesn't make the event "disappear".
    setSelectedDate(saved.date);
    setCurrentDate(saved.date);
    setIsModalOpen(false);
    setNewEventPhoto(null);
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    const { error } = await supabase.from('calendar_events').delete().eq('id', editingEvent.id);
    if (error) {
      showToast('Could not delete event. Please try again.', 'error');
      return;
    }
    setEvents((prev) => prev.filter((ev) => ev.id !== editingEvent.id));
    setIsModalOpen(false);
  };

  const isReadOnlyEvent = !!editingEvent?.sourceCleaningTaskId;

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date)).sort(byTime);
  };

  if (!householdId) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <h1 className="text-display flex items-center gap-2 mb-8 animate-rise">
          <CalendarIcon className="w-8 h-8 text-orange-600" />
          Calendar
        </h1>
        <div className="surface p-8 text-center animate-rise">
          <p className="text-body text-[var(--text-secondary)] mb-4">
            Join or create a household to share a calendar.
          </p>
          <Link href="/login" className="btn btn-primary inline-flex">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <FeatureOnboarding
        feature="calendar"
        icon={CalendarIcon}
        title="Calendar"
        description="A shared household calendar for events and cleaning tasks."
        bullets={[
          "Everyone in the household sees the same events, live",
          "Cleaning-plan tasks can sync their due dates here automatically",
          "Snap a photo of a flyer or ticket and attach it to an event",
        ]}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-rise">
        <div>
          <h1 className="text-display flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-orange-600" />
            Calendar
          </h1>
          <p className="text-body text-[var(--text-secondary)] mt-1">Manage your household schedule</p>
        </div>

        <div className="flex items-center gap-4 surface p-1">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="press p-2 hover:bg-[var(--surface-2)] rounded-[var(--radius-sm)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-headline min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="press p-2 hover:bg-[var(--surface-2)] rounded-[var(--radius-sm)] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="press px-3 py-2 text-sm font-medium rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors"
            style={{ color: "var(--accent)" }}
          >
            Today
          </button>
        </div>

        <button
          onClick={() => openModal()}
          className="btn btn-primary px-6 py-3 shadow-lg"
          style={{ boxShadow: "0 8px 20px -8px var(--accent-ring)" }}
        >
          <Plus className="w-5 h-5" />
          Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-rise">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 surface overflow-hidden">
          <div className="grid grid-cols-7 border-b divider" style={{ background: "var(--surface-2)" }}>
            {weekDays.map(day => (
              <div key={day} className="py-4 text-center text-micro">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr">
            {days.map((day, dayIdx) => {
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const dayEvents = getEventsForDay(day);

              return (
                <div
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    min-h-[120px] p-3 border-b border-r relative cursor-pointer transition-colors duration-300 group
                    ${!isCurrentMonth ? 'text-[var(--text-tertiary)]' : ''}
                    ${isSelected ? 'z-10' : 'hover:bg-[var(--surface-2)]'}
                    ${dayIdx % 7 === 6 ? 'border-r-0' : ''}
                  `}
                  style={{
                    borderColor: "var(--border)",
                    background: isSelected ? "var(--accent-soft)" : !isCurrentMonth ? "transparent" : undefined,
                    boxShadow: isSelected ? "inset 0 0 0 2px var(--accent-ring)" : undefined,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-transform group-hover:scale-110"
                      style={
                        isTodayDate
                          ? { background: "var(--accent)", color: "white", boxShadow: "0 4px 10px -3px var(--accent-ring)" }
                          : isSelected
                          ? { color: "var(--accent)", fontWeight: 700 }
                          : undefined
                      }
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div key={event.id} className="text-[10px] truncate px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium border-l-2 border-orange-500">
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-[var(--text-tertiary)] pl-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel: Selected Day Events */}
        <div className="surface p-6 h-fit">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
            </h2>
            <span className="text-caption bg-[var(--surface-2)] px-3 py-1 rounded-full">
              {getEventsForDay(selectedDate).length} Events
            </span>
          </div>

          <div className="space-y-4 mb-8">
              {getEventsForDay(selectedDate).length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <p>No events scheduled</p>
                  <button
                    onClick={() => openModal()}
                    className="press mt-2 text-sm font-medium"
                    style={{ color: "var(--accent)" }}
                  >
                    Create one now
                  </button>
                </div>
              ) : (
                getEventsForDay(selectedDate).map(event => (
                  <div
                    key={event.id}
                    onClick={() => openModal(event)}
                    className="group press flex gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--surface-2)] hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-transparent hover:border-orange-200 dark:hover:border-orange-800 transition-colors duration-300 cursor-pointer"
                  >
                    <div className="flex flex-col items-center justify-center min-w-[60px] border-r divider pr-4">
                      <span className="text-xs text-[var(--text-secondary)] font-medium uppercase">{event.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--text)] group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors truncate">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-secondary)] border divider capitalize">
                          {event.type}
                        </span>
                        {event.location && (
                          <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" /> {event.location}
                          </span>
                        )}
                      </div>
                      {event.photo && (
                        <Image src={event.photo} alt="Event" width={160} height={120} unoptimized className="mt-2 rounded-lg max-h-32 object-cover border divider" />
                      )}
                    </div>
                  </div>
                ))
              )}
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 scrim animate-fade"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="material-sheet animate-sheet rounded-t-[var(--radius-lg)] md:rounded-[var(--radius-lg)] shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b divider flex justify-between items-center">
              <h3 className="text-title">{isReadOnlyEvent ? 'Cleaning Task' : editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="press text-[var(--text-tertiary)] hover:text-[var(--text)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              {isReadOnlyEvent && (
                <p className="text-caption text-[var(--text-secondary)]">
                  This event comes from the cleaning plan. Change its date or remove it on the Tasks page.
                </p>
              )}
              <fieldset disabled={isReadOnlyEvent} className="space-y-4 min-w-0">
              <div>
                <label className="block text-caption mb-1.5">Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const imageData = ev.target?.result as string;
                        setNewEventPhoto(imageData);
                        // OCR: suggest a title from the first line of text, but never
                        // overwrite something the user already typed. A failed scan
                        // just means no suggestion — the photo is still attached.
                        try {
                          const { data } = await Tesseract.recognize(imageData, 'eng');
                          const firstLine = data.text?.split('\n').find(line => line.trim().length > 0);
                          if (firstLine) setNewEventTitle((current) => current.trim() ? current : firstLine.trim());
                        } catch {
                          // ignore OCR failures
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="field"
                />
                {newEventPhoto && (
                  <Image src={newEventPhoto} alt="Event" width={320} height={200} unoptimized className="mt-2 rounded-lg max-h-40 object-cover border divider" />
                )}
              </div>
              <div>
                <label className="block text-caption mb-1.5">Event Title</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Grocery shopping, Date night, etc."
                  className="field"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-caption mb-1.5">Date</label>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-caption mb-1.5">Time</label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-caption mb-1.5">Location (Optional)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    placeholder="e.g. Central Park, Home, etc."
                    className="field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-caption mb-1.5">Type</label>
                <div className="flex gap-2">
                  {(['event', 'task', 'shopping'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewEventType(type)}
                      className="press flex-1 py-2 rounded-[var(--radius-md)] text-sm font-medium capitalize transition-colors duration-300 border"
                      style={
                        newEventType === type
                          ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              </fieldset>

              <div className="flex gap-3 mt-6">
                {isReadOnlyEvent ? (
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-primary flex-1 py-3">
                    Close
                  </button>
                ) : (<>
                {editingEvent && (
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    className="btn btn-danger flex-1 py-3"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary py-3"
                  style={{ flex: 2, boxShadow: "0 8px 20px -8px var(--accent-ring)" }}
                >
                  {isSaving ? 'Saving…' : editingEvent ? 'Update Event' : 'Save Event'}
                </button>
                </>)}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
