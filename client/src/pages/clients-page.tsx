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
import { insertClientSchema, type Client, type InsertClient, type ClientInvitation } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Mail, Phone, ChevronUp, ChevronDown, MapPin, Trash2, Search, Filter, Check, Upload, FileSpreadsheet, Info, AlertTriangle, MessageSquare, Send, UserPlus, Clock, Heart, Link2, Unlink, Cake, CalendarHeart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Pencil, X, ChevronRight, GripVertical } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ClientContactDialog from "@/components/client-contact-dialog";


type SortConfig = {
  key: keyof Client;
  direction: 'asc' | 'desc';
} | null;

type ClientColumn = {
  id: string;
  title: string;
  key: keyof Client | 'actions';
  sortable: boolean;
};

const DEFAULT_COLUMNS: ClientColumn[] = [
  { id: 'lastName', title: 'Last Name', key: 'lastName', sortable: true },
  { id: 'firstName', title: 'First Name', key: 'firstName', sortable: true },
  { id: 'email', title: 'Email', key: 'email', sortable: false },
  { id: 'street', title: 'Street', key: 'street', sortable: true },
  { id: 'city', title: 'City', key: 'city', sortable: true },
  { id: 'zipCode', title: 'Zip', key: 'zipCode', sortable: true },
  { id: 'phone', title: 'Phone', key: 'phone', sortable: false },
  { id: 'labels', title: 'Labels', key: 'labels', sortable: false },
  { id: 'actions', title: 'Actions', key: 'actions', sortable: false },
];

type AddressValidation = {
  streetInvalid: boolean;
  locationMissing: boolean; // both city AND zip are missing
};

const getAddressValidation = (client: Client): AddressValidation => {
  const street = client.street?.trim() || '';
  const hasCity = client.city && client.city.trim().length > 0;
  const hasZip = client.zipCode && client.zipCode.trim().length > 0;
  
  // Street must have both numbers and letters to be a valid address
  const hasNumbers = /\d/.test(street);
  const hasLetters = /[a-zA-Z]/.test(street);
  const isValidStreet = street.length > 0 && hasNumbers && hasLetters;
  
  return {
    streetInvalid: !isValidStreet,
    locationMissing: !hasCity && !hasZip
  };
};

