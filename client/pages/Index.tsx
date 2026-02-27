import { Link } from "react-router-dom";
import { Shield, Scan, AlertTriangle, Eye, PhoneOff, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Index() {
  const features = [
    {
      icon: Scan,
      title: "Phishing Scanner",
      description: "Scan URLs for phishing attempts and malicious content",
      link: "/phishing-scanner",
      color: "text-blue-500",
    },
    {
      icon: AlertTriangle,
      title: "Fraud Detection",
      description: "Analyze messages for fraud patterns and scams",
      link: "/fraud-detection",
      color: "text-yellow-500",
    },
    {
      icon: PhoneOff,
      title: "Scam Call Blocking",
      description: "Block and report suspicious phone calls",
      link: "/scam-call-blocking",
      color: "text-red-500",
    },
    {
      icon: UserCheck,
      title: "Profile Verification",
      description: "Verify authenticity of online profiles",
      link: "/fake-profile-verification",
      color: "text-green-500",
    },
    {
      icon: Eye,
      title: "Deepfake Detection",
      description: "Detect manipulated images and videos",
      link: "/deepfake-detection",
      color: "text-purple-500",
    },
    {
      icon: Shield,
      title: "Scam Alerts",
      description: "Location-based scam alerts and reporting",
      link: "/scam-alerts",
      color: "text-cyan-500",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <Shield className="h-20 w-20 text-primary" />
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
          CyberShakti
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Your comprehensive cybersecurity platform. Stay safe online with AI-powered protection against scams, fraud, and cyber threats.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link to="/features">Explore Features</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/scam-alerts">Report a Scam</Link>
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {features.map((feature) => (
          <Link key={feature.link} to={feature.link}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <feature.icon className={`h-10 w-10 mb-2 ${feature.color}`} />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  Learn More →
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="p-6 rounded-lg bg-card border">
          <div className="text-4xl font-bold text-primary mb-2">24/7</div>
          <div className="text-muted-foreground">Protection</div>
        </div>
        <div className="p-6 rounded-lg bg-card border">
          <div className="text-4xl font-bold text-primary mb-2">AI-Powered</div>
          <div className="text-muted-foreground">Detection</div>
        </div>
        <div className="p-6 rounded-lg bg-card border">
          <div className="text-4xl font-bold text-primary mb-2">Real-time</div>
          <div className="text-muted-foreground">Alerts</div>
        </div>
      </div>
    </div>
  );
}
