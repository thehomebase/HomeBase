
import React, { useState } from "react";
import { format, getDaysInMonth, isSameDay } from "date-fns";

interface TimelineProps {
  transactions: Array<{
    id: number;
    address: string;
    closingDate?: string;
    optionPeriodExpiration?: string;
  }>;
}

export function Timeline({ transactions }: TimelineProps) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(today);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // Group events by day
  const eventsByDay = new Map<number, Array<{ type: string; transaction: any }>>();
  
  transactions.forEach(transaction => {
    if (transaction.closingDate) {
      const date = new Date(transaction.closingDate);
      if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
        const day = date.getDate();
        const events = eventsByDay.get(day - 1) || [];
        events.push({ type: 'closing', transaction });
        eventsByDay.set(day - 1, events);
      }
    }
    if (transaction.optionPeriodExpiration) {
      const date = new Date(transaction.optionPeriodExpiration);
      if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
        const day = date.getDate();
        const events = eventsByDay.get(day - 1) || [];
        events.push({ type: 'option', transaction });
        eventsByDay.set(day - 1, events);
      }
    }
  });

  return (
    <div className="mb-8 space-y-4">
      <div className="relative h-16">
        {/* Timeline bar */}
        <div className="absolute w-full h-2 bg-muted rounded-full"></div>
        
        {/* Day markers */}
        <div className="absolute w-full">
          {days.map(day => (
            <div
              key={day}
              className="absolute h-3 w-0.5 bg-muted-foreground/30"
              style={{ 
                left: `${((day - 1) / (daysInMonth - 1)) * 100}%`,
                transform: 'translateX(-50%)',
                top: '-4px'
              }}
            />
          ))}
        </div>
        
        {/* Day labels */}
        <div className="absolute w-full top-4">
          {[1, 10, 20, daysInMonth].map(day => (
            <span
              key={day}
              className="absolute text-xs text-muted-foreground"
              style={{
                left: `${((day - 1) / (daysInMonth - 1)) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            >
              Day {day}
            </span>
          ))}
        </div>

        {/* Current date marker */}
        <div
          className="absolute w-4 h-4 bg-destructive rounded-full cursor-pointer"
          style={{
            left: `${((today.getDate() - 1) / (daysInMonth - 1)) * 100}%`,
            top: '-5px',
            transform: 'translateX(-50%)',
            zIndex: 10
          }}
        />

        {/* Event markers */}
        {Array.from(eventsByDay.entries()).map(([day, events]) => (
          <div
            key={day}
            onClick={() => setSelectedDay(selectedDay === day ? null : day)}
            className="absolute w-4 h-4 bg-primary rounded-full cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            style={{
              left: `${(day / (daysInMonth - 1)) * 100}%`,
              top: '-5px',
              transform: 'translateX(-50%)'
            }}
          />
        ))}
      </div>

      {/* Event Cards */}
      {selectedDay !== null && eventsByDay.has(selectedDay) && (
        <div className="bg-card rounded-lg p-4 space-y-2 border">
          <h3 className="font-medium">Events for Day {selectedDay + 1}</h3>
          <div className="grid gap-2">
            {eventsByDay.get(selectedDay)?.map((event, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-md bg-muted flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{event.transaction.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.type === 'closing' ? 'Closing' : 'Option Expiration'}:{' '}
                    {format(new Date(event.type === 'closing' 
                      ? event.transaction.closingDate 
                      : event.transaction.optionPeriodExpiration
                    ), 'MMM d, yyyy')}
                  </p>
                </div>
                <div 
                  className={`w-2 h-2 rounded-full ${
                    event.type === 'closing' ? 'bg-green-500' : 'bg-yellow-400'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
