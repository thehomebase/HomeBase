import { useAuth } from "@/hooks/use-auth";
import { Scheduler } from "@aldabil/react-scheduler";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction } from "@shared/schema";
import { format } from "date-fns";
import { List, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
        draggable: false,
        editable: false,
        deletable: false,
        color: "#fbbf24",
      });
    }

    if (transaction.closingDate) {
      events.push({
        event_id: `closing-${transaction.id}`,
        title: `Closing - ${transaction.address}`,
        start: new Date(transaction.closingDate),
        end: new Date(transaction.closingDate),
        draggable: false,
        editable: false,
        deletable: false,
        color: "#22c55e",
      });
    }

    return events;
  }).flat();

  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.start).getTime() - new Date(b.start).getTime()
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
    <main className="container mx-auto px-4 py-8">
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

      <Card className="p-6">
        {!showTable ? (
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
            views={["month"]}
            navigation={{
              component: () => null
            }}
            viewerExtraComponent={() => null}
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