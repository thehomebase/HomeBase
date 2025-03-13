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

import { useAuth } from "@/hooks/use-auth";
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
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Pencil, X, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


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
            <ChevronRight className="h-5 w-5" />
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

const ClientDetailsPanel = ({
  client,
  isOpen,
  onClose,
  onUpdate
}: {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedClient: Client) => Promise<void>;
}) => {
  const [editingClient, setEditingClient] = useState<Client | null>(client);
  const { toast } = useToast();
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    setEditingClient(client);
  }, [client]);

  if (!editingClient) return null;

  const handleUpdate = async (field: keyof Client, value: any) => {
    const updatedClient = { ...editingClient, [field]: value };
    setEditingClient(updatedClient);
    try {
      await onUpdate(updatedClient);
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
      // Revert the local state on error
      setEditingClient(client);
      throw error;
    }
  };

  const handleAddLabel = (label: string) => {
    if (label.trim()) {
      const newLabels = [...(editingClient.labels || []), label.trim()];
      handleUpdate('labels', newLabels);
      setNewLabel(""); // Clear input after adding
    }
  };

  const handleRemoveLabel = async (indexToRemove: number) => {
    if (!editingClient?.labels) return;
    try {
      // Create a new array without the removed label
      const newLabels = editingClient.labels.filter((_, i) => i !== indexToRemove);

      // Create updated client data, ensuring labels is always an array
      const updatedClient = {
        ...editingClient,
        labels: newLabels || [] // Ensure labels is never undefined
      };

      // Update the client
      await onUpdate(updatedClient);

      // Update local state
      setEditingClient(updatedClient);

      toast({
        title: "Success",
        description: "Label removed successfully"
      });
    } catch (error) {
      console.error("Error removing label:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove label",
        variant: "destructive",
      });
      // Revert local state on error
      setEditingClient(editingClient);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <SheetTitle>Client Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editingClient.firstName}
                  onChange={(e) => handleUpdate('firstName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editingClient.lastName}
                  onChange={(e) => handleUpdate('lastName', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Contact Information</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editingClient.email || ''}
                  onChange={(e) => handleUpdate('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={editingClient.phone || ''}
                  onChange={(e) => handleUpdate('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={editingClient.address || ''}
                  onChange={(e) => handleUpdate('address', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Labels with Animation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Labels</h3>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {(editingClient.labels || []).map((label, index) => (
                  <motion.span
                    key={`${label}-${index}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`${getLabelColor(label, index)} inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium group`}
                  >
                    {label}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemoveLabel(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </motion.button>
                  </motion.span>
                ))}
              </AnimatePresence>
              <Input
                placeholder="Add label..."
                className="w-32 h-6 text-xs"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLabel(newLabel);
                  }
                }}
              />
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Additional Details</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={editingClient.type}
                  onChange={(e) => handleUpdate('type', e.target.value)}
                >
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={editingClient.status}
                  onChange={(e) => handleUpdate('status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const TableContent = ({
  clients,
  onUpdate,
  onDelete
}: {
  clients: Client[];
  onUpdate: (client: Client) => Promise<void>;
  onDelete: (clientId: number) => void;
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [, navigate] = useLocation();

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
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                  index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                }`}
                onClick={() => setSelectedClient(client)}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(client.id);
                    }}
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
              onEdit={(client) => setSelectedClient(client)}
            />
          ))
        )}
      </div>

      {/* Client Details Panel */}
      <ClientDetailsPanel
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        onUpdate={onUpdate}
      />
    </>
  );
};

const ClientTable = ({
  clients,
  searchQuery,
  onUpdate,
  onDelete
}: {
  clients: Client[];
  searchQuery: string;
  onUpdate: (client: Client) => Promise<void>;
  onDelete: (clientId: number) => void;
}) => {
  const filterClients = (clients: Client[]) => {
    return clients.filter(client =>
      client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const sellers = filterClients(clients.filter(client => client.type === 'seller'));
  const buyers = filterClients(clients.filter(client => client.type === 'buyer'));

  return (
    <Tabs defaultValue="sellers" className="p-6">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="sellers">Sellers</TabsTrigger>
        <TabsTrigger value="buyers">Buyers</TabsTrigger>
      </TabsList>
      <TabsContent value="sellers">
        <TableContent clients={sellers} onUpdate={onUpdate} onDelete={onDelete} />
      </TabsContent>
      <TabsContent value="buyers">
        <TableContent clients={buyers} onUpdate={onUpdate} onDelete={onDelete} />
      </TabsContent>
    </Tabs>
  );
};

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);

  const handleClientUpdate = async (updatedClient: Client) => {
    try {
      // Ensure labels is always an array and contains only valid string values
      const sanitizedClient = {
        ...updatedClient,
        labels: (Array.isArray(updatedClient.labels) ? updatedClient.labels : [])
          .filter((label): label is string => 
            typeof label === 'string' && label.trim().length > 0
          )
      };

      const response = await apiRequest("PATCH", `/api/clients/${sanitizedClient.id}`, sanitizedClient);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update client");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    } catch (error) {
      console.error("Error updating client:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update client",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest("DELETE", `/api/clients/${clientId}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to delete client");
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
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

  return (
    <main className="flex-1 min-w-0 overflow-x-hidden px-4">
      <div className="sm:w-screen flex flex-wrap bg-background relative px-2 py-8">
        <div className="flex flex-col sm:flex-row flex-grow sm:items-center justify-between gap-2 mb-2">
          <h2 className="text-2xl font-bold dark:text-white">Client Management</h2>
          {user?.role === "agent" && (
            <Dialog>
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Form fields remain the same */}
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}

          <div className="relative sm:ml-auto md:max-w-md">
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:w-60 md:w-80"
            />
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {user?.role === "agent" && (
          <Dialog>
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <select {...field}>
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <select {...field}>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="inactive">Inactive</option>
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
                          <textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createClientMutation.isPending}>
                    {createClientMutation.isPending ? "Creating..." : "Add Client"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <ClientTable
          clients={clients}
          searchQuery={searchQuery}
          onUpdate={handleClientUpdate}
          onDelete={setClientToDelete}
        />
      </Card>
      <ClientDetailsPanel
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        onUpdate={handleClientUpdate}
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
    </main>
  );
}