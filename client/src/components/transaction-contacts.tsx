import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface Contact {
  id?: number;
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  mobilePhone: string;
  email: string;
  transactionId: number;
}

const CONTACT_ROLES = [
  "Buyer",
  "Seller",
  "Listing Agent",
  "Buyer Agent",
  "Lender",
  "Escrow Officer",
  "Home Inspector",
  "Transaction Coordinator"
];

interface TransactionContactsProps {
  transactionId: number;
}

export function TransactionContacts({ transactionId }: TransactionContactsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newContact, setNewContact] = React.useState<Partial<Contact>>({
    role: "",
    firstName: "",
    lastName: "",
    phone: "",
    mobilePhone: "",
    email: "",
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["/api/contacts", transactionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/contacts/${transactionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      return response.json() as Promise<Contact[]>;
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (contact: Omit<Contact, "id">) => {
      const response = await apiRequest("POST", "/api/contacts", contact);
      if (!response.ok) {
        throw new Error("Failed to add contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", transactionId] });
      setNewContact({
        role: "",
        firstName: "",
        lastName: "",
        phone: "",
        mobilePhone: "",
        email: "",
      });
      toast({
        title: "Contact added",
        description: "The contact has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add contact",
        variant: "destructive",
      });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async (contact: Contact) => {
      const response = await apiRequest("PATCH", `/api/contacts/${contact.id}`, contact);
      if (!response.ok) {
        throw new Error("Failed to update contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", transactionId] });
      toast({
        title: "Contact updated",
        description: "The contact has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update contact",
        variant: "destructive",
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const response = await apiRequest("DELETE", `/api/contacts/${contactId}`);
      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", transactionId] });
      toast({
        title: "Contact deleted",
        description: "The contact has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete contact",
        variant: "destructive",
      });
    },
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.role || !newContact.firstName || !newContact.lastName || !newContact.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    addContactMutation.mutate({ ...newContact, transactionId } as Contact);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddContact} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                className="w-full px-3 py-2 border rounded-md"
                value={newContact.role}
                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                required
              >
                <option value="">Select a role</option>
                {CONTACT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={newContact.firstName}
                onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={newContact.lastName}
                onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobilePhone">Mobile Phone</Label>
              <Input
                id="mobilePhone"
                type="tel"
                value={newContact.mobilePhone}
                onChange={(e) => setNewContact({ ...newContact, mobilePhone: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" disabled={addContactMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {contacts.map((contact) => (
          <Card key={contact.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium">{contact.role}</h3>
                  <p className="text-sm text-muted-foreground">
                    {contact.firstName} {contact.lastName}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => contact.id && deleteContactMutation.mutate(contact.id)}
                  disabled={deleteContactMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{contact.email}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm">{contact.phone || "Not provided"}</p>
                </div>
                <div>
                  <Label>Mobile Phone</Label>
                  <p className="text-sm">{contact.mobilePhone || "Not provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
