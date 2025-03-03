import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddingContact, setIsAddingContact] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null);
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
      return response.json();
    },
  });

  const queryClient = useQueryClient();
  const addContactMutation = useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const contactData = {
        ...data,
        transactionId,
      };
      const response = await apiRequest("POST", "/api/contacts", contactData);
      if (!response.ok) {
        throw new Error("Failed to add contact");
      }
      return response.json();
    },
    onSuccess: () => {
      setNewContact({
        role: "",
        firstName: "",
        lastName: "",
        phone: "",
        mobilePhone: "",
        email: "",
      });
      setIsAddingContact(false);
      queryClient.invalidateQueries(["/api/contacts", transactionId]);
      toast({
        title: "Success",
        description: "Contact added successfully",
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
    mutationFn: async (data: Contact) => {
      const response = await apiRequest("PATCH", `/api/contacts/${data.id}`, data);
      if (!response.ok) {
        throw new Error("Failed to update contact");
      }
      return response.json();
    },
    onSuccess: () => {
      setEditingContact(null);
      queryClient.invalidateQueries(["/api/contacts", transactionId]);
      toast({
        title: "Success",
        description: "Contact updated successfully",
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
      toast({
        title: "Success",
        description: "Contact deleted successfully",
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

  const handleSubmit = () => {
    if (!newContact.role || !newContact.firstName || !newContact.lastName || !newContact.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addContactMutation.mutate(newContact);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Card className="flex">
      <CardContent className="w-screen">
        <div className="hidden sm:block"> {/* Desktop View */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsAddingContact(true)}
                  disabled={isAddingContact}
                  className="bg-black hover:bg-black/90 "
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAddingContact && (
              <TableRow>
                <TableCell>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={newContact.role}
                    onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                    required
                  >
                    <option value="">Select role</option>
                    {CONTACT_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="First Name"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Last Name"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="tel"
                    placeholder="Phone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="tel"
                    placeholder="Mobile"
                    value={newContact.mobilePhone}
                    onChange={(e) => setNewContact({ ...newContact, mobilePhone: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSubmit}
                      disabled={addContactMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAddingContact(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {contacts.map((contact: Contact) => (
              <TableRow key={contact.id}>
                {editingContact?.id === contact.id ? (
                  <>
                    <TableCell>
                      <select
                        className="w-full px-3 py-2 border rounded-md bg-background"
                        value={editingContact.role}
                        onChange={(e) => setEditingContact({ ...editingContact, role: e.target.value })}
                      >
                        {CONTACT_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingContact.firstName}
                        onChange={(e) => setEditingContact({ ...editingContact, firstName: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingContact.lastName}
                        onChange={(e) => setEditingContact({ ...editingContact, lastName: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingContact.email}
                        onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingContact.phone || ""}
                        onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingContact.mobilePhone || ""}
                        onChange={(e) => setEditingContact({ ...editingContact, mobilePhone: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateContactMutation.mutate(editingContact)}
                          disabled={updateContactMutation.isPending}
                        >
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingContact(null)}
                        >
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{contact.role}</TableCell>
                    <TableCell>{contact.firstName}</TableCell>
                    <TableCell>{contact.lastName}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone || "N/A"}</TableCell>
                    <TableCell>{contact.mobilePhone || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {user?.role === 'agent' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingContact(contact)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => contact.id && deleteContactMutation.mutate(contact.id)}
                          disabled={deleteContactMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            {contacts.length === 0 && !isAddingContact && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No contacts added yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        {/* Mobile View */}
        <div className="block sm:hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-semibold">Contacts</h3>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddingContact(true)}
              disabled={isAddingContact}
              className="bg-black hover:bg-black/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
          {isAddingContact && (
            <div className="p-4 space-y-4 border-b">
              <select
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={newContact.role}
                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                required
              >
                <option value="">Select role</option>
                {CONTACT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <Input
                placeholder="First Name"
                value={newContact.firstName}
                onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                className="mt-2"
              />
              <Input
                placeholder="Last Name"
                value={newContact.lastName}
                onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                className="mt-2"
              />
              <Input
                type="email"
                placeholder="Email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="mt-2"
              />
              <Input
                type="tel"
                placeholder="Phone"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="mt-2"
              />
              <Input
                type="tel"
                placeholder="Mobile"
                value={newContact.mobilePhone}
                onChange={(e) => setNewContact({ ...newContact, mobilePhone: e.target.value })}
                className="mt-2"
              />
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="default"
                  onClick={handleSubmit}
                  disabled={addContactMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsAddingContact(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <div className="divide-y">
            {contacts.map((contact: Contact) => (
              <div key={contact.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{contact.role}</div>
                    <div>{contact.firstName} {contact.lastName}</div>
                  </div>
                  <div className="flex gap-2">
                    {user?.role === 'agent' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingContact(contact)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => contact.id && deleteContactMutation.mutate(contact.id)}
                      disabled={deleteContactMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground ">
                  <div>{contact.email}</div>
                  {contact.phone && <div>Phone: {contact.phone}</div>}
                  {contact.mobilePhone && <div>Mobile: {contact.mobilePhone}</div>}
                </div>
              </div>
            ))}
            {contacts.length === 0 && !isAddingContact && (
              <div className="p-4 text-center text-muted-foreground">
                No contacts added yet
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}