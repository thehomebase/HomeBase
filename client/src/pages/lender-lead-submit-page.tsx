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
  DollarSign,
  MapPin,
  Shield,
  ArrowRight,
  ArrowLeft,
  Building2,
  Landmark,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const step1Schema = z.object({
  zipCode: z.string().min(5, "Enter a valid zip code").max(10),
  loanType: z.enum(["conventional", "fha", "va", "usda", "other"]),
});

const step2Schema = z.object({
  purchasePrice: z.string().optional().default(""),
  downPayment: z.string().optional().default(""),
  creditScore: z.string().optional().default(""),
  message: z.string().optional().default(""),
});

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().default(""),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export default function LenderLeadSubmitPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const { toast } = useToast();

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { zipCode: "", loanType: "conventional" },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { purchasePrice: "", downPayment: "", creditScore: "", message: "" },
  });

  const contactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "" },
  });

  const submitMutation = useMutation({
    mutationFn: async (contactData: z.infer<typeof contactSchema>) => {
      const payload = {
        ...contactData,
        zipCode: step1Data?.zipCode || "",
        loanType: step1Data?.loanType || "conventional",
        purchasePrice: step2Data?.purchasePrice || null,
        downPayment: step2Data?.downPayment || null,
        creditScore: step2Data?.creditScore || null,
        message: step2Data?.message || null,
      };
      const res = await apiRequest("POST", "/api/lender-leads/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit your request. Please try again.", variant: "destructive" });
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

  const onContactSubmit = (data: z.infer<typeof contactSchema>) => {
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold">Request Submitted!</h2>
            <p className="text-muted-foreground">
              A qualified loan officer in your area will be in touch shortly. All participating lenders have equal access to serve you.
            </p>
            <Button onClick={() => { setSubmitted(false); setCurrentStep(1); step1Form.reset(); step2Form.reset(); contactForm.reset(); setStep1Data(null); setStep2Data(null); }} variant="outline">
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Landmark className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Find a Lender</h1>
          </div>
          <p className="text-muted-foreground">
            Get connected with a qualified loan officer in your area
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {step}
              </div>
              {step < 3 && <div className={`w-8 h-0.5 ${currentStep > step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <Form {...step1Form}>
                <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-6">
                  <div className="text-center space-y-1 mb-4">
                    <MapPin className="h-6 w-6 text-primary mx-auto" />
                    <h2 className="text-lg font-semibold">Where are you looking?</h2>
                    <p className="text-sm text-muted-foreground">Tell us your location and loan preference</p>
                  </div>

                  <FormField
                    control={step1Form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your zip code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step1Form.control}
                    name="loanType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select loan type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="conventional">Conventional</SelectItem>
                            <SelectItem value="fha">FHA</SelectItem>
                            <SelectItem value="va">VA</SelectItem>
                            <SelectItem value="usda">USDA</SelectItem>
                            <SelectItem value="other">Other / Not Sure</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            )}

            {currentStep === 2 && (
              <Form {...step2Form}>
                <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-6">
                  <div className="text-center space-y-1 mb-4">
                    <DollarSign className="h-6 w-6 text-primary mx-auto" />
                    <h2 className="text-lg font-semibold">Loan Details</h2>
                    <p className="text-sm text-muted-foreground">Help us find the right fit (all optional)</p>
                  </div>

                  <FormField
                    control={step2Form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Purchase Price</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="under-200k">Under $200,000</SelectItem>
                            <SelectItem value="200k-350k">$200,000 - $350,000</SelectItem>
                            <SelectItem value="350k-500k">$350,000 - $500,000</SelectItem>
                            <SelectItem value="500k-750k">$500,000 - $750,000</SelectItem>
                            <SelectItem value="750k-1m">$750,000 - $1,000,000</SelectItem>
                            <SelectItem value="over-1m">Over $1,000,000</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step2Form.control}
                    name="downPayment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Down Payment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">0% (zero down)</SelectItem>
                            <SelectItem value="3-5">3% - 5%</SelectItem>
                            <SelectItem value="5-10">5% - 10%</SelectItem>
                            <SelectItem value="10-20">10% - 20%</SelectItem>
                            <SelectItem value="20+">20% or more</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step2Form.control}
                    name="creditScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Credit Score</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent (740+)</SelectItem>
                            <SelectItem value="good">Good (700 - 739)</SelectItem>
                            <SelectItem value="fair">Fair (640 - 699)</SelectItem>
                            <SelectItem value="below-average">Below Average (580 - 639)</SelectItem>
                            <SelectItem value="poor">Poor (below 580)</SelectItem>
                            <SelectItem value="unsure">Not Sure</SelectItem>
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
                        <FormLabel>Additional Details</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any questions or details for the lender..." rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {currentStep === 3 && (
              <Form {...contactForm}>
                <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-6">
                  <div className="text-center space-y-1 mb-4">
                    <Building2 className="h-6 w-6 text-primary mx-auto" />
                    <h2 className="text-lg font-semibold">Your Contact Info</h2>
                    <p className="text-sm text-muted-foreground">A loan officer will reach out to you</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={contactForm.control}
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
                      control={contactForm.control}
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
                    control={contactForm.control}
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
                    control={contactForm.control}
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

                  <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Shield className="h-4 w-4 text-primary" />
                      How it works
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>All lenders pay the same flat fee to participate — no one gets priority</li>
                      <li>Leads are distributed equally via neutral round-robin rotation</li>
                      <li>Lender inclusion is not an endorsement or recommendation</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={submitMutation.isPending}>
                      {submitMutation.isPending ? "Submitting..." : "Find My Lender"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            <p className="text-xs text-muted-foreground text-center mt-6">
              By continuing, you agree to be connected with a participating loan officer.
              All lenders pay a uniform fee and receive equal lead distribution. Inclusion does not constitute an endorsement, recommendation, or guarantee of service quality.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}