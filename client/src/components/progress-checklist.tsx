import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

interface ProgressChecklistProps {
  transactionId: number;
  userRole: string;
}

const DEFAULT_ITEMS = [
  { id: "1", text: "Initial consultation with client", completed: false },
  { id: "2", text: "Property listing agreement signed", completed: false },
  { id: "3", text: "Schedule professional photography", completed: false },
  { id: "4", text: "List property on MLS", completed: false },
  { id: "5", text: "Schedule open houses", completed: false },
];

export function ProgressChecklist({ transactionId, userRole }: ProgressChecklistProps) {
  const [items, setItems] = useState(DEFAULT_ITEMS);

  const progress = Math.round((items.filter(item => item.completed).length / items.length) * 100);

  const handleCheck = (itemId: string, checked: boolean) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, completed: checked } : item
    ));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">Progress</CardTitle>
          <Progress value={progress} className="h-2" />
          <div className="text-sm text-muted-foreground">{progress}% complete</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  id={item.id}
                  checked={item.completed}
                  onCheckedChange={(checked) => handleCheck(item.id, checked as boolean)}
                />
                <label
                  htmlFor={item.id}
                  className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}
                >
                  {item.text}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProgressChecklist;