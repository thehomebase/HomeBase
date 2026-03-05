import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicyPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 5, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Home-Base ("we," "us," or "our") is a real estate transaction management platform that helps real estate agents and their clients manage property transactions, communications, and related activities. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">We collect the following types of information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Account Information:</strong> Name, email address, phone number, and role (agent or client) when you create an account.</li>
              <li><strong>Transaction Data:</strong> Property addresses, contract details, closing dates, financial terms, and related documents associated with real estate transactions.</li>
              <li><strong>Communication Metadata:</strong> When SMS messages or emails are sent through our platform, we log the type of communication, status (sent/failed), and timestamp. We do not store the content of emails sent through Gmail.</li>
              <li><strong>Phone Numbers:</strong> Client phone numbers provided by agents for the purpose of sending SMS communications.</li>
              <li><strong>Property Data:</strong> Saved property listings, showing requests, and search preferences.</li>
              <li><strong>OAuth Tokens:</strong> Encrypted access and refresh tokens for linked third-party accounts (e.g., Gmail) to enable platform features.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>To provide and maintain our real estate transaction management services.</li>
              <li>To facilitate communication between agents and clients via SMS and email.</li>
              <li>To manage transaction workflows, documents, and checklists.</li>
              <li>To display property information and manage showing requests.</li>
              <li>To enforce SMS compliance, including opt-out handling and rate limiting.</li>
              <li>To improve and optimize our platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. SMS/Text Messaging</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Our platform enables real estate agents to send SMS messages to their clients for transaction-related communications. By providing your phone number to your agent, you consent to receiving text messages related to your real estate transaction.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Opt-Out:</strong> You can opt out of receiving SMS messages at any time by replying <strong>STOP</strong> to any message. You may also reply STOPALL, UNSUBSCRIBE, CANCEL, END, or QUIT.</li>
              <li><strong>Opt-In:</strong> To re-subscribe after opting out, reply <strong>START</strong> or YES to any message.</li>
              <li><strong>Message Frequency:</strong> Message frequency varies based on your transaction activity. Standard message and data rates may apply.</li>
              <li><strong>Support:</strong> For help with SMS, reply HELP to any message or contact your agent directly.</li>
              <li>We do not sell, rent, or share your phone number or SMS opt-in/opt-out status with third parties for marketing purposes.</li>
              <li>Phone numbers and opt-in consent are not shared with any third parties except as necessary to deliver the SMS messages (i.e., our SMS service provider, Twilio).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Sharing and Third Parties</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Twilio:</strong> Our SMS service provider, which processes text messages on our behalf.</li>
              <li><strong>Google:</strong> When agents link their Gmail account, emails are sent through Google's servers via the agent's own Gmail account.</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate and improve our platform (e.g., database hosting).</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, or court order.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information. Passwords are hashed using industry-standard algorithms. Contract documents uploaded for parsing are processed in memory only and are never written to disk or persistent storage. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide services. Communication logs are retained for compliance and record-keeping purposes. You may request deletion of your account and associated data by contacting your agent or platform administrator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your personal information.</li>
              <li>Opt out of SMS communications at any time.</li>
              <li>Disconnect linked third-party accounts (e.g., Gmail).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact your agent or the platform administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
