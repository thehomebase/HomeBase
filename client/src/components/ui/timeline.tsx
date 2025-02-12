
import React from "react";
import { format, getDaysInMonth, isSameDay } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

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
          <TooltipProvider key={day}>
            <Tooltip>
              <TooltipTrigger>
                <div
                  className="absolute w-4 h-4 bg-primary rounded-full cursor-pointer"
                  style={{
                    left: `${(day / (daysInMonth - 1)) * 100}%`,
                    top: '-5px',
                    transform: 'translateX(-50%)'
                  }}
                />
              </TooltipTrigger>
              <TooltipPrimitive.Portal>
                <TooltipContent 
                  side="bottom" 
                  align="center" 
                  sideOffset={5}
                  className="z-50 relative"
                  avoidCollisions={true}
                >
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
              </TooltipPrimitive.Portal>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
