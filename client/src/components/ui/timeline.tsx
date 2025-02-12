
import React from "react";
import { format } from "date-fns";
import { Card } from "./card";

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
  
  return (
    <div className="mb-8">
      <div className="relative">
        {/* Timeline bar */}
        <div className="h-2 bg-muted rounded-full mb-6"></div>
        
        {/* Day markers */}
        <div className="flex justify-between absolute w-full" style={{ top: '8px' }}>
          {[1, 15, 30].map(day => (
            <span key={day} className="text-xs text-muted-foreground">
              Day {day}
            </span>
          ))}
        </div>

        {/* Transaction markers */}
        <div className="relative" style={{ marginTop: '-8px' }}>
          {transactions.map(transaction => {
            const closing = transaction.closingDate ? new Date(transaction.closingDate) : null;
            const option = transaction.optionPeriodExpiration ? new Date(transaction.optionPeriodExpiration) : null;
            
            if (!closing && !option) return null;

            const getPosition = (date: Date) => {
              const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              return Math.max(0, Math.min(100, (daysDiff / 30) * 100));
            };

            return (
              <div key={transaction.id}>
                {closing && (
                  <div 
                    className="absolute"
                    style={{ 
                      left: `${getPosition(closing)}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="bg-green-500 w-3 h-3 rounded-full mb-1" />
                    <Card className="p-2 text-xs w-32 text-center">
                      <p className="font-medium truncate">{transaction.address}</p>
                      <p className="text-muted-foreground">Closing: {format(closing, 'MMM d')}</p>
                    </Card>
                  </div>
                )}
                {option && (
                  <div 
                    className="absolute"
                    style={{ 
                      left: `${getPosition(option)}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="bg-yellow-400 w-3 h-3 rounded-full mb-1" />
                    <Card className="p-2 text-xs w-32 text-center">
                      <p className="font-medium truncate">{transaction.address}</p>
                      <p className="text-muted-foreground">Option: {format(option, 'MMM d')}</p>
                    </Card>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
