import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Alerts() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Security Alerts</h1>
      <Card>
        <CardHeader>
          <AlertTriangle className="h-10 w-10 text-yellow-500 mb-2" />
          <CardTitle>No Active Alerts</CardTitle>
          <CardDescription>
            You're all caught up! Check back later for security updates.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
