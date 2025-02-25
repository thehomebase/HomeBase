
import { useParams } from "wouter";
import { useTransaction } from "@/hooks/use-transaction";
import { Label } from "@/components/ui/label";

export default function TransactionPage() {
  const { id } = useParams();
  const { data: transaction, isLoading } = useTransaction(id);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!transaction) {
    return <div>Transaction not found</div>;
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-4">Transaction Details</h1>
      <div className="grid gap-4">
        <div>
          <Label>Property Address</Label>
          <p>{transaction.streetName}</p>
        </div>
        <div>
          <Label>Status</Label>
          <p className="capitalize">{transaction.status}</p>
        </div>
        <div>
          <Label>Type</Label>
          <p className="capitalize">{transaction.type}</p>
        </div>
      </div>
    </div>
  );
}
