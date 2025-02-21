import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Plus, LogOut, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isOpen, setOpen] = useState(false);

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

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
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

  const sellers = clients.filter((client) => client.type === "seller");
  const buyers = clients.filter((client) => client.type === "buyer");

  const getLabelColor = (label: string, index: number) => {
    const colors = [
      'bg-blue-100 text-blue-800 border border-blue-200',
      'bg-red-100 text-red-800 border border-red-200',
      'bg-green-100 text-green-800 border border-green-200',
      'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'bg-purple-100 text-purple-800 border border-purple-200',
      'bg-pink-100 text-pink-800 border border-pink-200',
    ];
    return colors[index % colors.length];
  };

  const ClientTable = ({ clients }: { clients: Client[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Labels</TableHead>
          <TableHead>Added</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-medium">
              {client.firstName} {client.lastName}
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {client.email}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {client.phone}
                </div>
              </div>
            </TableCell>
            <TableCell>{client.address}</TableCell>
            <TableCell>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  client.status === "active"
                    ? "bg-green-100 text-green-800"
                    : client.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {client.status}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(client.labels || []).map((label, index) => (
                  <span
                    key={`${client.id}-${label}-${index}`}
                    className={`px-2 py-1 rounded-full text-xs ${getLabelColor(label, index)}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </TableCell>
            <TableCell>
              {format(new Date(client.createdAt), "MMM d, yyyy")}
            </TableCell>
          </TableRow>
        ))}
        {clients.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center text-muted-foreground"
            >
              No clients found. Add your first client to get started!
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Logged in as {user?.firstName} {user?.lastName} ({user?.role})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Client Management</h2>
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
                  <FormField
                    control={form.control}
                    name="labels"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Labels</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Add labels (press space or enter to add)"
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
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
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(field.value || []).map((label: string, index: number) => (
                            <span
                              key={label}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getLabelColor(label, index)}`}
                            >
                              {label}
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange(field.value?.filter((l: string) => l !== label));
                                }}
                                className="hover:text-red-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
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
    </div>
  );
}