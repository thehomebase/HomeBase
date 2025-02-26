import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Mail, Phone, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Link } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const getLabelColor = (label: string, index: number) => {
  const colors = [
    'bg-blue-100 text-blue-800 border border-blue-200',
    'bg-red-100 text-red-800 border border-red-200',
    'bg-green-100 text-green-800 border border-green-200',
    'bg-yellow-100 text-yellow-800 border border-yellow-200',
    'bg-purple-100 text-purple-800 border border-purple-200',
    'bg-pink-100 text-pink-800 border border-pink-200'
  ];
  return colors[index % colors.length];
};

// Mobile Card Component
function ClientCard({ client, onDelete }: { client: Client; onDelete: (id: number) => void }) {
  return (
    <Card className="p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <Link href={`/clients/${client.id}`}>
          <h3 className="text-lg font-semibold hover:text-primary">
            {client.firstName} {client.lastName}
          </h3>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(client.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          {client.email}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          {client.phone}
        </div>
      </div>
      {client.labels && client.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {client.labels.map((label, index) => (
            <span
              key={index}
              className={`${getLabelColor(label, index)} text-xs px-2 py-0.5 rounded-full`}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

// Desktop Table Component
function ClientTable({ clients, onDelete }: { clients: Client[]; onDelete: (id: number) => void }) {
  return (
    <div>
      {/* Desktop view */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <Link href={`/clients/${client.id}`} className="hover:text-primary">
                    {client.firstName} {client.lastName}
                  </Link>
                </TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(client.labels || []).map((label, index) => (
                      <span
                        key={index}
                        className={`${getLabelColor(label, index)} text-xs px-2 py-0.5 rounded-full`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{format(new Date(client.createdAt), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(client.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {clients.map((client) => (
          <ClientCard key={client.id} client={client} onDelete={onDelete} />
        ))}
      </div>

      {clients.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No clients found. Add your first client to get started!
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  console.log("Auth state:", { user, isAuthenticated: !!user });

  const form = useForm({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      type: "seller",
      status: "active",
      notes: "",
      labels: [],
    },
  });

  const { data: clients = [], isLoading, error } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
    onError: (error) => {
      console.error("Client fetch error:", error);
    },
    onSuccess: (data) => {
      console.log("Clients loaded:", data?.length);
    }
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: typeof form.getValues) => {
      const sanitizedData = {
        ...data,
        agentId: user?.id,
        labels: Array.isArray(data.labels) ? data.labels : [],
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null
      };

      const response = await apiRequest("POST", "/api/clients", sanitizedData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create client');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      form.reset();
      setOpen(false);
      toast({
        title: "Success",
        description: "Client created successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest("DELETE", `/api/clients/${clientId}`);
      if (!response.ok) throw new Error("Failed to delete client");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setClientToDelete(null);
      toast({
        title: "Success",
        description: "Client deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const filteredClients = clients.filter(client => 
    [client.firstName, client.lastName, client.email, client.phone]
      .filter(Boolean)
      .some(field => field.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sellers = filteredClients.filter((client) => client.type === "seller");
  const buyers = filteredClients.filter((client) => client.type === "buyer");

  if (isLoading) {
    console.log("Loading clients...");
    return <div className="container mx-auto px-4 py-8">Loading clients...</div>;
  }

  if (error) {
    console.error("Client page error:", error);
    return <div className="container mx-auto px-4 py-8">Error loading clients: {error instanceof Error ? error.message : 'An error occurred'}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-screen flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold">Client Management</h2>
        <div className="flex items-center gap-4 w-full">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(createClientMutation.mutate)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Type</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="seller">Seller</option>
                            <option value="buyer">Buyer</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            className="w-full px-3 py-2 border rounded-md"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createClientMutation.isPending}
                  >
                    Add Client
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <Tabs defaultValue="sellers" className="p-6">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="sellers">Sellers</TabsTrigger>
            <TabsTrigger value="buyers">Buyers</TabsTrigger>
          </TabsList>
          <TabsContent value="sellers">
            <ClientTable 
              clients={sellers} 
              onDelete={(id) => setClientToDelete(id)} 
            />
          </TabsContent>
          <TabsContent value="buyers">
            <ClientTable 
              clients={buyers} 
              onDelete={(id) => setClientToDelete(id)} 
            />
          </TabsContent>
        </Tabs>
      </Card>

      <AlertDialog open={clientToDelete !== null} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clientToDelete && deleteClientMutation.mutate(clientToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}