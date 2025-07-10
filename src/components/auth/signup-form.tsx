"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {createUserWithEmailAndPassword} from "firebase/auth";
import {useForm} from "react-hook-form";
import * as z from "zod";
import {auth} from "@/lib/firebase";
import {Button} from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {useToast} from "@/hooks/use-toast";
import {useState} from "react";
import {Loader2} from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  fullName: z.string().min(2, {message: "Full name must be at least 2 characters."}),
  email: z.string().email({message: "Invalid email address."}),
  phoneNumber: z.string().min(10, {message: "Phone number must be at least 10 digits."}),
  password: z.string().min(6, {message: "Password must be at least 6 characters."}),
  company: z.string({required_error: "Please select a company."}),
  region: z.string({required_error: "Please select a region."}),
  team: z.string({required_error: "Please select a team."}),
});

export default function SignupForm() {
  const {toast} = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      company: "",
      region: "",
      team: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      
      // Save user data to Firestore with pending approval status
      await savePendingUserData(userCredential.user.uid, values);
      
      toast({
        title: "Account Created Successfully!",
        description: "Your account is pending manager approval. You'll receive an email once approved and can then log in.",
      });
      
      // Navigation is handled by useAuth hook
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Save user data with pending approval status
  async function savePendingUserData(uid: string, userData: z.infer<typeof formSchema>) {
    const { db } = await import("@/lib/firebase");
    const { doc, setDoc, serverTimestamp, collection, query, where, getDocs } = await import("firebase/firestore");
    
    // Get team ID for the selected team
    const teamId = getTeamId(userData.team);
    
    // Create user document with pending status
    const userDoc = {
      uid,
      displayName: userData.fullName,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      role: "pending", // Special role for pending approval
      teamId: teamId,
      company: userData.company,
      region: userData.region,
      team: userData.team,
      status: "pending_approval",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(doc(db, "users", uid), userDoc);
    
    // Create a pending approval request for managers
    const approvalRequest = {
      userId: uid,
      userEmail: userData.email,
      userName: userData.fullName,
      teamId: teamId,
      teamName: userData.team,
      requestedAt: serverTimestamp(),
      status: "pending",
      userData: userDoc
    };
    
    await setDoc(doc(db, "pending_approvals", uid), approvalRequest);
    
  }

  // Helper function to convert team name to team ID
  function getTeamId(teamName: string): string {
    const teamMappings = {
      "empire": "empire",
      "takeover-pros": "takeoverpros", 
      "revolution": "revolution"
    };
    
    return teamMappings[teamName as keyof typeof teamMappings] || teamName.toLowerCase().replace(/\s+/g, '-');
  }

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create Account</CardTitle>
        <CardDescription>Join LeadFlow and start managing your leads effectively.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Personal Information */}
            <FormField
              control={form.control}
              name="fullName"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Organization Information */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Organization Details</h3>
              
              <FormField
                control={form.control}
                name="company"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="freedom-pros">Freedom Pros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="region"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="empire">Empire</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="team"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="empire">Empire</SelectItem>
                        <SelectItem value="takeover-pros">Takeover Pros</SelectItem>
                        <SelectItem value="revolution">Revolution</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create Account"}
            </Button>
          </form>
        </Form>
        
        {/* Login Link */}
        <div className="mt-6 text-center">
          <div className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
