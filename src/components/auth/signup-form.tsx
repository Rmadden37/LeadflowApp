"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp } from "firebase/firestore";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
  role: z.enum(["setter", "closer"], { required_error: "Please select a role." }),
  teamId: z.string().min(1, { message: "Please select a team." }),
});

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function SignupForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Load only the three specific teams in the Empire region
  useEffect(() => {
    const teamsQuery = query(
      collection(db, "teams"),
      where("regionId", "==", "empire"),
      where("isActive", "==", true)
    );
    
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      
      // Ensure we only show the three specific teams
      const validTeamIds = ["empire", "takeoverpros", "revolution"];
      setTeams(teamsData.filter(team => validTeamIds.includes(team.id)));
      setLoadingTeams(false);
      
      // If no teams are found, trigger team initialization
      if (teamsData.length === 0) {
        import("@/utils/init-teams").then(module => {
          module.initializeTeams().catch(err => {
            console.error("Failed to initialize teams:", err);
          });
        });
      }
    }, (error) => {
      console.error("Error loading teams:", error);
      setLoadingTeams(false);
    });

    return () => unsubscribe();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
      phoneNumber: "",
      role: undefined,
      teamId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      
      const user = userCredential.user;
      
      // Create user document in Firestore
      const userData = {
        uid: user.uid,
        email: values.email,
        displayName: values.displayName,
        role: values.role,
        teamId: values.teamId,
        avatarUrl: null,
        phoneNumber: values.phoneNumber,
        status: values.role === "closer" ? "Off Duty" : undefined,
        createdAt: serverTimestamp(),
        isPendingApproval: true, // New users need approval before they can access the system
      };
      
      await setDoc(doc(db, "users", user.uid), userData);
      
      // If the new user is a closer, create their closer record
      if (values.role === "closer") {
        const closerData = {
          uid: user.uid,
          name: values.displayName,
          status: "Off Duty",
          teamId: values.teamId,
          role: values.role,
          avatarUrl: null,
          phone: values.phoneNumber,
          lineupOrder: 999, // Will be normalized later
          createdAt: serverTimestamp(),
        };
        
        await setDoc(doc(db, "closers", user.uid), closerData);
      }
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created and is pending approval from a manager.",
      });
      
      // Navigation is handled by useAuth hook - will redirect to dashboard
      
    } catch (error: any) {
      let errorMessage = "Failed to create account";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please use a different email or login instead.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create Account</CardTitle>
        <CardDescription>
          Sign up for a new account to join LeadFlow as a setter or closer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Must be at least 6 characters long.
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="setter">
                        <div className="flex flex-col">
                          <span className="font-medium">Setter</span>
                          <span className="text-xs text-muted-foreground">
                            Create and manage leads
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="closer">
                        <div className="flex flex-col">
                          <span className="font-medium">Closer</span>
                          <span className="text-xs text-muted-foreground">
                            Accept and process assigned leads
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingTeams}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">{team.name}</span>
                              {team.description && (
                                <span className="text-xs text-muted-foreground">
                                  {team.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {loadingTeams && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading teams...
                    </p>
                  )}
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create Account"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
