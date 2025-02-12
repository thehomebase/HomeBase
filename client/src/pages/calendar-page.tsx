import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction } from "@shared/schema";
import { format } from "date-fns";
import { List, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
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
  const [date, setDate] = useState<Date>(new Date());

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const events = transactions.map((transaction) => {
    const events = [];

    if (transaction.optionPeriodExpiration) {
      events.push({
        id: `option-${transaction.id}`,
        title: `Option Expiration - ${transaction.address}`,
        date: new Date(transaction.optionPeriodExpiration),
        type: 'option'
      });
    }

    if (transaction.closingDate) {
      events.push({
        id: `closing-${transaction.id}`,
        title: `Closing - ${transaction.address}`,
        date: new Date(transaction.closingDate),
        type: 'closing'
      });
    }

    return events;
  }).flat();

  const sortedEvents = [...events].sort((a, b) =>
    a.date.getTime() - b.date.getTime()
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
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => date && setDate(date)}
            className="rounded-md border w-full"
            modifiers={{
              event: (date) => events.some(
                event => event.date.toDateString() === date.toDateString()
              )
            }}
            modifiersStyles={{
              event: {
                fontWeight: 'bold',
                textDecoration: 'underline'
              }
            }}
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
                  <TableRow key={event.id}>
                    <TableCell>{format(event.date, 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            event.type === 'option' ? 'bg-yellow-400' : 'bg-green-500'
                          }`}
                        />
                        {event.type === 'option' ? 'Option Expiration' : 'Closing'}
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