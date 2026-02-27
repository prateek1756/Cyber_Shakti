import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck } from "lucide-react";

export default function FakeProfileVerification() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Fake Profile Verification</h1>
      <Card>
        <CardHeader>
          <UserCheck className="h-10 w-10 text-green-500 mb-2" />
          <CardTitle>Verify Online Profiles</CardTitle>
          <CardDescription>
            Check if social media profiles are authentic or fake
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
