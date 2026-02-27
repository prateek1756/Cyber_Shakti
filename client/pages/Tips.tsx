import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, AlertTriangle } from "lucide-react";

export default function Tips() {
  const tips = [
    {
      icon: Shield,
      title: "Use Strong Passwords",
      description: "Create unique passwords with a mix of letters, numbers, and symbols. Use a password manager.",
    },
    {
      icon: Lock,
      title: "Enable Two-Factor Authentication",
      description: "Add an extra layer of security to your accounts with 2FA.",
    },
    {
      icon: Eye,
      title: "Be Cautious of Phishing",
      description: "Don't click suspicious links or download attachments from unknown senders.",
    },
    {
      icon: AlertTriangle,
      title: "Keep Software Updated",
      description: "Regularly update your operating system and applications to patch security vulnerabilities.",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Cyber Safety Tips</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tips.map((tip, index) => (
          <Card key={index}>
            <CardHeader>
              <tip.icon className="h-10 w-10 text-primary mb-2" />
              <CardTitle>{tip.title}</CardTitle>
              <CardDescription>{tip.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
