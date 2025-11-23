"use client";
import Tesseract from 'tesseract.js';
import React, { useState, useEffect } from 'react';
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
  getDay,
  startOfDay,
  endOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, X, MapPin, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

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
  const [isLoaded, setIsLoaded] = useState(true);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'discover'>('schedule');
  
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

  // events are initialized from localStorage above; isLoaded is true by default

  // Save events to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('calendar_events', JSON.stringify(events));
    }
  }, [events, isLoaded]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-orange-600" />
            Calendar
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your household schedule</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <button 
            onClick={prevMonth} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button 
            onClick={nextMonth} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-orange-600/20"
        >
          <Plus className="w-5 h-5" />
          Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            {weekDays.map(day => (
              <div key={day} className="py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
                    min-h-[120px] p-3 border-b border-r border-gray-100 dark:border-gray-700/50 relative cursor-pointer transition-all group
                    ${!isCurrentMonth ? 'bg-gray-50/30 dark:bg-gray-900/30 text-gray-400' : 'bg-white dark:bg-gray-800'}
                    ${isSelected ? 'bg-orange-50 dark:bg-orange-900/10 ring-2 ring-inset ring-orange-500/50 z-10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                    ${dayIdx % 7 === 6 ? 'border-r-0' : ''} 
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`
                      w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-transform group-hover:scale-110
                      ${isTodayDate ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' : ''}
                      ${!isTodayDate && isSelected ? 'text-orange-600 font-bold' : ''}
                    `}>
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
                      <div className="text-[10px] text-gray-400 pl-1">
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-fit">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
              {getEventsForDay(selectedDate).length} Events
            </span>
          </div>

          <div className="space-y-4 mb-8">
              {getEventsForDay(selectedDate).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No events scheduled</p>
                  <button 
                    onClick={() => openModal()}
                    className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Create one now
                  </button>
                </div>
              ) : (
                getEventsForDay(selectedDate).map(event => (
                  <div 
                    key={event.id} 
                    onClick={() => openModal(event)}
                    className="group flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-transparent hover:border-orange-200 dark:hover:border-orange-800 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-gray-200 dark:border-gray-600 pr-4">
                      <span className="text-xs text-gray-500 font-medium uppercase">{event.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors truncate">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-gray-600 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-500 capitalize">
                          {event.type}
                        </span>
                        {event.location && (
                          <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" /> {event.location}
                          </span>
                        )}
                      </div>
                      {event.photo && (
                        <img src={event.photo} alt="Event" className="mt-2 rounded-lg max-h-32 object-cover border" />
                      )}
                    </div>
                  </div>
                ))
              )}
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
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
                  <div key={suggestion.id} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-all bg-white dark:bg-gray-800">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{suggestion.title}</h4>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{suggestion.category}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{suggestion.description}</p>
                    {suggestion.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                        <MapPin className="w-3 h-3" />
                        {suggestion.location}
                      </div>
                    )}
                    <button 
                      onClick={() => handleAddSuggestion(suggestion)}
                      className="w-full py-1.5 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-colors flex items-center justify-center gap-1"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo (Optional)</label>
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
                                              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            />
                                            {newEventPhoto && (
                                              <img src={newEventPhoto} alt="Event" className="mt-2 rounded-lg max-h-40 object-cover border" />
                                            )}
                                          </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo (Optional)</label>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      setNewEventPhoto(ev.target?.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                              />
                              {newEventPhoto && (
                                <img src={newEventPhoto} alt="Event" className="mt-2 rounded-lg max-h-40 object-cover border" />
                              )}
                            </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Grocery shopping, Date night, etc."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <div className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500">
                    {format(selectedDate, 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location (Optional)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    placeholder="e.g. Central Park, Home, etc."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <div className="flex gap-2">
                  {(['event', 'task', 'shopping'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewEventType(type)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                        newEventType === type
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-400'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
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
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 font-bold py-3 rounded-xl transition-all"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-600/20"
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
