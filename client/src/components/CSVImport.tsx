import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';

export function CSVImport() {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    try {
      const csvData = await file.text();
      const response = await fetch('/api/clients/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import clients');
      }

      toast({
        title: "Import Successful",
        description: `Successfully imported ${result.clients.length} clients`,
      });

      // Reset file input
      setFile(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'Failed to import clients',
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Import Clients</CardTitle>
        <CardDescription>
          Upload a CSV file to import clients. The CSV file should include the following columns:
          <ul className="mt-2 list-disc list-inside">
            <li>First Name (required)</li>
            <li>Last Name (required)</li>
            <li>Email</li>
            <li>Phone</li>
            <li>Address</li>
            <li>Type (buyer/seller)</li>
            <li>Status (active/inactive/pending)</li>
            <li>Notes</li>
            <li>Labels (comma-separated)</li>
          </ul>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="csvFile">CSV File</Label>
            <input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
          </div>
          <Button 
            onClick={handleUpload}
            disabled={!file}
            className="w-full sm:w-auto"
          >
            Import Clients
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
