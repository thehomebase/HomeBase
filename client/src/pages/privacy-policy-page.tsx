import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicyPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl px-6 py-12">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 16, 2026</p>

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
              <li><strong>Uploaded Documents:</strong> Real estate documents (contracts, inspection reports, addenda, amendments, disclosures) uploaded for data extraction. These are processed in memory and not stored permanently.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. AI-Powered Document Processing</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              When you upload documents to our platform for data extraction (such as contracts, inspection reports, addenda, or amendments), we use artificial intelligence (AI) services to analyze and extract relevant information. Here is how this works:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>What is processed:</strong> Your uploaded PDF document is sent directly to a third-party AI service (Google Gemini) for visual analysis and data extraction. This enables the AI to read the document layout, tables, and any embedded images (such as inspection photos) accurately.</li>
              <li><strong>Data handling:</strong> The AI service receives the document content for processing. If the direct PDF analysis is unavailable and the system falls back to text-based extraction, sensitive personal information (Social Security numbers, credit card numbers, bank account numbers, email addresses, phone numbers, license/ID numbers, and dates of birth) is automatically redacted before processing.</li>
              <li><strong>No data retention by AI provider:</strong> The AI service processes your document text in real time and does not store, retain, or use your document content for training purposes. Data is discarded immediately after processing.</li>
              <li><strong>No permanent storage:</strong> Uploaded documents are processed in memory only. The original file and extracted text are not written to disk or stored permanently on our servers.</li>
              <li><strong>Human review required:</strong> All AI-extracted data is presented to you for review and approval before being applied to any transaction. You have full control to accept, modify, or reject any extracted information.</li>
              <li><strong>Fallback processing:</strong> If the AI service is temporarily unavailable, document parsing may fall back to local pattern-matching extraction that does not involve any third-party processing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>To provide and maintain our real estate transaction management services.</li>
              <li>To facilitate communication between agents and clients via SMS and email.</li>
              <li>To manage transaction workflows, documents, and checklists.</li>
              <li>To extract and organize data from uploaded documents using AI-powered analysis.</li>
              <li>To display property information and manage showing requests.</li>
              <li>To enforce SMS compliance, including opt-out handling and rate limiting.</li>
              <li>To improve and optimize our platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. SMS/Text Messaging</h2>
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
            <h2 className="text-xl font-semibold mb-3">6. Data Sharing and Third Parties</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Google Gemini (AI):</strong> Document text (with personal information redacted) is sent to Google's Gemini AI service for data extraction. Google does not retain or use this data for model training.</li>
              <li><strong>Twilio:</strong> Our SMS service provider, which processes text messages on our behalf.</li>
              <li><strong>Google Gmail:</strong> When agents link their Gmail account, emails are sent through Google's servers via the agent's own Gmail account.</li>
              <li><strong>Stripe:</strong> Our payment processor for subscription billing and transactions.</li>
              <li><strong>SignNow / DocuSign:</strong> When e-signature features are used, document signing is facilitated through these services via the user's own linked account.</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate and improve our platform (e.g., database hosting, property listing data).</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, or court order.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information. Passwords are hashed using industry-standard algorithms. Documents uploaded for parsing are processed in memory only and are never written to disk or persistent storage. Sensitive personal information is automatically redacted before any data is sent to third-party AI services. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide services. Communication logs are retained for compliance and record-keeping purposes. You may request deletion of your account and associated data by contacting your agent or platform administrator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Your Rights</h2>
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
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact your agent or the platform administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
