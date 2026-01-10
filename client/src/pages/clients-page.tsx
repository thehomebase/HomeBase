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
import { Plus, Mail, Phone, ChevronUp, ChevronDown, MapPin, Trash2, Search, Filter, Check, Upload, FileSpreadsheet, Info, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

const isAddressMappable = (client: Client): boolean => {
  const street = client.street?.trim() || '';
  const hasCity = client.city && client.city.trim().length > 0;
  const hasZip = client.zipCode && client.zipCode.trim().length > 0;
  
  // Street must have both numbers and letters to be a valid address
  // e.g., "123 Main St" is valid, but "123" or "Main St" alone are not ideal
  const hasNumbers = /\d/.test(street);
  const hasLetters = /[a-zA-Z]/.test(street);
  const isValidStreet = street.length > 0 && hasNumbers && hasLetters;
  
  return isValidStreet && (hasCity || hasZip);
};

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
            <h3 className="font-medium flex items-center gap-1">
              {client.firstName} {client.lastName}
              {!isAddressMappable(client) && (
                <span title="Address incomplete - cannot be mapped">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </span>
              )}
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
              <span className="text-sm">
                {client.street || client.city || client.zipCode 
                  ? `${client.street || ''}${client.city ? `, ${client.city}` : ''}${client.zipCode ? ` ${client.zipCode}` : ''}`
                  : 'No address'}
              </span>
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
                <Label>Street Address</Label>
                <Input
                  value={editingClient.street || ''}
                  onChange={(e) => handleUpdate('street', e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={editingClient.city || ''}
                    onChange={(e) => handleUpdate('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zip Code</Label>
                  <Input
                    value={editingClient.zipCode || ''}
                    onChange={(e) => handleUpdate('zipCode', e.target.value)}
                  />
                </div>
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
                <Label>Type (select all that apply)</Label>
                <div className="flex flex-col gap-2">
                  {['seller', 'buyer', 'renter'].map((typeOption) => {
                    const types = Array.isArray(editingClient.type) ? editingClient.type : [editingClient.type];
                    const isChecked = types.includes(typeOption);
                    return (
                      <label key={typeOption} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const currentTypes = Array.isArray(editingClient.type) ? editingClient.type : [editingClient.type];
                            let newTypes: string[];
                            if (e.target.checked) {
                              newTypes = [...currentTypes, typeOption];
                            } else {
                              newTypes = currentTypes.filter(t => t !== typeOption);
                              if (newTypes.length === 0) {
                                return;
                              }
                            }
                            handleUpdate('type', newTypes);
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm capitalize">{typeOption}</span>
                      </label>
                    );
                  })}
                </div>
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
      <div className="hidden md:block w-full min-w-0">
        <Table className="w-full table-auto">
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
              <TableHead className="cursor-pointer py-3 font-semibold" onClick={() => requestSort('street')}>
                <div className="flex items-center gap-1">
                  Street {getSortIcon('street')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer py-3 font-semibold" onClick={() => requestSort('city')}>
                <div className="flex items-center gap-1">
                  City {getSortIcon('city')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer py-3 font-semibold" onClick={() => requestSort('zipCode')}>
                <div className="flex items-center gap-1">
                  Zip {getSortIcon('zipCode')}
                </div>
              </TableHead>
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
                <TableCell className="py-3">
                  <div className="flex items-center gap-1">
                    {client.lastName}
                    {!isAddressMappable(client) && (
                      <span title="Address incomplete - cannot be mapped">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3">{client.firstName}</TableCell>
                <TableCell className="py-3">{client.email}</TableCell>
                <TableCell className="py-3">{client.street || '-'}</TableCell>
                <TableCell className="py-3">{client.city || '-'}</TableCell>
                <TableCell className="py-3">{client.zipCode || '-'}</TableCell>
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
                <TableCell colSpan={9} className="text-center text-muted-foreground">
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
  selectedLabels,
  onUpdate,
  onDelete
}: {
  clients: Client[];
  searchQuery: string;
  selectedLabels: string[];
  onUpdate: (client: Client) => Promise<void>;
  onDelete: (clientId: number) => void;
}) => {
  const filterClients = (clients: Client[]) => {
    return clients.filter(client => {
      const matchesSearch = searchQuery === '' || 
        client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.street?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.zipCode?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLabels = selectedLabels.length === 0 || 
        selectedLabels.some(label => (client.labels || []).includes(label));
      
      return matchesSearch && matchesLabels;
    });
  };

  const getClientTypes = (client: Client) => {
    return Array.isArray(client.type) ? client.type : [client.type];
  };

  const sellers = filterClients(clients.filter(client => getClientTypes(client).includes('seller')));
  const buyers = filterClients(clients.filter(client => getClientTypes(client).includes('buyer')));
  const renters = filterClients(clients.filter(client => getClientTypes(client).includes('renter')));

  return (
    <Tabs defaultValue="sellers" className="p-6">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="sellers">Sellers</TabsTrigger>
        <TabsTrigger value="buyers">Buyers</TabsTrigger>
        <TabsTrigger value="renters">Renters</TabsTrigger>
      </TabsList>
      <TabsContent value="sellers">
        <TableContent clients={sellers} onUpdate={onUpdate} onDelete={onDelete} />
      </TabsContent>
      <TabsContent value="buyers">
        <TableContent clients={buyers} onUpdate={onUpdate} onDelete={onDelete} />
      </TabsContent>
      <TabsContent value="renters">
        <TableContent clients={renters} onUpdate={onUpdate} onDelete={onDelete} />
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
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [labelFilterOpen, setLabelFilterOpen] = useState(false);

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

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: null,
      phone: null,
      mobilePhone: null,
      address: "",
      street: "",
      city: "",
      zipCode: "",
      type: ["seller"],
      status: "active",
      notes: "",
      agentId: user?.id || 0,
      labels: [],
    },
  });

  useEffect(() => {
    if (user?.id) {
      form.setValue("agentId", user.id);
    }
  }, [user?.id, form]);

  const onSubmit = async (data: InsertClient) => {
    console.log("Form submitted with data:", data);
    if (!user?.id) {
      console.log("No user ID, returning early");
      return;
    }

    try {
      const cleanedLabels = data.labels ?
        (Array.isArray(data.labels) ? data.labels : [data.labels])
          .filter(label => typeof label === 'string' && label.trim().length > 0) :
        [];

      const cleanedData = {
        ...data,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        mobilePhone: data.mobilePhone?.trim() || null,
        labels: cleanedLabels,
        agentId: user.id
      };
      console.log("Submitting cleaned data:", cleanedData);
      await createClientMutation.mutateAsync(cleanedData);
      form.reset();
    } catch (error) {
      console.error("Create client error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create client",
        variant: "destructive",
      });
    }
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportClients = async () => {
    if (!importFile) return;
    
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsImportDialogOpen(false);
      setImportFile(null);
      
      toast({
        title: "Import Complete",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import clients",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });

  const allLabels = Array.from(
    new Set(clients.flatMap(client => client.labels || []))
  ).sort();

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

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
      setIsDialogOpen(false);
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
    <main className="flex-1 min-w-0 px-4">
      <div className="w-full flex flex-wrap bg-background relative px-2 py-8">
        <div className="flex flex-col sm:flex-row w-full sm:items-center justify-between gap-2 mb-2">
          <h2 className="text-2xl font-bold dark:text-white">Client Management</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sm:w-60 md:w-80"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Labels
                  {selectedLabels.length > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                      {selectedLabels.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {allLabels.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No labels available
                  </DropdownMenuItem>
                ) : (
                  <>
                    {allLabels.map((label, index) => (
                      <DropdownMenuItem
                        key={label}
                        onClick={() => toggleLabel(label)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                            selectedLabels.includes(label) ? 'bg-primary border-primary' : 'border-gray-300'
                          }`}>
                            {selectedLabels.includes(label) && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getLabelColor(label, index)}`}>
                            {label}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {selectedLabels.length > 0 && (
                      <DropdownMenuItem
                        onClick={() => setSelectedLabels([])}
                        className="cursor-pointer text-muted-foreground border-t mt-1 pt-2"
                      >
                        Clear all filters
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {user?.role === "agent" && (
              <>
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="whitespace-nowrap font-bold">
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Import Clients from Spreadsheet</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800 dark:text-blue-200">
                            <p className="font-medium mb-2">Spreadsheet Format Instructions:</p>
                            <p className="mb-2">Your Excel file (.xlsx) or CSV should have these column headers:</p>
                            <ul className="list-disc ml-4 space-y-1">
                              <li><strong>First Name</strong> (required)</li>
                              <li><strong>Last Name</strong> (required)</li>
                              <li><strong>Email</strong></li>
                              <li><strong>Phone</strong></li>
                              <li><strong>Mobile</strong></li>
                              <li><strong>Street</strong> (street address)</li>
                              <li><strong>City</strong></li>
                              <li><strong>Zip Code</strong></li>
                              <li><strong>Type</strong> (seller, buyer, renter - comma-separated for multiple)</li>
                              <li><strong>Labels</strong> (comma-separated, e.g. "VIP, First-time buyer")</li>
                              <li><strong>Notes</strong></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                        <FileSpreadsheet className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="import-file"
                        />
                        <label htmlFor="import-file" className="cursor-pointer">
                          <span className="text-primary hover:underline font-medium">
                            Click to select a file
                          </span>
                          <p className="text-sm text-muted-foreground mt-1">
                            Excel (.xlsx, .xls) or CSV files supported
                          </p>
                        </label>
                        {importFile && (
                          <p className="mt-3 text-sm font-medium text-green-600 dark:text-green-400">
                            Selected: {importFile.name}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                          setIsImportDialogOpen(false);
                          setImportFile(null);
                        }}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleImportClients} 
                          disabled={!importFile || isImporting}
                          className="font-bold"
                        >
                          {isImporting ? "Importing..." : "Import Clients"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="whitespace-nowrap font-bold">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.log("Form validation errors:", errors))} className="space-y-4">
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
                              <Input type="email" {...field} value={field.value ?? ""} />
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
                              <Input type="tel" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} placeholder="123 Main St" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip Code</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type (select all that apply)</FormLabel>
                            <FormControl>
                              <div className="flex flex-col gap-2">
                                {(['seller', 'buyer', 'renter'] as const).map((typeOption) => {
                                  const types = Array.isArray(field.value) ? field.value : [field.value];
                                  const isChecked = types.includes(typeOption);
                                  return (
                                    <label key={typeOption} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const currentTypes = Array.isArray(field.value) ? field.value : [field.value];
                                          let newTypes: string[];
                                          if (e.target.checked) {
                                            newTypes = [...currentTypes, typeOption];
                                          } else {
                                            newTypes = currentTypes.filter(t => t !== typeOption);
                                            if (newTypes.length === 0) {
                                              return;
                                            }
                                          }
                                          field.onChange(newTypes);
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      <span className="text-sm capitalize">{typeOption}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="labels"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Labels</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {(field.value || []).map((label: string, index: number) => (
                                    <span
                                      key={`${label}-${index}`}
                                      className={`${getLabelColor(label, index)} inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium group`}
                                    >
                                      {label}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newLabels = (field.value || []).filter((_: string, i: number) => i !== index);
                                          field.onChange(newLabels);
                                        }}
                                        className="hover:text-destructive"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                                <Input
                                  placeholder="Type label and press Enter..."
                                  className="w-full"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const input = e.target as HTMLInputElement;
                                      const newLabel = input.value.trim();
                                      if (newLabel && !(field.value || []).includes(newLabel)) {
                                        field.onChange([...(field.value || []), newLabel]);
                                        input.value = '';
                                      }
                                    }
                                  }}
                                />
                              </div>
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
                              <textarea {...field} value={field.value ?? ""} className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createClientMutation.isPending} className="font-bold">
                        {createClientMutation.isPending ? "Creating..." : "Add Client"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Removed duplicate "Add Client" button */}

      </div>

      <Card className="w-full min-w-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <ClientTable
            clients={clients}
            searchQuery={searchQuery}
            selectedLabels={selectedLabels}
            onUpdate={handleClientUpdate}
            onDelete={setClientToDelete}
          />
        </div>
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