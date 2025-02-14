
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction } from "@shared/schema";
import { format } from "date-fns";
import { List, Calendar as CalendarIcon } from "lucide-react";
import { Timeline } from "@/components/ui/timeline";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Scheduler } from "@aldabil/react-scheduler";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CalendarPage() {
  const { user } = useAuth();
  const [showTable, setShowTable] = useState(false);

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const events = transactions.map((transaction) => {
    const events = [];

    if (transaction.optionPeriodExpiration) {
      events.push({
        event_id: `option-${transaction.id}`,
        title: `Option Expiration - ${transaction.address}`,
        start: new Date(transaction.optionPeriodExpiration),
        end: new Date(transaction.optionPeriodExpiration),
        color: "#EAB308"
      });
    }

    if (transaction.closingDate) {
      events.push({
        event_id: `closing-${transaction.id}`,
        title: `Closing - ${transaction.address}`,
        start: new Date(transaction.closingDate),
        end: new Date(transaction.closingDate),
        color: "#22C55E"
      });
    }

    return events;
  }).flat();

  const sortedEvents = [...events].sort((a, b) =>
    a.start.getTime() - b.start.getTime()
  );

  const handleExportToIcal = () => {
    if (user) {
      window.location.href = `/api/calendar/${user.id}/export`;
    }
  };

  const handleSubscribeToCalendar = () => {
    if (user) {
      const baseUrl = window.location.origin.replace(/^https?:/, 'webcal:');
      window.location.href = `${baseUrl}/api/calendar/${user.id}/subscribe`;
    }
  };

  return (
    <main className="flex-1 p-6 w-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Calendar</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Add to Calendar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSubscribeToCalendar}>
                Subscribe (Auto-updating)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportToIcal}>
                Export as File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTable(!showTable)}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            {showTable ? "Show Calendar" : "Show List"}
          </Button>
        </div>
      </div>

      <div className="w-full min-h-[calc(100vh-12rem)] overflow-hidden">
        <Timeline transactions={transactions} />
        {!showTable ? (
          <div className="w-full overflow-x-auto">
            <Scheduler
              events={events}
              className="w-full min-w-[800px]"
              deletable={false}
              draggable={false}
            views={["month", "week", "day"]}
            height={window.innerHeight - 250}
            week={{
              weekDays: [0, 1, 2, 3, 4, 5, 6],
              weekStartOn: 0,
              startHour: 0,
              endHour: 23,
            }}
            day={{
              startHour: 0,
              endHour: 23,
            }}
            navigation={{
              toolbar: (toolbar) => {
                const { onNavigate, date } = toolbar;
                return (
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                      <button onClick={() => onNavigate('PREV')} className="p-1">←</button>
                      <span>{format(date, 'MMMM yyyy')}</span>
                      <button onClick={() => onNavigate('NEXT')} className="p-1">→</button>
                    </div>
                  </div>
                );
              }
            }}
            selectedDate={new Date()}
            fields={[]}
            dialogMaxWidth="lg"
          />
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Property</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEvents.map((event) => (
                  <TableRow key={event.event_id}>
                    <TableCell>{format(event.start, 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            event.event_id.startsWith('option') ? 'bg-yellow-400' : 'bg-green-500'
                          }`}
                        />
                        {event.event_id.startsWith('option') ? 'Option Expiration' : 'Closing'}
                      </div>
                    </TableCell>
                    <TableCell>{event.title.split(' - ')[1]}</TableCell>
                  </TableRow>
                ))}
                {sortedEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No upcoming events
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
