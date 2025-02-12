
import React from "react";
import { format } from "date-fns";
import { Card } from "./card";
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
  
  // Group transactions by date to handle overlaps
  const getDatePosition = (date: Date) => {
    const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(100, (daysDiff / 30) * 100));
  };

  return (
    <div className="mb-8">
      <div className="relative h-32">
        {/* Timeline bar */}
        <div className="h-2 bg-muted rounded-full mb-6"></div>
        
        {/* Day markers */}
        <div className="absolute w-full" style={{ top: '-4px' }}>
          {days.map(day => (
            <div
              key={day}
              className="absolute h-3 w-0.5 bg-muted-foreground/30"
              style={{ 
                left: `${((day - 1) / 29) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            />
          ))}
        </div>
        
        {/* Day labels */}
        <div className="flex justify-between absolute w-full" style={{ top: '8px' }}>
          {[1, 10, 20, 30].map(day => (
            <span key={day} className="text-xs text-muted-foreground" style={{
              position: 'absolute',
              left: `${((day - 1) / 29) * 100}%`,
              transform: 'translateX(-50%)'
            }}>
              Day {day}
            </span>
          ))}
        </div>

        {/* Transaction markers */}
        <div className="absolute w-full" style={{ top: '40px' }}>
          {transactions.map((transaction, index) => {
            const closing = transaction.closingDate ? new Date(transaction.closingDate) : null;
            const option = transaction.optionPeriodExpiration ? new Date(transaction.optionPeriodExpiration) : null;
            
            if (!closing && !option) return null;

            const verticalOffset = (index % 2) * 60;

            return (
              <div key={transaction.id}>
                {closing && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div 
                          className="absolute"
                          style={{ 
                            left: `${getDatePosition(closing)}%`,
                            top: verticalOffset,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div className="bg-green-500 w-3 h-3 rounded-full mb-1" />
                          <div className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                            {transaction.address}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{transaction.address}</p>
                        <p className="text-muted-foreground">Closing: {format(closing, 'MMM d, yyyy')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {option && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div 
                          className="absolute"
                          style={{ 
                            left: `${getDatePosition(option)}%`,
                            top: verticalOffset + 20,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div className="bg-purple-500 w-3 h-3 rounded-full mb-1" />
                          <div className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                            Option
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{transaction.address}</p>
                        <p className="text-muted-foreground">Option Expiration: {format(option, 'MMM d, yyyy')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
