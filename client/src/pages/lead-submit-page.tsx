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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Home, MapPin, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const leadSubmitSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().default(""),
  zipCode: z.string().min(5, "Valid zip code is required").max(10),
  type: z.enum(["buyer", "seller", "both"]),
  budget: z.string().optional().default(""),
  timeframe: z.string().optional().default(""),
  message: z.string().optional().default(""),
});

type LeadSubmitForm = z.infer<typeof leadSubmitSchema>;

export default function LeadSubmitPage() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<LeadSubmitForm>({
    resolver: zodResolver(leadSubmitSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      zipCode: "",
      type: "buyer",
      budget: "",
      timeframe: "",
      message: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: LeadSubmitForm) => {
      const res = await apiRequest("POST", "/api/leads/submit", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LeadSubmitForm) => {
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-12 pb-12 space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Thank You!</h2>
              <p className="text-muted-foreground text-lg">
                A local agent will be in touch shortly.
              </p>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              We've matched you with a top-rated agent in your area. Expect to hear from them within 24 hours.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                form.reset();
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
            <img
              src="/homebaselogoicon.png"
              alt="HomeBase"
              className="h-12 w-12"
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Find Your Perfect Agent
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with a top-rated local real estate agent who knows your neighborhood inside and out.
          </p>
        </div>

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

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Get Started
            </CardTitle>
            <CardDescription>
              Fill out the form below and a local agent will reach out to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="75001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>I'm Looking To *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="buyer">Buy a Home</SelectItem>
                            <SelectItem value="seller">Sell a Home</SelectItem>
                            <SelectItem value="both">Buy & Sell</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about what you're looking for..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? "Submitting..." : "Find My Agent"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By submitting this form, you agree to be contacted by a local real estate agent.
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}