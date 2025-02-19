
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";

export default function ClientPage() {
  const { id } = useParams();
  
  const { data: client } = useQuery({
    queryKey: ["/api/clients", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/clients/${id}`);
      if (!response.ok) throw new Error("Failed to fetch client");
      return response.json();
    },
  });

  if (!client) {
    return <div>Loading...</div>;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{client.firstName} {client.lastName}</h1>
      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Email:</span> {client.email}</p>
            <p><span className="font-medium">Phone:</span> {client.phone}</p>
            <p><span className="font-medium">Address:</span> {client.address}</p>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Client Details</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Type:</span> {client.type}</p>
            <p><span className="font-medium">Labels:</span> {client.labels?.join(", ")}</p>
            <p><span className="font-medium">Notes:</span> {client.notes}</p>
          </div>
        </Card>
      </div>
    </main>
  );
}
