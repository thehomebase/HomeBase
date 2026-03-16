import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl px-6 py-12">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <h1 className="text-3xl font-bold mb-2">Terms and Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 16, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the Home-Base platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Service. These terms apply to all users of the platform, including real estate agents and their clients.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Home-Base is a real estate transaction management platform that provides tools for managing property transactions, client relationships, document tracking, communication, and related activities. The platform facilitates communication between agents and clients via SMS text messaging and email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. SMS/Text Messaging Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              By providing your phone number on this platform, you consent to receive SMS text messages related to your real estate transactions from your agent through the Home-Base platform.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Message Content:</strong> Messages may include transaction updates, appointment confirmations, document notifications, property information, and other communications related to your real estate transaction.</li>
              <li><strong>Message Frequency:</strong> Message frequency varies based on transaction activity and agent communication. You may receive multiple messages per week during active transactions.</li>
              <li><strong>Costs:</strong> Standard message and data rates from your wireless carrier may apply. Home-Base does not charge for sending or receiving SMS messages.</li>
              <li><strong>Opt-Out:</strong> You may opt out at any time by replying <strong>STOP</strong> to any message. After opting out, you will receive a confirmation message and no further SMS messages will be sent. You can re-subscribe by replying <strong>START</strong>.</li>
              <li><strong>Help:</strong> For assistance, reply <strong>HELP</strong> to any message or contact your real estate agent directly.</li>
              <li><strong>Supported Carriers:</strong> SMS messaging is supported on all major US carriers including AT&T, Verizon, T-Mobile, Sprint, and others.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Agent Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Agents using the platform agree to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Only send SMS messages to clients who have provided their phone number and consented to receive communications.</li>
              <li>Use the messaging features only for legitimate real estate business purposes.</li>
              <li>Not send threatening, harassing, or inappropriate content.</li>
              <li>Respect client opt-out requests promptly and completely.</li>
              <li>Maintain accurate client contact information.</li>
              <li>Comply with all applicable laws and regulations, including the Telephone Consumer Protection Act (TCPA) and CAN-SPAM Act.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Send unsolicited bulk messages or spam.</li>
              <li>Send threatening, abusive, or harassing communications.</li>
              <li>Impersonate another person or entity.</li>
              <li>Violate any applicable law or regulation.</li>
              <li>Interfere with or disrupt the Service or its infrastructure.</li>
              <li>Attempt to gain unauthorized access to other users' accounts or data.</li>
              <li>Use the platform for any purpose unrelated to real estate transactions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. AI-Powered Document Processing</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Our platform uses artificial intelligence (AI) to extract data from uploaded real estate documents. By uploading documents, you acknowledge and agree to the following:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>AI Accuracy:</strong> AI-extracted data is provided as a convenience and may contain errors. All extracted information is presented for your review before being applied. You are responsible for verifying the accuracy of any AI-extracted data before relying on it.</li>
              <li><strong>Not a Substitute for Professional Review:</strong> AI-powered document analysis does not constitute legal, financial, or professional advice. You should always have contracts and other important documents reviewed by qualified professionals.</li>
              <li><strong>Data Processing:</strong> Document text is sent to a third-party AI service (Google Gemini) for processing. Sensitive personal information (such as Social Security numbers, bank account numbers, and similar data) is automatically redacted before transmission. See our Privacy Policy for full details.</li>
              <li><strong>No Liability:</strong> Home-Base is not liable for any errors, omissions, or inaccuracies in AI-extracted data, or for any decisions made based on AI-generated output. You assume full responsibility for verifying all extracted information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              The platform integrates with third-party services. Your use of these integrated services is also subject to their respective terms of service and privacy policies. We are not responsible for the practices or policies of third-party service providers. Third-party services include:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Google Gemini:</strong> AI-powered document analysis and data extraction.</li>
              <li><strong>Twilio:</strong> SMS text message delivery.</li>
              <li><strong>Google Gmail:</strong> Email communication via linked Gmail accounts.</li>
              <li><strong>Stripe:</strong> Payment processing and subscription management.</li>
              <li><strong>SignNow / DocuSign:</strong> Electronic signature services.</li>
              <li><strong>RentCast:</strong> Property listing data and market information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by Home-Base and are protected by copyright, trademark, and other intellectual property laws. You retain ownership of any data you input into the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free. We do not provide legal, financial, or real estate advice through the platform. Users should consult appropriate professionals for such advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, Home-Base shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service, including but not limited to damages related to failed message delivery, data loss, or service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated terms on this page. Your continued use of the Service after changes are posted constitutes your acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">15. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms and Conditions, please contact your agent or the platform administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
