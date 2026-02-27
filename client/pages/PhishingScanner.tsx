import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scan } from "lucide-react";

export default function PhishingScanner() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    // Simulate scanning
    setTimeout(() => setScanning(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Phishing URL Scanner</h1>
      <Card>
        <CardHeader>
          <Scan className="h-10 w-10 text-blue-500 mb-2" />
          <CardTitle>Scan a URL</CardTitle>
          <CardDescription>
            Enter a URL to check if it's safe or potentially malicious
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 rounded-md border bg-background"
            />
            <Button onClick={handleScan} disabled={scanning || !url}>
              {scanning ? "Scanning..." : "Scan URL"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
