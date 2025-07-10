
"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {signInWithEmailAndPassword, sendPasswordResetEmail} from "firebase/auth";
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
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {useToast} from "@/hooks/use-toast";
import {useState} from "react";
import {Loader2} from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email({message: "Invalid email address."}),
  password: z.string().min(6, {message: "Password must be at least 6 characters."}),
});

export default function LoginForm() {
  const {toast} = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      // Navigation is handled by useAuth hook
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordReset() {
    const email = form.getValues("email");
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for password reset instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Password Reset Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* iOS-Native Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2 tracking-tight">
          Sign In
        </h1>
        <p className="text-base text-muted-foreground font-medium">
          Welcome back to LeadFlow
        </p>
      </div>

      {/* Premium iOS-Style Form Container with Enhanced Glassmorphism */}
      <div className="relative mb-6">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 rounded-2xl blur-xl opacity-50"></div>
        
        {/* Main form container */}
        <div className="relative bg-card/50 backdrop-blur-2xl rounded-2xl p-1 border border-border/30 shadow-2xl shadow-black/10">
          <div className="bg-card/70 backdrop-blur-sm rounded-xl p-6 overflow-hidden">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden">
                <FormField
                  control={form.control}
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          {...field}
                          type="email"
                          placeholder="Email"
                          className="h-14 px-4 text-lg bg-secondary/20 border-0 rounded-2xl 
                                   placeholder:text-muted-foreground/60 
                                   focus:bg-secondary/40 focus:ring-2 focus:ring-primary/20 
                                   transition-all duration-300 font-medium
                                   hover:bg-secondary/30 backdrop-blur-sm
                                   shadow-inner shadow-black/5 min-h-[56px]"
                        />
                      </FormControl>
                      <FormMessage className="text-xs mt-1 ml-1 text-destructive/80" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({field}) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          {...field}
                          type="password" 
                          placeholder="Password"
                          className="h-14 px-4 text-lg bg-secondary/20 border-0 rounded-2xl
                                   placeholder:text-muted-foreground/60
                                   focus:bg-secondary/40 focus:ring-2 focus:ring-primary/20
                                   transition-all duration-300 font-medium
                                   hover:bg-secondary/30 backdrop-blur-sm
                                   shadow-inner shadow-black/5 min-h-[56px]"
                        />
                      </FormControl>
                      <FormMessage className="text-xs mt-1 ml-1 text-destructive/80" />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </div>
      </div>

      {/* Premium iOS-Native Primary Button */}
      <div className="relative mb-6">
        {/* Button glow effect */}
        <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg opacity-60 scale-105"></div>
        
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={isLoading}
          className="relative w-full h-14 text-lg font-semibold rounded-2xl 
                     bg-primary hover:bg-primary/90 
                     active:scale-[0.98] transition-all duration-200
                     shadow-xl shadow-primary/30 backdrop-blur-sm
                     disabled:opacity-60 disabled:scale-100
                     border-0 focus:ring-2 focus:ring-primary/30 focus:ring-offset-0
                     min-h-[56px] px-8 overflow-hidden"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </div>
      
      {/* iOS-Native Secondary Actions */}
      <div className="mt-8 space-y-6">
        {/* Forgot Password Link - Black Background */}
        <div className="text-center">
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isResettingPassword}
            className="text-base font-medium text-white 
                     transition-all duration-200 disabled:opacity-50 
                     bg-black border-0 outline-none p-0 m-0
                     cursor-pointer active:scale-95 transform
                     hover:opacity-70 focus:outline-none focus:ring-0
                     disabled:cursor-not-allowed"
          >
            {isResettingPassword ? (
              <span className="inline-flex items-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset email...
              </span>
            ) : (
              "Forgot your password?"
            )}
          </button>
        </div>

        {/* Sign Up Link */}
        <div className="text-center text-base text-muted-foreground/80">
          Don't have an account?{" "}
          <Link 
            href="/signup" 
            className="font-semibold text-primary hover:text-primary/80 
                     transition-all duration-200 active:scale-95 
                     inline-block transform focus:outline-none
                     underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
