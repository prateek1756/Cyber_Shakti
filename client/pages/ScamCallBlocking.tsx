import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneOff } from "lucide-react";

export default function ScamCallBlocking() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Scam Call Blocking</h1>
      <Card>
        <CardHeader>
          <PhoneOff className="h-10 w-10 text-red-500 mb-2" />
          <CardTitle>Block Scam Calls</CardTitle>
          <CardDescription>
            Protect yourself from fraudulent phone calls and robocalls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is coming soon. Stay tuned for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