const isAddressMappable = (client: Client): boolean => {
  const validation = getAddressValidation(client);
  return !validation.streetInvalid && !validation.locationMissing;
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
              <span className="text-sm flex items-center gap-1">
                {client.street || client.city || client.zipCode ? (
                  <>
                    <span className="flex items-center gap-1">
                      {client.street || '-'}
                      {getAddressValidation(client).streetInvalid && (
                        <AlertTriangle className="h-3 w-3 text-amber-500" title="Street incomplete" />
                      )}
                    </span>
                    {client.city && `, ${client.city}`}
                    {client.zipCode && ` ${client.zipCode}`}
                    {getAddressValidation(client).locationMissing && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" title="City or zip required" />
                    )}
                  </>
                ) : (
                  <>No address <AlertTriangle className="h-3 w-3 text-amber-500" title="Address missing" /></>
                )}
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
  onUpdate,
  onContact,
  allClients
}: {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedClient: Client) => Promise<void>;
  onContact?: (client: Client) => void;
  allClients?: Client[];
}) => {
  const [editingClient, setEditingClient] = useState<Client | null>(client);
  const { toast } = useToast();
  const [newLabel, setNewLabel] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");

  const { data: linkedClient, refetch: refetchLinked } = useQuery<Client | null>({
    queryKey: ['/api/clients', editingClient?.id, 'linked'],
    queryFn: async () => {
      if (!editingClient?.linkedClientId) return null;
      const res = await fetch(`/api/clients/${editingClient.id}/linked`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!editingClient?.id && !!editingClient?.linkedClientId,
  });

  const linkMutation = useMutation({
    mutationFn: async (linkedClientId: number) => {
      const res = await apiRequest('POST', `/api/clients/${editingClient!.id}/link`, { linkedClientId });
      return { result: await res.json(), linkedClientId };
    },
    onSuccess: ({ linkedClientId }) => {
      toast({ title: "Success", description: "Clients linked successfully" });
      setShowLinkDialog(false);
      setEditingClient(prev => prev ? { ...prev, linkedClientId } : prev);
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      refetchLinked();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to link clients", variant: "destructive" });
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/clients/${editingClient!.id}/link`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Clients unlinked" });
      setEditingClient(prev => prev ? { ...prev, linkedClientId: null } : prev);
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to unlink clients", variant: "destructive" });
    }
  });

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

        {onContact && (
          <div className="mt-4 flex gap-2">
            <Button
              variant="default"
              className="flex-1 gap-2"
              onClick={() => onContact(editingClient)}
            >
              <MessageSquare className="h-4 w-4" />
              SMS
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onContact(editingClient)}
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>
        )}

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

          {/* Important Dates */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <CalendarHeart className="h-4 w-4" />
              Important Dates
            </h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Cake className="h-3 w-3" />
                  Birthday (MM-DD)
                </Label>
                <Input
                  placeholder="03-15"
                  value={editingClient.birthday || ''}
                  onChange={(e) => handleUpdate('birthday' as keyof Client, e.target.value || null)}
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  Anniversary (MM-DD)
                </Label>
                <Input
                  placeholder="06-20"
                  value={editingClient.anniversary || ''}
                  onChange={(e) => handleUpdate('anniversary' as keyof Client, e.target.value || null)}
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Linked Client (Spouse/Partner) */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Linked Client (Spouse/Partner)
            </h3>
            {linkedClient ? (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    {linkedClient.firstName} {linkedClient.lastName}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => unlinkMutation.mutate()}
                    disabled={unlinkMutation.isPending}
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    Unlink
                  </Button>
                </div>
                {linkedClient.email && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {linkedClient.email}
                  </div>
                )}
                {linkedClient.phone && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {linkedClient.phone}
                  </div>
                )}
              </div>
            ) : editingClient.linkedClientId ? (
              <p className="text-sm text-muted-foreground">Loading linked client...</p>
            ) : (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => { setShowLinkDialog(true); setLinkSearchQuery(""); }}
                >
                  <Link2 className="h-3 w-3" />
                  Link a Client
                </Button>
              </div>
            )}
          </div>

          {/* Link Client Dialog */}
          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Link Client (Spouse/Partner)</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Search clients..."
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {(allClients || [])
                    .filter(c =>
                      c.id !== editingClient.id &&
                      !c.linkedClientId &&
                      (linkSearchQuery === '' ||
                        `${c.firstName} ${c.lastName}`.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                    )
                    .map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm flex justify-between items-center"
                        onClick={() => linkMutation.mutate(c.id)}
                        disabled={linkMutation.isPending}
                      >
                        <span>{c.firstName} {c.lastName}</span>
                        {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                      </button>
                    ))}
                  {(allClients || []).filter(c => c.id !== editingClient.id && !c.linkedClientId).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No available clients to link</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const SortableHeader = ({ 
  column, 
  sortConfig, 
  onSort 
}: { 
  column: ClientColumn; 
  sortConfig: SortConfig;
  onSort: (key: keyof Client) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getSortIcon = () => {
    if (!sortConfig || sortConfig.key !== column.key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={`py-3 font-semibold ${column.sortable ? 'cursor-pointer' : ''}`}
      onClick={() => column.sortable && column.key !== 'actions' && onSort(column.key as keyof Client)}
    >
      <div className="flex items-center gap-1">
        <span {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </span>
        {column.title}
        {column.sortable && getSortIcon()}
      </div>
    </TableHead>
  );
};

const TableContent = ({
  clients,
  onUpdate,
  onDelete,
  onContact
}: {
  clients: Client[];
  onUpdate: (client: Client) => Promise<void>;
  onDelete: (clientId: number) => void;
  onContact?: (client: Client) => void;
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [columns, setColumns] = useState<ClientColumn[]>(DEFAULT_COLUMNS);
  const [, navigate] = useLocation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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
      return { key, direction: 'asc' };
    });
  };

  const renderCell = (client: Client, columnId: string) => {
    const validation = getAddressValidation(client);
    
    switch (columnId) {
      case 'lastName':
        return client.lastName;
      case 'firstName':
        return client.firstName;
      case 'email':
        return client.email;
      case 'street':
        return (
          <div className="flex items-center gap-1">
            {client.street || '-'}
            {validation.streetInvalid && (
              <span title="Street address incomplete - needs number and street name">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </span>
            )}
          </div>
        );
      case 'city':
        return (
          <div className="flex items-center gap-1">
            {client.city || '-'}
            {validation.locationMissing && (
              <span title="City or zip code required for mapping">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </span>
            )}
          </div>
        );
      case 'zipCode':
        return (
          <div className="flex items-center gap-1">
            {client.zipCode || '-'}
            {validation.locationMissing && (
              <span title="City or zip code required for mapping">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </span>
            )}
          </div>
        );
      case 'phone':
        return client.phone;
      case 'labels':
        return (
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
        );
      case 'actions':
        return (
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
        );
      default:
        return '-';
    }
  };

  return (
    <>
      {/* Desktop view - Table */}
      <div className="hidden md:block w-full min-w-0 overflow-x-auto">
        <Table className="w-full table-auto">
          <TableHeader>
            <TableRow className="bg-gray-100 dark:bg-gray-800">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={columns.map(col => col.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {columns.map((column) => (
                    <SortableHeader
                      key={column.id}
                      column={column}
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortData(clients, sortConfig).map((client, index) => (
              <TableRow
                key={client.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                  index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                }`}
                onClick={() => setSelectedClient(client)}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} className="py-3">
                    {renderCell(client, column.id)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
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
        onContact={onContact ? (client) => { setSelectedClient(null); onContact(client); } : undefined}
        allClients={clients}
      />
    </>
  );
};

const ClientTable = ({
  clients,
  searchQuery,
  selectedLabels,
  onUpdate,
  onDelete,
  onContact
}: {
  clients: Client[];
  searchQuery: string;
  selectedLabels: string[];
  onUpdate: (client: Client) => Promise<void>;
  onDelete: (clientId: number) => void;
  onContact?: (client: Client) => void;
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
        <TableContent clients={sellers} onUpdate={onUpdate} onDelete={onDelete} onContact={onContact} />
      </TabsContent>
      <TabsContent value="buyers">
        <TableContent clients={buyers} onUpdate={onUpdate} onDelete={onDelete} onContact={onContact} />
      </TabsContent>
      <TabsContent value="renters">
        <TableContent clients={renters} onUpdate={onUpdate} onDelete={onDelete} onContact={onContact} />
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
  const [contactClient, setContactClient] = useState<Client | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get("gmail");
    if (gmailParam === "connected") {
      toast({ title: "Gmail Connected", description: "Your Gmail account has been linked successfully." });
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["/api/communications/status"] });
    } else if (gmailParam === "error") {
      toast({ title: "Gmail Connection Failed", description: "There was an issue connecting your Gmail. Please try again.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteClientRecordId, setInviteClientRecordId] = useState<number | null>(null);

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

  const { data: invitations = [] } = useQuery<ClientInvitation[]>({
    queryKey: ["/api/client-invitations"],
    enabled: !!user && (user.role === "agent" || user.role === "broker"),
  });

  const inviteClientMutation = useMutation({
    mutationFn: async (data: { email: string; firstName?: string; lastName?: string; clientRecordId?: number | null }) => {
      const response = await apiRequest("POST", "/api/client-invitations", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invitation");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-invitations"] });
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInviteClientRecordId(null);
      toast({
        title: "Invitation Sent",
        description: "Client invitation has been created successfully.",
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

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteClientMutation.mutate({
      email: inviteEmail.trim(),
      firstName: inviteFirstName.trim() || undefined,
      lastName: inviteLastName.trim() || undefined,
      clientRecordId: inviteClientRecordId,
    });
  };

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
    <main className="flex-1 min-w-0 px-4 overflow-x-hidden">
      <div className="w-full flex flex-wrap bg-background relative px-2 py-8">
        <div className="flex flex-col sm:flex-row w-full sm:items-center justify-between gap-2 mb-2">
          <h2 className="text-2xl font-bold dark:text-white">Client Management</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative flex-1 min-w-[140px] sm:flex-none">
              <Input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 md:w-80 pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
            {(user?.role === "agent" || user?.role === "broker") && (
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
                
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="whitespace-nowrap font-bold">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Invite Client to HomeBase</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Send an invitation to a client so they can create an account and link to you as their agent.
                      </p>
                      <div className="space-y-2">
                        <Label>Email Address *</Label>
                        <Input
                          type="email"
                          placeholder="client@email.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>First Name</Label>
                          <Input
                            placeholder="John"
                            value={inviteFirstName}
                            onChange={(e) => setInviteFirstName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input
                            placeholder="Doe"
                            value={inviteLastName}
                            onChange={(e) => setInviteLastName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Link to Existing Client Record</Label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={inviteClientRecordId ?? ""}
                          onChange={(e) => setInviteClientRecordId(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">None (create link later)</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.email ? ` (${c.email})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSendInvite}
                          disabled={!inviteEmail.trim() || inviteClientMutation.isPending}
                          className="font-bold"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {inviteClientMutation.isPending ? "Sending..." : "Send Invitation"}
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
                <DialogContent className="max-h-[90vh] overflow-y-auto">
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

      {(user?.role === "agent" || user?.role === "broker") && invitations.length > 0 && (
        <Card className="w-full mb-4">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Client Invitations ({invitations.filter(i => i.status === 'pending').length} pending)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="space-y-2">
              {invitations.slice(0, 5).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{inv.firstName && inv.lastName ? `${inv.firstName} ${inv.lastName}` : inv.email}</span>
                      {inv.firstName && inv.lastName && <span className="text-muted-foreground ml-2">({inv.email})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      inv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      inv.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {inv.status}
                    </span>
                    {inv.status === 'pending' && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {format(new Date(inv.expiresAt), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="w-full min-w-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <ClientTable
            clients={clients}
            searchQuery={searchQuery}
            selectedLabels={selectedLabels}
            onUpdate={handleClientUpdate}
            onDelete={setClientToDelete}
            onContact={(client) => { setContactClient(client); }}
          />
        </div>
      </Card>
      <ClientDetailsPanel
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        onUpdate={handleClientUpdate}
        onContact={(client) => { setSelectedClient(null); setContactClient(client); }}
        allClients={clients}
      />
      <ClientContactDialog
        client={contactClient}
        open={!!contactClient}
        onOpenChange={(open) => { if (!open) setContactClient(null); }}
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