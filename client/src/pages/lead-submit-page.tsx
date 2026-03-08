import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Home,
  MapPin,
  Users,
  Shield,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Phone,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const step1Schema = z.object({
  zipCode: z.string().min(5, "Enter a valid zip code").max(10),
  type: z.enum(["buyer", "seller", "both"]),
});

const step2Schema = z.object({
  budget: z.string().optional().default(""),
  timeframe: z.string().optional().default(""),
  message: z.string().optional().default(""),
});

const directContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().default(""),
});

const platformAccountSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export default function LeadSubmitPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [contactMethod, setContactMethod] = useState<"platform" | "direct" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const { toast } = useToast();

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { zipCode: "", type: "buyer" },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { budget: "", timeframe: "", message: "" },
  });

  const directForm = useForm<z.infer<typeof directContactSchema>>({
    resolver: zodResolver(directContactSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "" },
  });

  const platformForm = useForm<z.infer<typeof platformAccountSchema>>({
    resolver: zodResolver(platformAccountSchema),
    defaultValues: { email: "", password: "" },
  });

  const directSubmitMutation = useMutation({
    mutationFn: async (contactData: z.infer<typeof directContactSchema>) => {
      const res = await apiRequest("POST", "/api/leads/submit", {
        ...step1Data,
        ...step2Data,
        ...contactData,
      });
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: (error: Error) => {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    },
  });

  const platformSubmitMutation = useMutation({
    mutationFn: async (accountData: z.infer<typeof platformAccountSchema>) => {
      const res = await apiRequest("POST", "/api/leads/submit-with-account", {
        ...step1Data,
        ...step2Data,
        ...accountData,
      });
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: (error: Error) => {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    },
  });

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const onStep2Submit = (data: Step2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const totalSteps = 3;
  const progressPercent = (currentStep / totalSteps) * 100;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-12 pb-12 space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">You're All Set!</h2>
              <p className="text-muted-foreground text-lg">
                {contactMethod === "platform"
                  ? "Your account has been created. You'll be connected with a local agent through the platform."
                  : "A local agent will be in touch shortly."}
              </p>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {contactMethod === "platform"
                ? "You can now log in to your HomeBase account to message your agent securely and track your home search."
                : "We've matched you with a top-rated agent in your area. Expect to hear from them within 24 hours."}
            </p>
            {contactMethod === "platform" && (
              <Button onClick={() => window.location.href = "/auth"}>
                Go to My Account
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setCurrentStep(1);
                setContactMethod(null);
                setStep1Data(null);
                setStep2Data(null);
                step1Form.reset();
                step2Form.reset();
                directForm.reset();
                platformForm.reset();
              }}
            >
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="container max-w-6xl mx-auto px-4 py-8 md:py-16">
        <div className="text-center mb-10 space-y-4">
          <div className="flex justify-center mb-4">
            <img src="/homebaselogoicon.png" alt="HomeBase" className="h-12 w-12" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Find Your Perfect Agent
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with a top-rated local real estate agent who knows your neighborhood inside and out.
          </p>
        </div>

        {currentStep === 1 && (
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
              <MapPin className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Local Expertise</h3>
              <p className="text-sm text-muted-foreground">
                Agents who specialize in your zip code and know the market.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Personally Matched</h3>
              <p className="text-sm text-muted-foreground">
                We connect you with the right agent for your specific needs.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
              <Shield className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">100% Free</h3>
              <p className="text-sm text-muted-foreground">
                No cost, no obligation. Just expert guidance when you need it.
              </p>
            </div>
          </div>
        )}

        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {currentStep} of {totalSteps}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {currentStep === 1 && "What are you looking for?"}
                  {currentStep === 2 && "Tell us more"}
                  {currentStep === 3 && "How should we connect?"}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {currentStep === 1 && (
              <Form {...step1Form}>
                <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-6">
                  <div className="text-center mb-2">
                    <Home className="h-10 w-10 text-primary mx-auto mb-3" />
                    <h2 className="text-xl font-semibold">What are you looking for?</h2>
                    <p className="text-muted-foreground text-sm mt-1">Just two quick questions to get started</p>
                  </div>

                  <FormField
                    control={step1Form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Zip Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your zip code"
                            className="text-lg h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step1Form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>I'm looking to...</FormLabel>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { value: "buyer", label: "Buy" },
                            { value: "seller", label: "Sell" },
                            { value: "both", label: "Buy & Sell" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => field.onChange(option.value)}
                              className={`p-4 rounded-lg border-2 text-center font-medium transition-all ${
                                field.value === option.value
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-muted hover:border-primary/50"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" size="lg">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            )}

            {currentStep === 2 && (
              <Form {...step2Form}>
                <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-6">
                  <div className="text-center mb-2">
                    <h2 className="text-xl font-semibold">Tell us a bit more</h2>
                    <p className="text-muted-foreground text-sm mt-1">All optional — share as much or as little as you'd like</p>
                  </div>

                  <FormField
                    control={step2Form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget Range</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select budget..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="under-200k">Under $200,000</SelectItem>
                            <SelectItem value="200k-400k">$200,000 - $400,000</SelectItem>
                            <SelectItem value="400k-600k">$400,000 - $600,000</SelectItem>
                            <SelectItem value="600k-800k">$600,000 - $800,000</SelectItem>
                            <SelectItem value="800k-1m">$800,000 - $1,000,000</SelectItem>
                            <SelectItem value="over-1m">Over $1,000,000</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step2Form.control}
                    name="timeframe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timeframe</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timeframe..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="immediately">Immediately</SelectItem>
                            <SelectItem value="1-3-months">1 - 3 Months</SelectItem>
                            <SelectItem value="3-6-months">3 - 6 Months</SelectItem>
                            <SelectItem value="6-12-months">6 - 12 Months</SelectItem>
                            <SelectItem value="just-browsing">Just Browsing</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step2Form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anything else you'd like us to know?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about your ideal home, neighborhood preferences, or any questions..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {currentStep === 3 && !contactMethod && (
              <div className="space-y-6">
                <div className="text-center mb-2">
                  <h2 className="text-xl font-semibold">How would you like to connect?</h2>
                  <p className="text-muted-foreground text-sm mt-1">Choose the option that feels most comfortable</p>
                </div>

                <button
                  onClick={() => setContactMethod("platform")}
                  className="w-full p-6 rounded-xl border-2 border-muted hover:border-primary transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        Message through HomeBase
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Create a free account and communicate with your agent securely through the platform. No phone calls until you're ready.
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        <span>Your personal info stays private</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </button>

                <button
                  onClick={() => setContactMethod("direct")}
                  className="w-full p-6 rounded-xl border-2 border-muted hover:border-primary transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        Share my contact info
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Give us your name, email, and phone so an agent can reach out to you directly. Fast and personal.
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              </div>
            )}

            {currentStep === 3 && contactMethod === "platform" && (
              <Form {...platformForm}>
                <form
                  onSubmit={platformForm.handleSubmit((data) => platformSubmitMutation.mutate(data))}
                  className="space-y-6"
                >
                  <div className="text-center mb-2">
                    <MessageSquare className="h-10 w-10 text-primary mx-auto mb-3" />
                    <h2 className="text-xl font-semibold">Create Your Free Account</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Just an email and password — your agent will connect with you through the platform
                    </p>
                  </div>

                  <FormField
                    control={platformForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={platformForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Create a Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="At least 6 characters" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 shrink-0" />
                      <span>Your personal info stays private until you choose to share it</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span>Communicate with your agent through secure in-app messaging</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setContactMethod(null)}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={platformSubmitMutation.isPending}
                    >
                      {platformSubmitMutation.isPending ? "Creating Account..." : "Create Account & Connect"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {currentStep === 3 && contactMethod === "direct" && (
              <Form {...directForm}>
                <form
                  onSubmit={directForm.handleSubmit((data) => directSubmitMutation.mutate(data))}
                  className="space-y-6"
                >
                  <div className="text-center mb-2">
                    <Phone className="h-10 w-10 text-primary mx-auto mb-3" />
                    <h2 className="text-xl font-semibold">Your Contact Details</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      So your matched agent can reach out to you directly
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={directForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={directForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={directForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={directForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setContactMethod(null)}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={directSubmitMutation.isPending}
                    >
                      {directSubmitMutation.isPending ? "Submitting..." : "Find My Agent"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            <p className="text-xs text-muted-foreground text-center mt-6">
              By continuing, you agree to be connected with a local real estate agent.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
