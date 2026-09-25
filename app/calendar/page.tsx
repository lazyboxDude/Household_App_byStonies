"use client";
import Tesseract from 'tesseract.js';
import React, { useState, useEffect } from 'react';
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
  isToday,
  getDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, X, MapPin, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  type: 'task' | 'shopping' | 'event';
  location?: string;
  photo?: string; // base64 or data URL
}

interface Suggestion {
  id: string;
  title: string;
  category: string;
  location?: string;
  description: string;
  // ...existing code...
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const storedEvents = localStorage.getItem('calendar_events');
      if (storedEvents) {
        const raw = JSON.parse(storedEvents) as Array<Record<string, unknown>>;
        return raw.map(ev => ({
          id: String(ev.id ?? Date.now().toString()),
          title: String(ev.title ?? ''),
          date: new Date(String(ev.date ?? new Date().toISOString())),
          time: String(ev.time ?? '12:00'),
          type: (ev.type as 'task' | 'shopping' | 'event') || 'event',
          location: ev.location ? String(ev.location) : undefined,
          photo: ev.photo ? String(ev.photo) : undefined,
        } as CalendarEvent));
      }
    } catch (err) {
      console.error('Failed to read calendar events from storage', err);
    }
    return [];
  });
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Discovery State
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  // ...existing code...

  // Form state
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('12:00');
  const [newEventType, setNewEventType] = useState<'task' | 'shopping' | 'event'>('event');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventPhoto, setNewEventPhoto] = useState<string | null>(null);


  // ...existing code...

  // Mock Suggestions Generator (Fallback)
  const getMockSuggestions = (date: Date): Suggestion[] => {
    const dayOfWeek = getDay(date); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const baseSuggestions: Suggestion[] = [
      { id: '1', title: 'Local Farmers Market', category: 'Shopping', location: 'Town Square', description: 'Fresh produce and local goods.' },
      { id: '2', title: 'Cinema Night', category: 'Entertainment', location: 'City Mall Cinema', description: 'Catch the latest blockbuster.' },
      { id: '3', title: 'Park Picnic', category: 'Outdoor', location: 'Central Park', description: 'Relaxing afternoon in the sun.' },
    ];

    if (isWeekend) {
      return [
        ...baseSuggestions,
        { id: 'w1', title: 'Live Music Night', category: 'Nightlife', location: 'The Jazz Corner', description: 'Local bands playing live.' },
        { id: 'w2', title: 'Hiking Trip', category: 'Outdoor', location: 'Sunset Trail', description: '3-hour scenic hike.' },
      ];
    } else {
      return [
        ...baseSuggestions.slice(0, 2),
        { id: 'd1', title: 'Quick Gym Session', category: 'Health', location: 'FitZone', description: '45 min cardio workout.' },
        { id: 'd2', title: 'Try a New Recipe', category: 'Cooking', description: 'Cook something special for dinner.' },
      ];
    }
  };

  // Load Suggestions when tab changes or date changes
  useEffect(() => {
    const loadSuggestions = async () => {
      setIsLoadingSuggestions(true);
      // ...existing code...

      // 1. Try to get location
      if (!navigator.geolocation) {
        setSuggestions(getMockSuggestions(selectedDate));
        setIsLoadingSuggestions(false);
        return;
      }

      // Only use mock suggestions for now
      setSuggestions(getMockSuggestions(selectedDate));
      setIsLoadingSuggestions(false);
    };

    loadSuggestions();
  }, [selectedDate]); // Reload when date changes

  const handleAddSuggestion = (suggestion: Suggestion) => {
    setNewEventTitle(suggestion.title);
    setNewEventLocation(suggestion.location || '');
    setNewEventType(suggestion.category === 'Shopping' ? 'shopping' : 'event');
    setNewEventTime('18:00'); // Default evening time
    setSelectedDate(selectedDate);
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  // Save events to localStorage
  useEffect(() => {
    localStorage.setItem('calendar_events', JSON.stringify(events));
  }, [events]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const openModal = (event?: CalendarEvent) => {
    if (event) {
      setEditingEvent(event);
      setNewEventTitle(event.title);
      setNewEventTime(event.time);
      setNewEventType(event.type);
      setNewEventLocation(event.location || '');
      setSelectedDate(event.date);
    } else {
      setEditingEvent(null);
      setNewEventTitle('');
      setNewEventTime('12:00');
      setNewEventType('event');
      setNewEventLocation('');
      setNewEventPhoto(null);
    }
    setIsModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle) return;

    if (editingEvent) {
      // Update existing event
      const updatedEvents = events.map(ev =>
        ev.id === editingEvent.id
          ? { ...ev, title: newEventTitle, time: newEventTime, type: newEventType, date: selectedDate, location: newEventLocation, photo: newEventPhoto || undefined }
          : ev
      );
      setEvents(updatedEvents);
    } else {
      // Create new event
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: newEventTitle,
        date: selectedDate,
        time: newEventTime,
        type: newEventType,
        location: newEventLocation,
        photo: newEventPhoto || undefined
      };
      setEvents([...events, newEvent]);
    }

    setIsModalOpen(false);
    setNewEventPhoto(null);
  };

  const handleDeleteEvent = () => {
    if (editingEvent) {
      setEvents(events.filter(ev => ev.id !== editingEvent.id));
      setIsModalOpen(false);
    }
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

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
            className="press p-2 hover:bg-[var(--surface-2)] rounded-[var(--radius-sm)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-headline min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={nextMonth}
            className="press p-2 hover:bg-[var(--surface-2)] rounded-[var(--radius-sm)] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
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

          <div className="pt-6 border-t divider">
            <h3 className="text-headline flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Discover Nearby
            </h3>

            {/* ...existing code... */}

            {isLoadingSuggestions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map(suggestion => (
                  <div key={suggestion.id} className="surface card-interactive p-3">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-sm text-[var(--text)]">{suggestion.title}</h4>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">{suggestion.category}</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{suggestion.description}</p>
                    {suggestion.location && (
                      <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] mb-2">
                        <MapPin className="w-3 h-3" />
                        {suggestion.location}
                      </div>
                    )}
                    <button
                      onClick={() => handleAddSuggestion(suggestion)}
                      className="press w-full py-1.5 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      Add <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
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
              <h3 className="text-title">{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="press text-[var(--text-tertiary)] hover:text-[var(--text)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
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
                        // OCR: extract text from image
                        const { data } = await Tesseract.recognize(imageData, 'eng');
                        if (data.text) {
                          // Try to autofill event title with first line of text
                          const firstLine = data.text.split('\n').find(line => line.trim().length > 0);
                          if (firstLine) setNewEventTitle(firstLine.trim());
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
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-caption mb-1.5">Date</label>
                  <div className="field text-[var(--text-secondary)]" style={{ background: "var(--surface-3)" }}>
                    {format(selectedDate, 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <label className="block text-caption mb-1.5">Time</label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="field"
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

              <div className="flex gap-3 mt-6">
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
                  className="btn btn-primary py-3"
                  style={{ flex: 2, boxShadow: "0 8px 20px -8px var(--accent-ring)" }}
                >
                  {editingEvent ? 'Update Event' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
