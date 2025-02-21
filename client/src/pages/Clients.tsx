import { useQuery } from '@tanstack/react-query';
import { CSVImport } from '@/components/CSVImport';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'wouter';
import { type Client } from '@shared/schema';

export function ClientsPage() {
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Link href="/clients/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </Link>
      </div>

      <CSVImport />

      {/* Existing client list UI */}
      <div className="grid gap-4">
        {isLoading ? (
          <div>Loading clients...</div>
        ) : (
          <div className="grid gap-4">
            {clients.map((client: Client) => (
              <div
                key={client.id}
                className="p-4 rounded-lg border bg-card text-card-foreground"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {client.firstName} {client.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm capitalize px-2 py-1 rounded-full bg-primary/10">
                      {client.type}
                    </span>
                    <span className="text-sm capitalize px-2 py-1 rounded-full bg-secondary/10">
                      {client.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}