import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction } from "@shared/schema";
import { format } from "date-fns";
import { List, Calendar as CalendarIcon, Copy, Check, ExternalLink, Mail } from "lucide-react";
import { SiGoogle, SiApple } from "react-icons/si";
import { Timeline } from "@/components/ui/timeline";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Scheduler } from "@aldabil/react-scheduler";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useToast } from "@/hooks/use-toast";

const calendarTheme = createTheme({
  palette: {
    secondary: {
      main: 'rgba(0, 0, 0, 0.08)',
      contrastText: '#000000',
    },
  },
});
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
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const getSubscribeUrl = () => {
    if (!user) return "";
    return `${window.location.origin}/api/calendar/${user.id}/subscribe`;
  };

  const getWebcalUrl = () => {
    if (!user) return "";
    return `${window.location.origin.replace(/^https?:/, 'webcal:')}/api/calendar/${user.id}/subscribe`;
  };

  const handleCopyUrl = async () => {
    const url = getSubscribeUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Calendar URL copied", description: "Paste this URL in your calendar app to subscribe." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoogleCalendar = () => {
    const url = getSubscribeUrl();
    const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url)}`;
    window.open(googleUrl, '_blank');
  };

  const handleAppleCalendar = () => {
    window.location.href = getWebcalUrl();
  };

  const handleOutlookCalendar = () => {
    const url = getSubscribeUrl();
    const outlookUrl = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=Homebase%20Calendar`;
    window.open(outlookUrl, '_blank');
  };

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
    <div className="flex-1 p-4 sm:p-6 w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold">Calendar</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Export
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

      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Connect to:</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleGoogleCalendar} variant="outline" size="sm" className="gap-2">
              <SiGoogle className="h-4 w-4 text-red-500" />
              Google Calendar
            </Button>
            <Button onClick={handleAppleCalendar} variant="outline" size="sm" className="gap-2">
              <SiApple className="h-4 w-4" />
              Apple Calendar
            </Button>
            <Button onClick={handleOutlookCalendar} variant="outline" size="sm" className="gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              Outlook
            </Button>
            <Button onClick={handleCopyUrl} variant="ghost" size="sm" className="gap-2">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy URL"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="w-full min-h-[calc(100vh-12rem)] relative z-0">
        <Timeline transactions={transactions} />
        {!showTable ? (
          <div className="w-full relative">
            <ThemeProvider theme={calendarTheme}>
              <Scheduler
                events={events}
                className="w-full overflow-x-hidden [&_.rs__cell]:!text-black [&_.rs__header]:!text-black [&_.rs__time]:!text-black [&_.rs__event]:!text-black dark:[&_.rs__cell]:!text-black dark:[&_.rs__header]:!text-black dark:[&_.rs__time]:!text-black dark:[&_.rs__event]:!text-black [&_.rs__today]:!text-black dark:[&_.rs__today]:!text-black [&_.rs__time-indicator]:!text-black dark:[&_.rs__time-indicator]:!text-black"
                deletable={false}
                draggable={false}
                views={["month", "week", "day"]}
                view="month"
                defaultView="month"
                height={window.innerHeight - 250}
                week={{
                  weekDays: [0, 1, 2, 3, 4, 5, 6],
                  weekStartOn: 0,
                  startHour: 0,
                  endHour: 23
                }}
                day={{
                  startHour: 0,
                  endHour: 23,
                }}
                month={{
                  weekDays: [0, 1, 2, 3, 4, 5, 6],
                  weekStartOn: 0,
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
            </ThemeProvider>
          </div>
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
  );
}