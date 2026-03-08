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
  Wrench,
  MapPin,
  Shield,
  ArrowRight,
  ArrowLeft,
  Clock,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SERVICE_CATEGORIES = [
  { value: "home_inspector", label: "Home Inspector" },
  { value: "roofer", label: "Roofer" },
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "hvac", label: "HVAC" },
  { value: "painter", label: "Painter" },
  { value: "landscaper", label: "Landscaper" },
  { value: "handyman", label: "Handyman" },
  { value: "mover", label: "Mover" },
  { value: "cleaner", label: "Cleaner" },
  { value: "pest_control", label: "Pest Control" },
  { value: "pool_maintenance", label: "Pool Maintenance" },
  { value: "windows", label: "Windows" },
  { value: "title_company", label: "Title Company" },
  { value: "mortgage_lender", label: "Mortgage Lender" },
  { value: "appraiser", label: "Appraiser" },
  { value: "photographer", label: "Photographer" },
  { value: "stager", label: "Stager" },
  { value: "other", label: "Other" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Not urgent — just planning ahead" },
  { value: "medium", label: "Within the next few weeks" },
  { value: "high", label: "This week if possible" },
  { value: "emergency", label: "Emergency — need help ASAP" },
];

const step1Schema = z.object({
  zipCode: z.string().length(5, "Enter a 5-digit zip code").regex(/^\d{5}$/, "Enter a valid 5-digit zip code"),
  category: z.string().min(1, "Select a service category"),
});

const step2Schema = z.object({
  description: z.string().optional().default(""),
  urgency: z.enum(["low", "medium", "high", "emergency"]).optional().default("medium"),
});

const step3Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().default(""),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

export default function FindContractorPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const { toast } = useToast();

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { zipCode: "", category: "" },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { description: "", urgency: "medium" },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "" },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: Step3Data) => {
      const payload = {
        ...step1Data,
        ...step2Data,
        ...data,
      };
      const res = await apiRequest("POST", "/api/vendor-leads/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: any) => {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
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

  const onStep3Submit = (data: Step3Data) => {
    submitMutation.mutate(data);
  };

  const totalSteps = 3;
  const progressPercent = (currentStep / totalSteps) * 100;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Request Submitted!</h2>
            <p className="text-muted-foreground">
              We've matched you with a local{" "}
              {SERVICE_CATEGORIES.find(c => c.value === step1Data?.category)?.label?.toLowerCase() || "contractor"}{" "}
              in your area. They'll reach out to you soon.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-1">
              <p><span className="font-medium">Zip Code:</span> {step1Data?.zipCode}</p>
              <p><span className="font-medium">Service:</span> {SERVICE_CATEGORIES.find(c => c.value === step1Data?.category)?.label}</p>
              {step2Data?.urgency && (
                <p><span className="font-medium">Urgency:</span> {URGENCY_OPTIONS.find(u => u.value === step2Data.urgency)?.label}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              You can also browse contractors directly on our{" "}
              <a href="/auth" className="text-primary underline">HomeBase Pros marketplace</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Wrench className="h-4 w-4" />
            Find a Contractor
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Get Connected with Trusted Local Pros
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tell us what you need and we'll match you with a verified, reputable contractor in your area.
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr_340px] gap-8">
          <div>
            <div className="mb-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round(progressPercent)}% complete</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                {currentStep === 1 && (
                  <Form {...step1Form}>
                    <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">What do you need help with?</h2>
                        <p className="text-sm text-muted-foreground">Tell us your location and the type of service you're looking for.</p>
                      </div>

                      <FormField
                        control={step1Form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Zip Code</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 75201" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={step1Form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a service..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SERVICE_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full">
                        Continue <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </form>
                  </Form>
                )}

                {currentStep === 2 && (
                  <Form {...step2Form}>
                    <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Tell us more (optional)</h2>
                        <p className="text-sm text-muted-foreground">Help us connect you with the right contractor faster.</p>
                      </div>

                      <FormField
                        control={step2Form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Describe the work needed</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g. Leaking pipe under the kitchen sink, need it fixed..."
                                rows={4}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={step2Form.control}
                        name="urgency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>How urgent is this?</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select urgency..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {URGENCY_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                        <Button type="submit" className="flex-1">
                          Continue <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}

                {currentStep === 3 && (
                  <Form {...step3Form}>
                    <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Your contact information</h2>
                        <p className="text-sm text-muted-foreground">So the contractor can reach you about your request.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={step3Form.control}
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
                          control={step3Form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Smith" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={step3Form.control}
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
                        control={step3Form.control}
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
                        <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                        <Button type="submit" className="flex-1" disabled={submitMutation.isPending}>
                          {submitMutation.isPending ? "Submitting..." : "Submit Request"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 hidden md:block">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">Why HomeBase?</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Verified Professionals</p>
                      <p className="text-xs text-muted-foreground">Our contractors have Google, Yelp, and BBB verification badges.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Fast Response</p>
                      <p className="text-xs text-muted-foreground">Get matched with a local pro who responds quickly to requests.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Star className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Rated & Reviewed</p>
                      <p className="text-xs text-muted-foreground">See real performance ratings from other homeowners and agents.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Local Coverage</p>
                      <p className="text-xs text-muted-foreground">Contractors serve specific zip codes so you get someone nearby.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-sm font-medium">100% Free for Homeowners</p>
                <p className="text-xs text-muted-foreground mt-1">
                  There's no cost to submit a service request. We connect you with quality contractors at no charge.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
