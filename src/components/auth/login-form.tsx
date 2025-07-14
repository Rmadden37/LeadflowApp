"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { auth } from "@/lib/firebase";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Loader2, Mail, Lock } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export default function LoginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const isMountedRef = useRef(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe state setter that checks if component is still mounted
  const safeSetIsLoading = (value: boolean) => {
    if (isMountedRef.current) {
      setIsLoading(value);
    }
  };

  const safeSetIsResettingPassword = (value: boolean) => {
    if (isMountedRef.current) {
      setIsResettingPassword(value);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    safeSetIsLoading(true);
    console.log('🔐 Login attempt for:', values.email);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      console.log('✅ Login successful', userCredential.user?.uid);
      
      if (isMountedRef.current) {
        toast({
          title: "Login Successful",
          description: "Welcome back! Redirecting to dashboard...",
        });
        
        // AuthProvider will handle the redirect automatically
        // No need for manual redirect here
      }
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      if (!isMountedRef.current) return;
      
      let errorMessage = "Please check your credentials and try again.";
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email address.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password. Please try again.";
          break;
        case 'auth/invalid-credential':
          errorMessage = "Invalid email or password.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your connection and try again.";
          break;
        default:
          errorMessage = error.message || "Login failed. Please try again.";
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      safeSetIsLoading(false);
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

    safeSetIsResettingPassword(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      
      if (isMountedRef.current) {
        toast({
          title: "Reset Email Sent",
          description: "Check your inbox for password reset instructions.",
        });
      }
      
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      
      if (!isMountedRef.current) return;
      
      let errorMessage = "Failed to send reset email.";
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email address.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many reset attempts. Please try again later.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your connection and try again.";
          break;
        default:
          errorMessage = error.message || "An unexpected error occurred.";
      }
      
      toast({
        title: "Password Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      safeSetIsResettingPassword(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Main Form Container */}
      <div className="relative">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-60"></div>
        
        {/* Form Card */}
        <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input 
                          {...field} 
                          type="email" 
                          placeholder="Email address" 
                          disabled={isLoading || isResettingPassword}
                          className="h-14 pl-12 pr-4 text-base bg-gray-800/50 border-gray-600/50 rounded-2xl 
                                   placeholder:text-gray-400 text-white
                                   focus:bg-gray-800/70 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                                   transition-all duration-300
                                   hover:bg-gray-800/60 hover:border-gray-500/50
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-sm mt-2" />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input 
                          {...field} 
                          type="password" 
                          placeholder="Password" 
                          disabled={isLoading || isResettingPassword}
                          className="h-14 pl-12 pr-4 text-base bg-gray-800/50 border-gray-600/50 rounded-2xl 
                                   placeholder:text-gray-400 text-white
                                   focus:bg-gray-800/70 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                                   transition-all duration-300
                                   hover:bg-gray-800/60 hover:border-gray-500/50
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-sm mt-2" />
                  </FormItem>
                )}
              />

              {/* Forgot Password Link - Centered within card */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword || isLoading}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResettingPassword ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    "Forgot password?"
                  )}
                </button>
              </div>

              {/* Sign In Button */}
              <Button 
                type="submit" 
                disabled={isLoading || isResettingPassword} 
                className="w-full h-14 text-base font-semibold rounded-2xl 
                         bg-gradient-to-r from-blue-600 to-purple-600 
                         hover:from-blue-500 hover:to-purple-500 
                         text-white border-0 shadow-lg
                         transition-all duration-300 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:shadow-xl hover:shadow-blue-500/25"
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
            </form>
          </Form>
        </div>
      </div>

      {/* Sign Up Section - Better separated */}
      <div className="mt-8 text-center">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700/50"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-900 text-gray-400">or</span>
          </div>
        </div>
        
        <div className="mt-6">
          <p className="text-gray-400 text-base">
            Don't have an account?{" "}
            <a 
              href="/signup" 
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline underline-offset-4"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}