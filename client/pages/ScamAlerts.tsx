import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function ScamAlerts() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Location-Based Scam Alerts</h1>
      <Card>
        <CardHeader>
          <MapPin className="h-10 w-10 text-cyan-500 mb-2" />
          <CardTitle>Scam Alerts Near You</CardTitle>
          <CardDescription>
            View and report scams in your area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Map and reporting features coming soon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
