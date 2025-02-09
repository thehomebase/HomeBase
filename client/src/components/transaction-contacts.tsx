import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Check, X } from "lucide-react";
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
  const { toast } = useToast();
  const [isAddingContact, setIsAddingContact] = React.useState(false);
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
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingContact(true)}
                  disabled={isAddingContact}
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
                <TableCell className="space-x-2">
                  <Input
                    placeholder="First Name"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                    className="w-[120px] inline-block"
                  />
                  <Input
                    placeholder="Last Name"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                    className="w-[120px] inline-block"
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
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>{contact.role}</TableCell>
                <TableCell>{`${contact.firstName} ${contact.lastName}`}</TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell>{contact.phone || "N/A"}</TableCell>
                <TableCell>{contact.mobilePhone || "N/A"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => contact.id && deleteContactMutation.mutate(contact.id)}
                    disabled={deleteContactMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {contacts.length === 0 && !isAddingContact && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No contacts added yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}