import { useAuth } from "../hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client, type InsertClient } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Mail, Phone, ChevronUp, ChevronDown, MapPin, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pencil, X } from "lucide-react";


type SortConfig = {
  key: keyof Client;
  direction: 'asc' | 'desc';
} | null;

const ClientCard = ({ client, onSelect, onEdit }: { 
  client: Client; 
  onSelect: (client: Client) => void;
  onEdit: (client: Client) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="mb-2 relative">
      <div 
        className="p-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-medium">
              {client.firstName} {client.lastName}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(client);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(client);
            }}
          >
            <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>
      {isExpanded && (
        <CardContent className="pt-0 pb-3 border-t">
          <div className="space-y-2 mt-2">
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
            <div className="text-xs text-muted-foreground">
              Added {format(new Date(client.createdAt), 'MMM d, yyyy')}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const ClientDetailsSheet = ({ 
  client, 
  isOpen, 
  onClose 
}: { 
  client: Client | null; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const updateClientMutation = useMutation({
    mutationFn: async (updatedClient: Partial<Client>) => {
      const response = await fetch(`/api/clients/${client?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedClient),
      });
      if (!response.ok) throw new Error('Failed to update client');
      return response.json();
    },
  });

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Client Details</SheetTitle>
        </SheetHeader>
        {client && (
          <div className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Contact Information</h3>
              <div className="space-y-2">
                <p className="text-sm">Email: {client.email}</p>
                <p className="text-sm">Phone: {client.phone}</p>
                <p className="text-sm">Address: {client.address}</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Additional Details</h3>
              <div className="space-y-2">
                <p className="text-sm">Type: {client.type}</p>
                <p className="text-sm">Status: {client.status}</p>
                <p className="text-sm">Labels: {client.labels?.join(', ')}</p>
              </div>
            </div>
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [, navigate] = useLocation();
  const [location, setLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const form = useForm<InsertClient & { labelColors: Record<string, string> }>({
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
      labelColors: {},
    },
  });

  const onSubmit = async (data: InsertClient) => {
    if (!user?.id) return;

    try {
      // Ensure labels is an array of strings
      const cleanedLabels = data.labels ? 
        (Array.isArray(data.labels) ? data.labels : [data.labels])
          .filter(label => typeof label === 'string' && label.trim().length > 0) : 
        [];

      const cleanedData = {
        ...data,
        labels: cleanedLabels,
        agentId: user.id
      };
      await createClientMutation.mutateAsync(cleanedData);
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

  const sellers = sortData(filterClients(clients.filter(client => client.type === 'seller')), sortConfig);
  const buyers = sortData(filterClients(clients.filter(client => client.type === 'buyer')), sortConfig);

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
                  <TableCell className="py-3">{client.lastName}</TableCell>
                  <TableCell className="py-3">{client.firstName}</TableCell>
                  <TableCell className="py-3">{client.email}</TableCell>
                  <TableCell className="py-3">{client.address}</TableCell>
                  <TableCell className="py-3">{client.phone}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {(client.labels || []).map((label, index) => {
                        const colorClass = getLabelColor(label, index);
                        return (
                          <span
                            key={`${client.id}-${label}-${index}`}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setClientToDelete(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
              <ClientCard 
                key={client.id} 
                client={client} 
                onSelect={(client) => setSelectedClient(client)} 
                onEdit={(client) => setEditingClient(client)}
              />
            ))
          )}
        </div>
        <ClientDetailsSheet
          client={selectedClient}
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
        />
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
        <AlertDialog 
          open={editingClient !== null} 
          onOpenChange={() => setEditingClient(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Client</AlertDialogTitle>
              <AlertDialogDescription>
                Update client information
              </AlertDialogDescription>
            </AlertDialogHeader>
            {editingClient && (
              <div className="space-y-4">
                <Input
                  placeholder="First Name"
                  defaultValue={editingClient.firstName}
                  onChange={(e) => {
                    setEditingClient({
                      ...editingClient,
                      firstName: e.target.value
                    });
                  }}
                />
                <Input
                  placeholder="Last Name"
                  defaultValue={editingClient.lastName}
                  onChange={(e) => {
                    setEditingClient({
                      ...editingClient,
                      lastName: e.target.value
                    });
                  }}
                />
                <Input
                  placeholder="Email"
                  defaultValue={editingClient.email}
                  onChange={(e) => {
                    setEditingClient({
                      ...editingClient,
                      email: e.target.value
                    });
                  }}
                />
                <Input
                  placeholder="Phone"
                  defaultValue={editingClient.phone}
                  onChange={(e) => {
                    setEditingClient({
                      ...editingClient,
                      phone: e.target.value
                    });
                  }}
                />
                <Input
                  placeholder="Address"
                  defaultValue={editingClient.address}
                  onChange={(e) => {
                    setEditingClient({
                      ...editingClient,
                      address: e.target.value
                    });
                  }}
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (editingClient) {
                    try {
                      const response = await fetch(`/api/clients/${editingClient.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(editingClient),
                      });

                      if (!response.ok) {
                        throw new Error('Failed to update client');
                      }

                      await refetchClients();
                      setEditingClient(null);

                      toast({
                        title: "Success",
                        description: "Client updated successfully",
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to update client",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  const getLabelColor = (label: string, index: number) => {
    const allColors = [
      'bg-blue-100 text-blue-800 border border-blue-200',
      'bg-red-100 text-red-800 border border-red-200',
      'bg-green-100 text-green-800 border border-green-200',
      'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'bg-purple-100 text-purple-800 border border-purple-200',
      'bg-pink-100 text-pink-800 border border-pink-200',
      'bg-orange-100 text-orange-800 border border-orange-200',
      'bg-indigo-100 text-indigo-800 border border-indigo-200'
    ];
    return allColors[index % allColors.length];
  };

  const prepareLabels = (labels: string[]): string[] => {
    return labels;
  };

  const filterClients = (clients: Client[]) => {
    return clients.filter(client => 
      client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Client Management</h2>
        {user?.role === "agent" && (
          <Button onClick={() => navigate("/clients/new")}>Add Client</Button>
        )}
      </div>

      <Input
        type="text"
        placeholder="Search clients..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full md:w-96 mb-4"
      />
      <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />


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