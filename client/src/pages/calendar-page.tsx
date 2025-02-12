import { useAuth } from "@/hooks/use-auth";
import { Scheduler } from "@aldabil/react-scheduler";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction } from "@shared/schema";
import { format } from "date-fns";

export default function CalendarPage() {
  const { user } = useAuth();

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

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Calendar</h2>
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
            step: 60
          }}
          month={{
            weekDays: [0, 1, 2, 3, 4, 5, 6],
            weekStartOn: 0,
            startHour: 9,
            endHour: 17
          }}
          height={600}
          hourFormat="12"
          loading={false}
          editable={false}
          deletable={false}
          draggable={false}
        />
      </Card>
    </main>
  );
}