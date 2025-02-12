
import React from "react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

interface TimelineProps {
  transactions: Array<{
    id: number;
    address: string;
    closingDate?: string;
    optionPeriodExpiration?: string;
  }>;
}

export function Timeline({ transactions }: TimelineProps) {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const today = new Date();
  
  // Group events by day
  const eventsByDay = new Map<number, Array<{ type: string; transaction: any }>>();
  
  transactions.forEach(transaction => {
    if (transaction.closingDate) {
      const date = new Date(transaction.closingDate);
      const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < 30) {
        const events = eventsByDay.get(daysDiff) || [];
        events.push({ type: 'closing', transaction });
        eventsByDay.set(daysDiff, events);
      }
    }
    if (transaction.optionPeriodExpiration) {
      const date = new Date(transaction.optionPeriodExpiration);
      const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < 30) {
        const events = eventsByDay.get(daysDiff) || [];
        events.push({ type: 'option', transaction });
        eventsByDay.set(daysDiff, events);
      }
    }
  });

  return (
    <div className="mb-8">
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
                left: `${((day - 1) / 29) * 100}%`,
                transform: 'translateX(-50%)',
                top: '-4px'
              }}
            />
          ))}
        </div>
        
        {/* Day labels */}
        <div className="absolute w-full top-4">
          {[1, 10, 20, 30].map(day => (
            <span
              key={day}
              className="absolute text-xs text-muted-foreground"
              style={{
                left: `${((day - 1) / 29) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            >
              Day {day}
            </span>
          ))}
        </div>

        {/* Event markers */}
        {Array.from(eventsByDay.entries()).map(([day, events]) => (
          <TooltipProvider key={day}>
            <Tooltip>
              <TooltipTrigger>
                <div
                  className="absolute w-4 h-4 bg-primary rounded-full cursor-pointer"
                  style={{
                    left: `${(day / 29) * 100}%`,
                    top: '-5px',
                    transform: 'translateX(-50%)'
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" align="center" sideOffset={5}>
                <div className="space-y-2">
                  {events.map((event, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium">{event.transaction.address}</p>
                      <p className="text-muted-foreground">
                        {event.type === 'closing' ? 'Closing' : 'Option Expiration'}:
                        {' '}
                        {format(new Date(event.type === 'closing' 
                          ? event.transaction.closingDate 
                          : event.transaction.optionPeriodExpiration
                        ), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
