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
import { Plus, Mail, Phone, ChevronUp, ChevronDown, MapPin, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation } from 'wouter';

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
  const [, navigate] = useLocation();
  const [location, setLocation] = useState('');

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
      labels: [],
    },
  });

  const onSubmit = async (data: InsertClient) => {
    if (!user?.id) return;

    try {
      await createClientMutation.mutateAsync({
        ...data,
        agentId: user.id,
        labels: data.labels || [],
      });
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create client",
        variant: "destructive",
      });
    }
  };

  const { data: clients = [], refetch: refetchClients } = useQuery<Client[]>({
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

  const ClientTable = ({ clients }: { clients: Client[] }) => {
    const [editingCell, setEditingCell] = useState<{id: number, field: string} | null>(null);
    const [editValue, setEditValue] = useState("");
    const [clientToDelete, setClientToDelete] = useState<number | null>(null);
    const { toast } = useToast();
    const { refetch } = useQuery<Client[]>({
      queryKey: ["/api/clients"],
      enabled: false,
    });

    const deleteClientMutation = useMutation({
      mutationFn: async (clientId: number) => {
        const response = await apiRequest("DELETE", `/api/clients/${clientId}`);
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || "Failed to delete client");
        }
        return { success: true };
      },
      onSuccess: async () => {
        await refetchClients();
        toast({
          title: "Success", 
          description: "Client deleted successfully",
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

    const handleEditClick = (client: Client, field: string) => {
      setEditingCell({ id: client.id, field });
      setEditValue(client[field as keyof Client]?.toString() || '');
    };

    const handleEditSave = async (client: Client) => {
      if (!editingCell) return;

      try {
        const response = await apiRequest("PATCH", `/api/clients/${client.id}`, {
          [editingCell.field]: editValue
        });
        if (!response.ok) throw new Error("Failed to update client");
        await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        await refetch();
      } catch (error) {
        console.error("Error updating client:", error);
        toast({
          title: "Error",
          description: "Failed to update client",
          variant: "destructive",
        });
      }
      setEditingCell(null);
    };

    return (
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
                <TableHead className="py-3 font-semibold">Labels</TableHead>
                <TableHead className="py-3 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, index) => (
                <TableRow 
                  key={client.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  {['lastName', 'firstName', 'email', 'address', 'phone', 'labels'].map((field) => (
                    <TableCell 
                      key={field}
                      className="py-3 group relative"
                    >
                      {editingCell?.id === client.id && editingCell.field === field ? (
                        <Input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleEditSave(client)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(client);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                        />
                      ) : (
                        <div 
                          className="min-h-[24px] hover:bg-accent/50 rounded px-2 py-1 cursor-pointer"
                          onClick={() => field === 'lastName' || field === 'firstName' ? 
                            setLocation(`/clients/${client.id}`) : 
                            handleEditClick(client, field)
                          }
                          onMouseEnter={(e) => {
                            if (field === 'lastName' || field === 'firstName') {
                              e.currentTarget.title = "Click to view details, hover to edit";
                            }
                          }}
                        >
                          {field === 'labels' ? (
                            <div className="flex flex-wrap gap-1">
                              {client.labels && Array.isArray(client.labels) && client.labels.map((label, index) => {
                                const colors = [
                                  'bg-blue-100 text-blue-800',
                                  'bg-green-100 text-green-800',
                                  'bg-purple-100 text-purple-800',
                                  'bg-yellow-100 text-yellow-800',
                                  'bg-pink-100 text-pink-800',
                                  'bg-indigo-100 text-indigo-800'
                                ];
                                const colorIndex = Math.abs(label.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
                                return (
                                  <span
                                    key={index}
                                    className={`px-2 py-1 rounded-full text-xs ${colors[colorIndex]} dark:bg-opacity-20`}
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <>
                              {client[field as keyof Client]?.toString() || ''}
                              {(field === 'lastName' || field === 'firstName') && (
                                <button
                                  className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(client, field);
                                  }}
                                >
                                  ✎
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientToDelete(client.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <AlertDialog open={clientToDelete !== null} onOpenChange={() => setClientToDelete(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Client</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you would like to remove this client? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (clientToDelete) {
                          deleteClientMutation.mutate(clientToDelete);
                          setClientToDelete(null);
                        }
                      }}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
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
  };

  return (
    <main className="w-screen lg:max-w-[calc(100vw-230px)] md:max-w-[calc(100vw-230px)] sm:max-w-[calc(100vw-70px)] xs:max-w-[calc(100vw-10px)] max-w-full w-full ml-[5px] relative container mx-auto px-4 py-8">
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
                      <FormField
                        control={form.control}
                        name="labels"
                        render={({ field }) => {
                          // Get unique existing labels from all clients
                          const existingLabels = Array.from(new Set(
                            clients.flatMap(client => client.labels || [])
                          ));

                          return (
                            <FormItem>
                              <FormLabel>Labels</FormLabel>
                              <div className="space-y-2">
                                {existingLabels.length > 0 && (
                                  <select
                                    className="w-full h-9 px-3 rounded-md border bg-background"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value && !field.value?.includes(value)) {
                                        field.onChange([...(field.value || []), value]);
                                      }
                                    }}
                                  >
                                    <option value="">Select existing label</option>
                                    {existingLabels.map((label) => (
                                      <option key={label} value={label}>
                                        {label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Add new label"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const value = e.currentTarget.value.trim();
                                        if (value && !field.value?.includes(value)) {
                                          field.onChange([...(field.value || []), value]);
                                          e.currentTarget.value = '';
                                        }
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="flex flex-wrap gap-2">
                                  {field.value?.map((label: string) => (
                                    <span
                                      key={label}
                                      className="px-2 py-1 bg-primary/10 rounded-full text-sm flex items-center gap-1"
                                    >
                                      {label}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          field.onChange(field.value.filter((l: string) => l !== label));
                                        }}
                                        className="hover:text-destructive"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
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