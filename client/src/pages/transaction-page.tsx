
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { ArrowLeft, Check, ClipboardCheck, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressChecklist } from "@/components/progress-checklist";
import { DocumentChecklist } from "@/components/document-checklist";
import { TransactionContacts } from "@/components/transaction-contacts";
import { UserPlus, FileText } from "lucide-react";

interface TransactionFormData {
  streetName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export default function TransactionPage() {
  const { user } = useAuth();
  const form = useForm<TransactionFormData>();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const parsedId = "1"; // Replace with actual ID parsing logic

  const transaction = {
    streetName: "123 Main St",
    city: "Springfield",
    state: "IL",
    zipCode: "62701"
  };

  return (
    <main>
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/transactions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{transaction.streetName}</h1>
            <p className="text-muted-foreground">
              {transaction.city}, {transaction.state} {transaction.zipCode}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Transaction ID: {parsedId}</p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="progress" className="w-full">
        <TabsList>
          <TabsTrigger value="progress">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <UserPlus className="h-4 w-4 mr-2" />
            Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <ProgressChecklist transactionId={parsedId} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentChecklist transactionId={parsedId} />
        </TabsContent>

        <TabsContent value="contacts">
          <TransactionContacts transactionId={parsedId} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
