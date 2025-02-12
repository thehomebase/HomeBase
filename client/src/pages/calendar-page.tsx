import { useAuth } from "@/hooks/use-auth";
import { Scheduler } from "@aldabil/react-scheduler";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction } from "@shared/schema";
import { format } from "date-fns";
import { List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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

  // Fetch transactions to display in calendar
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  // Convert transactions to calendar events
  const events = transactions.map((transaction) => {
    const events = [];

    // Add option expiration date event
    if (transaction.optionPeriodExpiration) {
      events.push({
        event_id: `option-${transaction.id}`,
        title: `Option Expiration - ${transaction.address}`,
        start: new Date(transaction.optionPeriodExpiration),
        end: new Date(transaction.optionPeriodExpiration),
        draggable: false,
        editable: false,
        deletable: false,
        color: "#fbbf24", // amber-400
      });
    }

    // Add closing date event
    if (transaction.closingDate) {
      events.push({
        event_id: `closing-${transaction.id}`,
        title: `Closing - ${transaction.address}`,
        start: new Date(transaction.closingDate),
        end: new Date(transaction.closingDate),
        draggable: false,
        editable: false,
        deletable: false,
        color: "#22c55e", // green-500
      });
    }

    return events;
  }).flat();

  // Sort events by date for the table view
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Calendar</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTable(!showTable)}
          className="gap-2"
        >
          <List className="h-4 w-4" />
          {showTable ? "Hide List" : "Show List"}
        </Button>
      </div>

      <Card className="p-6">
        <Scheduler
          view="month"
          events={events}
          week={{
            weekDays: [0, 1, 2, 3, 4, 5, 6],
            weekStartOn: 0,
            startHour: 9,
            endHour: 17,
            step: 60,
          }}
          month={{
            weekDays: [0, 1, 2, 3, 4, 5, 6],
            weekStartOn: 0,
            startHour: 9,
            endHour: 17,
          }}
          height={600}
          hourFormat="12"
          loading={false}
          editable={false}
          deletable={false}
          draggable={false}
          navigation={{
            component: (props: { onChange: (view: string) => void; selectedView: string }) => {
              const views = [
                { id: "month", label: "Month" },
                { id: "week", label: "Week" },
                { id: "day", label: "Day" },
              ];
              return (
                <div className="flex items-center gap-2">
                  {views.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => props.onChange(view.id)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        props.selectedView === view.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              );
            },
          }}
        />

        {showTable && (
          <div className="mt-8">
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
                    <TableCell>{format(new Date(event.start), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: event.color }}
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
      </Card>
    </main>
  );
}