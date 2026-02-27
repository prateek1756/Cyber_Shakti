import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileWarning } from "lucide-react";

export default function ReportScam() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Report a Scam</h1>
      <Card>
        <CardHeader>
          <FileWarning className="h-10 w-10 text-orange-500 mb-2" />
          <CardTitle>Submit a Scam Report</CardTitle>
          <CardDescription>
            Help protect others by reporting scams you've encountered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Reporting form coming soon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
