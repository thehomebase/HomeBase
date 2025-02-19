import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client, type InsertClient } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Mail, Phone, ChevronUp, ChevronDown, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type SortConfig = {
  key: keyof Client;
  direction: 'asc' | 'desc';
} | null;

const ClientCard = ({ client }: { client: Client }) => (
  <Card className="mb-4">
    <CardHeader>
      <CardTitle className="text-lg">
        {client.firstName} {client.lastName}
      </CardTitle>
      <div className="text-sm text-muted-foreground">
        Added {format(new Date(client.createdAt), 'MMM d, yyyy')}
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{client.email || 'No email'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{client.phone || 'No phone'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{client.address || 'No address'}</span>
        </div>
        <div className="pt-2">
          <span className={`px-2 py-1 rounded-full text-xs ${
            client.status === 'active'
              ? 'bg-green-100 text-green-800'
              : client.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {client.status}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const form = useForm<InsertClient>({
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
      agentId: user?.id || 0,
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const response = await apiRequest("POST", "/api/clients", data);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      form.reset();
      toast({
        title: "Success",
        description: "Client added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertClient) => {
    const submitData = {
      ...data,
      agentId: user?.id as number,
    };
    createClientMutation.mutate(submitData);
  };

  const sortData = (data: Client[], config: SortConfig) => {
    if (!config) return data;

    return [...data].sort((a, b) => {
      const aValue = a[config.key];
      const bValue = b[config.key];

      if (aValue === null) return config.direction === 'asc' ? -1 : 1;
      if (bValue === null) return config.direction === 'asc' ? 1 : -1;

      if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const requestSort = (key: keyof Client) => {
    setSortConfig((currentConfig) => {
      if (!currentConfig || currentConfig.key !== key) {
        return { key, direction: 'asc' };
      }
      if (currentConfig.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const getSortIcon = (columnKey: keyof Client) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null;
    }
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const sellers = sortData(clients.filter(client => client.type === 'seller'), sortConfig);
  const buyers = sortData(clients.filter(client => client.type === 'buyer'), sortConfig);

  const ClientTable = ({ clients }: { clients: Client[] }) => (
    <>
      {/* Desktop view - Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 dark:bg-gray-800">
              <TableHead className="cursor-pointer py-3 font-semibold" onClick={() => requestSort('lastName')}>
                <div className="flex items-center gap-1">
                  Last Name {getSortIcon('lastName')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer py-3 font-semibold" onClick={() => requestSort('firstName')}>
                <div className="flex items-center gap-1">
                  First Name {getSortIcon('firstName')}
                </div>
              </TableHead>
              <TableHead className="py-3 font-semibold">Email</TableHead>
              <TableHead className="py-3 font-semibold">Current Address</TableHead>
              <TableHead className="py-3 font-semibold">Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client, index) => (
              <TableRow 
                key={client.id}
                className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                }`}
                onClick={() => {/* Add edit functionality */}}
              >
                <TableCell className="py-3">{client.lastName}</TableCell>
                <TableCell className="py-3">{client.firstName}</TableCell>
                <TableCell className="py-3 text-blue-600">
                  <div className="flex items-center gap-2">
                    {client.email}
                  </div>
                </TableCell>
                <TableCell className="py-3">{client.address}</TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    {client.phone}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No clients found. Add your first client to get started!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view - Cards */}
      <div className="md:hidden space-y-4">
        {clients.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No clients found. Add your first client to get started!
          </div>
        ) : (
          clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))
        )}
      </div>
    </>
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="border-b">
        <div className="container px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold">Client Management</h2>
          {user?.role === "agent" && (
            <div className="mt-4 md:mt-0">
              <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    {createClientMutation.isPending ? 'Adding...' : 'Add Client'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}
        </div>
      </header>

      <Card>
        <Tabs defaultValue="sellers" className="p-6">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="sellers">Sellers</TabsTrigger>
            <TabsTrigger value="buyers">Buyers</TabsTrigger>
          </TabsList>
          <TabsContent value="sellers">
            <ClientTable clients={sellers} />
          </TabsContent>
          <TabsContent value="buyers">
            <ClientTable clients={buyers} />
          </TabsContent>
        </Tabs>
      </Card>
    </main>
  );
}