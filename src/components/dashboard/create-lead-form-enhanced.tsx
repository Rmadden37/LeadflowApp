"use client";

// Enhanced Create Lead Form with Aurelian Salomon's iOS UX Excellence
// Fixes: Visual hierarchy, mobile experience, progressive disclosure, micro-interactions

import "@/styles/aurelian-ios-form-enhancements.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useState, useCallback, useRef, useEffect, ChangeEvent, useMemo } from "react";
import { Loader2, MapPin, Upload, X, FileImage, User, Phone, Calendar, Camera, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { DispatchType, LeadStatus } from "@/types";
import { LeadNotifications } from "@/lib/notification-service";

// Debounce utility
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

interface PlacePrediction {
  description: string;
  place_id: string;
}

const formSchema = z.object({
  customerName: z.string().min(2, { message: "Customer name must be at least 2 characters." }),
  customerPhone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).regex(/^\+?[0-9\s()-]+$/, { message: "Invalid phone number format."}),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  dispatchType: z.enum(["immediate", "scheduled"], { required_error: "Please select a dispatch type." }) as z.ZodType<DispatchType>,
  appointmentDate: z.date().optional(),
  appointmentTime: z.string().optional(),
  assignedCloserId: z.string().optional(),
  photos: z.array(z.instanceof(File)).max(5, { message: "Maximum 5 photos allowed." }).default([]),
}).superRefine((data, ctx) => {
  if (data.dispatchType === "scheduled") {
    if (!data.appointmentDate) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        message: "Date is required for scheduled dispatch.", 
        path: ["appointmentDate"] 
      });
    }
    if (!data.appointmentTime) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        message: "Time is required for scheduled dispatch.", 
        path: ["appointmentTime"] 
      });
    }
    
    if (data.appointmentDate && data.appointmentTime) {
      const [hours, minutes] = data.appointmentTime.split(':').map(Number);
      const selectedDateTime = new Date(data.appointmentDate);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      
      if (selectedDateTime <= new Date()) {
        ctx.addIssue({ 
          code: z.ZodIssueCode.custom, 
          message: "Scheduled appointment must be in the future.", 
          path: ["appointmentDate"] 
        });
      }
    }
  }
  
  if (data.photos) {
    for (let i = 0; i < data.photos.length; i++) {
      const file = data.photos[i];
      if (file.size > 5 * 1024 * 1024) {
        ctx.addIssue({ 
          code: z.ZodIssueCode.custom, 
          message: `Photo ${i + 1} is too large. Maximum size is 5MB.`, 
          path: ["photos"] 
        });
      }
      if (!file.type.startsWith('image/')) {
        ctx.addIssue({ 
          code: z.ZodIssueCode.custom, 
          message: `File ${i + 1} is not an image.`, 
          path: ["photos"] 
        });
      }
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

interface CreateLeadFormProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  embedded?: boolean;
}

export default function CreateLeadFormEnhanced({ isOpen, onClose, onSuccess, embedded = false }: CreateLeadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Memoize handleClose to prevent re-renders
  const handleClose = useMemo(() => onClose || (() => {}), [onClose]);
  
  // Step management for progressive disclosure
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  // Address autocomplete
  const [addressPredictions, setAddressPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit", // Changed from "onBlur" to prevent constant validation
    reValidateMode: "onSubmit", // Only revalidate on submit
    defaultValues: {
      customerName: "",
      customerPhone: "",
      address: "",
      dispatchType: "immediate",
      photos: [] as File[],
    },
  });

  // Don't watch any values - get them when needed to prevent re-renders
  const getPhotos = useCallback((): File[] => form.getValues("photos") || [], [form]);
  const getDispatchType = useCallback(() => form.getValues("dispatchType"), [form]);

  // Memoized step validation functions to prevent unnecessary re-renders
  const isStep1Valid = useCallback(() => {
    const values = form.getValues();
    return values.customerName.length >= 2 && 
           values.customerPhone.length >= 10 && 
           values.address.length >= 5;
  }, [form]);

  const isStep2Valid = useCallback(() => {
    const values = form.getValues();
    if (values.dispatchType === "scheduled") {
      return values.appointmentDate && values.appointmentTime;
    }
    return true;
  }, [form]);

  const fetchAddressPredictionsCore = useCallback(async (input: string) => {
    if (input.length < 3) {
      setAddressPredictions([]);
      setShowPredictions(false);
      return;
    }

    if (typeof window === 'undefined') return;

    setIsLoadingPredictions(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key not configured');
        setAddressPredictions([]);
        setShowPredictions(false);
        return;
      }
      
      const response = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}&key=${encodeURIComponent(apiKey)}`);
      if (response.ok) {
        const data = await response.json();
        // Only update if we still have the same input value (prevent race conditions)
        if (addressInputRef.current && addressInputRef.current.value === input) {
          setAddressPredictions(data.predictions || []);
          setShowPredictions(true);
        }
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
      setAddressPredictions([]);
      setShowPredictions(false);
    } finally {
      setIsLoadingPredictions(false);
    }
  }, []);

  // Create debounced version using useMemo to avoid recreating the debounced function
  const debouncedFetchAddressPredictions = useMemo(() => {
    return debounce((input: string) => {
      // Double-check that we should still fetch predictions
      if (addressInputRef.current && addressInputRef.current.value === input && input.length >= 3) {
        fetchAddressPredictionsCore(input);
      }
    }, 300);
  }, [fetchAddressPredictionsCore]);

  // Photo handling
  const handlePhotoSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const currentPhotos: File[] = form.getValues("photos") || [];
    
    if (currentPhotos.length + files.length > 5) {
      toast({
        title: "Too many photos",
        description: "Maximum 5 photos allowed.",
        variant: "destructive",
      });
      return;
    }

    const newPreviewUrls = typeof window !== 'undefined' 
      ? files.map(file => {
          try {
            return URL.createObjectURL(file);
          } catch (error) {
            console.error('Error creating object URL:', error);
            return '';
          }
        }).filter(url => url !== '')
      : [];
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    
    form.setValue("photos", [...currentPhotos, ...files]);
  }, [form, toast]);

  const removePhoto = useCallback((index: number) => {
    const currentPhotos: File[] = form.getValues("photos") || [];
    const currentPreviews = previewUrls;
    
    if (currentPreviews[index] && typeof window !== 'undefined') {
      URL.revokeObjectURL(currentPreviews[index]);
    }
    
    const newPhotos = currentPhotos.filter((_, i) => i !== index);
    const newPreviews = currentPreviews.filter((_, i) => i !== index);
    
    form.setValue("photos", newPhotos);
    setPreviewUrls(newPreviews);
  }, [form, previewUrls]);

  // Upload photos to Firebase Storage
  const uploadPhotos = useCallback(async (photos: File[]): Promise<string[]> => {
    setUploadingPhotos(true);
    const uploadPromises = photos.map(async (photo, index) => {
      const fileName = `leads/${Date.now()}-${index}-${photo.name}`;
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, photo);
      return getDownloadURL(snapshot.ref);
    });

    try {
      const urls = await Promise.all(uploadPromises);
      return urls;
    } finally {
      setUploadingPhotos(false);
    }
  }, []);

  // Form submission with better error handling
  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('Form submission started:', values);
    if (!user) {
      console.error('No user found');
      return;
    }

    setIsSubmitting(true);
    try {
      let photoUrls: string[] = [];
      if (values.photos && values.photos.length > 0) {
        photoUrls = await uploadPhotos(values.photos);
      }

      const selectedCloser = values.assignedCloserId && values.assignedCloserId === user?.uid
        ? { uid: user.uid, name: user.displayName || user.email || 'Self' }
        : null;

      const leadData: Record<string, unknown> = {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        address: values.address,
        dispatchType: values.dispatchType,
        status: values.dispatchType === "immediate" ? "waiting_assignment" : "scheduled",
        teamId: user.teamId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        setterId: user.uid,
        setterName: user.displayName || user.email,
        setterLocation: null,
        assignedCloserId: selectedCloser?.uid || null,
        assignedCloserName: selectedCloser?.name || null,
        dispositionNotes: "",
        photoUrls: photoUrls,
      };

      if (values.dispatchType === "scheduled" && values.appointmentDate && values.appointmentTime) {
        const [hours, minutes] = values.appointmentTime.split(':').map(Number);
        const scheduledDateTime = new Date(values.appointmentDate);
        scheduledDateTime.setHours(hours, minutes, 0, 0);
        leadData.scheduledAppointmentTime = Timestamp.fromDate(scheduledDateTime);
      }

      const docRef = await addDoc(collection(db, "leads"), leadData);
      console.log('Lead created successfully with ID:', docRef.id);

      try {
        await LeadNotifications.newLead({
          id: docRef.id,
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          address: values.address,
          status: leadData.status as LeadStatus,
          teamId: user.teamId,
          dispatchType: values.dispatchType,
          assignedCloserId: selectedCloser?.uid || null,
          assignedCloserName: selectedCloser?.name || null,
          createdAt: new Date() as unknown as Timestamp,
          updatedAt: new Date() as unknown as Timestamp,
          setterId: user.uid,
          setterName: user.displayName || user.email || 'Unknown',
          setterLocation: null,
          dispositionNotes: "",
          scheduledAppointmentTime: (leadData.scheduledAppointmentTime as Timestamp) || null,
          photoUrls: photoUrls
        });
      } catch (notificationError) {
        console.error("Error sending new lead notification:", notificationError);
      }

      toast({
        title: "Lead created successfully",
        description: `Lead for ${values.customerName} has been created.`,
      });

      form.reset();
      setPreviewUrls([]);
      setCurrentStep(1);
      
      if (onSuccess) onSuccess();
      handleClose();
      if (onClose) onClose();
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error creating lead",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, toast, uploadPhotos, handleClose, onSuccess, onClose, form]);

  // Step navigation functions wrapped in useCallback
  const nextStep = useCallback(() => {
    if (currentStep === 1 && isStep1Valid()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && isStep2Valid()) {
      setCurrentStep(3);
    }
  }, [currentStep, isStep1Valid, isStep2Valid]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Memoized progress indicator with Aurelian's signature iOS design
  const ProgressIndicator = useCallback(() => (
    <div className="mb-8">
      {/* Context Header - Tell users what they're doing */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">New Lead</h2>
        <p className="text-white/70 text-base">Add a new lead to your team's pipeline</p>
      </div>
      
      {/* iOS-Style Progress Indicator */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-3">
          {[1, 2, 3].map((step) => {
            const isActive = currentStep === step;
            const isCompleted = currentStep > step;
            return (
              <div key={step} className="flex items-center">
                <div
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/40 scale-110'
                      : isCompleted
                      ? 'bg-[#34C759] text-white shadow-lg shadow-[#34C759]/30'
                      : 'bg-white/10 text-white/50 border border-white/20'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : step}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-[#007AFF] animate-pulse opacity-40"></div>
                  )}
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-[#34C759]' : 'bg-white/20'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Step Context - Show what's happening in each step */}
      <div className="text-center mt-4">
        <p className="text-white/60 text-sm">
          {currentStep === 1 && "Customer Information"}
          {currentStep === 2 && "Dispatch Preferences"}
          {currentStep === 3 && "Photos & Review"}
        </p>
      </div>
    </div>
  ), [currentStep]);

  // Memoized step content components to prevent re-creation and focus loss
  const Step1Content = useCallback(() => (
    <div className="space-y-8">
      {/* Enhanced Section Header with Aurelian's Design */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#007AFF]/20 to-[#0056CC]/20 rounded-3xl mb-6 shadow-lg shadow-[#007AFF]/10">
          <User className="w-10 h-10 text-[#007AFF]" />
        </div>
        <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Customer Information</h3>
        <p className="text-white/70 text-lg leading-relaxed">Let's start with the essential customer details</p>
      </div>

      <FormField
        control={form.control}
        name="customerName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white text-lg font-semibold mb-3 block">Customer Name</FormLabel>
            <FormControl>
              <Input 
                {...field}
                placeholder="Enter customer's full name" 
                className="h-16 text-lg bg-white/8 border-2 border-white/15 text-white placeholder:text-white/50 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 transition-all duration-300 rounded-2xl px-6 shadow-lg shadow-black/10"
                autoComplete="name"
                autoFocus
              />
            </FormControl>
            <FormMessage className="text-[#FF3B30] text-base mt-2" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="customerPhone"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white text-lg font-semibold mb-3 block">Phone Number</FormLabel>
            <FormControl>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 text-[#007AFF]" />
                <Input 
                  {...field}
                  type="tel"
                  inputMode="tel"
                  placeholder="(555) 123-4567"
                  className="h-16 pl-16 text-lg bg-white/8 border-2 border-white/15 text-white placeholder:text-white/50 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 transition-all duration-300 rounded-2xl px-6 shadow-lg shadow-black/10"
                  autoComplete="tel"
                />
              </div>
            </FormControl>
            <FormMessage className="text-[#FF3B30] text-base mt-2" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white text-lg font-semibold mb-3 block">Address</FormLabel>
            <FormControl>
              <div className="relative">
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 text-[#007AFF]" />
                  <Input
                    {...field}
                    ref={addressInputRef}
                    placeholder="Enter street address"
                    className="h-16 pl-16 text-lg bg-white/8 border-2 border-white/15 text-white placeholder:text-white/50 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 transition-all duration-300 rounded-2xl px-6 shadow-lg shadow-black/10 enhanced-form-field"
                    data-address-input
                    onChange={(e) => {
                      // Prevent cursor jumping by batching updates
                      const value = e.target.value;
                      field.onChange(e);
                      // Only trigger autocomplete if we have meaningful input
                      if (value.length >= 3) {
                        debouncedFetchAddressPredictions(value);
                      } else {
                        setShowPredictions(false);
                        setAddressPredictions([]);
                      }
                    }}
                    onFocus={() => {
                      // Clear any pending predictions when focusing
                      if (field.value && field.value.length >= 3) {
                        debouncedFetchAddressPredictions(field.value);
                      }
                    }}
                    onBlur={(e) => {
                      // Only hide predictions if not clicking on a prediction
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      if (!relatedTarget || !relatedTarget.closest('[data-address-prediction]')) {
                        setTimeout(() => setShowPredictions(false), 150);
                      }
                    }}
                    autoComplete="address-line1"
                    inputMode="text"
                    enterKeyHint="next"
                  />
                  {isLoadingPredictions && (
                    <Loader2 className="absolute right-5 top-1/2 transform -translate-y-1/2 h-6 w-6 animate-spin text-[#007AFF]" />
                  )}
                </div>
                
                {showPredictions && addressPredictions.length > 0 && (
                  <div 
                    className="absolute top-full left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-2 border-white/20 rounded-2xl shadow-2xl overflow-hidden mt-2 address-predictions-dropdown"
                    data-address-predictions
                  >
                    {addressPredictions.map((prediction) => (
                      <div
                        key={prediction.place_id}
                        className="px-6 py-4 cursor-pointer hover:bg-white/10 text-white transition-all duration-200 border-b border-white/10 last:border-b-0 address-prediction-item"
                        data-address-prediction
                        onTouchStart={(e) => {
                          // Prevent iOS focus issues on touch
                          e.preventDefault();
                        }}
                        onMouseDown={(e) => {
                          // Prevent input blur when clicking dropdown
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Update the field value
                          field.onChange(prediction.description);
                          
                          // Close dropdown immediately
                          setShowPredictions(false);
                          setAddressPredictions([]);
                          
                          // Maintain focus on input without refocusing (prevents cursor jump)
                          if (addressInputRef.current && document.activeElement !== addressInputRef.current) {
                            requestAnimationFrame(() => {
                              addressInputRef.current?.focus();
                            });
                          }
                        }}
                      >
                        <div className="flex items-center space-x-4">
                          <MapPin className="h-5 w-5 text-[#007AFF] flex-shrink-0" />
                          <span className="text-base">{prediction.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage className="text-[#FF3B30] text-base mt-2" />
          </FormItem>
        )}
      />
    </div>
  ), [form, addressPredictions, showPredictions, isLoadingPredictions, debouncedFetchAddressPredictions, addressInputRef]);

  const Step2Content = useCallback(() => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#007AFF]/20 rounded-full mb-4">
          <Calendar className="w-8 h-8 text-[#007AFF]" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Dispatch Type</h3>
        <p className="text-white/60 text-sm">When should this lead be contacted?</p>
      </div>

      <FormField
        control={form.control}
        name="dispatchType"
        render={({ field }) => (
          <FormItem className="space-y-4">
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="space-y-3"
              >
                <div className="flex items-center space-x-4 p-4 rounded-xl bg-white/5 border border-white/20 hover:bg-white/10 transition-all duration-200 cursor-pointer">
                  <RadioGroupItem value="immediate" id="immediate" className="border-white/40 text-[#007AFF]" />
                  <div className="flex-1">
                    <label htmlFor="immediate" className="text-white text-base font-medium cursor-pointer">
                      Immediate Dispatch
                    </label>
                    <p className="text-white/60 text-sm">Contact this customer right away</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 rounded-xl bg-white/5 border border-white/20 hover:bg-white/10 transition-all duration-200 cursor-pointer">
                  <RadioGroupItem value="scheduled" id="scheduled" className="border-white/40 text-[#007AFF]" />
                  <div className="flex-1">
                    <label htmlFor="scheduled" className="text-white text-base font-medium cursor-pointer">
                      Scheduled Dispatch
                    </label>
                    <p className="text-white/60 text-sm">Schedule for a specific date and time</p>
                  </div>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {getDispatchType() === "scheduled" && (
        <div className="space-y-4 p-4 bg-[#007AFF]/10 rounded-xl border border-[#007AFF]/30">
          <h4 className="text-white font-medium">Schedule Appointment</h4>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="appointmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-10 text-sm bg-white/5 border-white/20 text-white focus:border-[#007AFF] focus:ring-[#007AFF]/20"
                      value={field.value ? field.value.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined;
                        field.onChange(date);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointmentTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Time</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      className="h-10 text-sm bg-white/5 border-white/20 text-white focus:border-[#007AFF] focus:ring-[#007AFF]/20"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}

      {["manager", "closer", "admin"].includes(user?.role || "") && (
        <FormField
          control={form.control}
          name="assignedCloserId"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl border border-white/20">
                <input
                  type="checkbox"
                  id="assignToSelf"
                  checked={field.value === user?.uid}
                  onChange={(e) => {
                    field.onChange(e.target.checked ? user?.uid : "");
                  }}
                  className="h-4 w-4 rounded border-white/40 text-[#007AFF] focus:ring-[#007AFF]/20"
                />
                <div className="flex-1">
                  <label htmlFor="assignToSelf" className="text-white text-base font-medium cursor-pointer">
                    Assign to myself
                  </label>
                  <p className="text-white/60 text-sm">Skip the assignment queue</p>
                </div>
              </div>
            </FormItem>
          )}
        />
      )}
    </div>
  ), [form, getDispatchType, user]);

  const Step3Content = useCallback(() => {
    const currentPhotos: File[] = getPhotos();
    
    return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#007AFF]/20 rounded-full mb-4">
          <Camera className="w-8 h-8 text-[#007AFF]" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Photos</h3>
        <p className="text-white/60 text-sm">Add up to 5 photos (optional)</p>
      </div>

      <FormField
        control={form.control}
        name="photos"
        render={() => (
          <FormItem>
            <FormControl>
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-6 bg-white/5 border-white/20 text-white hover:bg-white/10 transition-all duration-200"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={currentPhotos.length >= 5}
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    {currentPhotos.length === 0 ? 'Add Photos' : `Add More (${currentPhotos.length}/5)`}
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                />

                {currentPhotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/20">
                          {url ? (
                            <Image
                              src={url}
                              alt={`Preview ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 25vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileImage className="h-8 w-8 text-white/40" />
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )}, [getPhotos, previewUrls, handlePhotoSelect, removePhoto, fileInputRef]);

  // Memoized form content to prevent unnecessary re-renders
  const FormContent = useCallback(() => (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          console.log('Form onSubmit triggered');
          e.preventDefault();
          e.stopPropagation();
          
          // Debug form state
          console.log('Form values:', form.getValues());
          console.log('Form errors:', form.formState.errors);
          console.log('Form isValid:', form.formState.isValid);
          console.log('Current step:', currentStep);
          
          form.handleSubmit(onSubmit)(e);
        }} 
        className="space-y-8"
      >
        <ProgressIndicator />
        
        {currentStep === 1 && <Step1Content />}
        {currentStep === 2 && <Step2Content />}
        {currentStep === 3 && <Step3Content />}
        
        <div className="flex justify-between pt-8 border-t border-white/10">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="h-14 px-8 bg-white/8 border-2 border-white/15 text-white hover:bg-white/12 hover:border-white/25 transition-all duration-300 rounded-2xl text-lg font-semibold shadow-lg shadow-black/10"
            >
              Previous
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-14 px-8 bg-white/8 border-2 border-white/15 text-white hover:bg-white/12 hover:border-white/25 transition-all duration-300 rounded-2xl text-lg font-semibold shadow-lg shadow-black/10"
            >
              {embedded ? 'Back' : 'Cancel'}
            </Button>
          )}
          
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={currentStep === 1 ? !isStep1Valid() : currentStep === 2 ? !isStep2Valid() : false}
              className="h-14 px-10 bg-gradient-to-r from-[#007AFF] to-[#0056CC] hover:from-[#007AFF]/90 hover:to-[#0056CC]/90 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white shadow-xl shadow-[#007AFF]/30 hover:shadow-2xl hover:shadow-[#007AFF]/40 transition-all duration-300 rounded-2xl text-lg font-semibold transform hover:scale-105 active:scale-95"
            >
              Continue
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={isSubmitting || uploadingPhotos}
              className="h-14 px-10 bg-gradient-to-r from-[#34C759] to-[#28A745] hover:from-[#34C759]/90 hover:to-[#28A745]/90 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white shadow-xl shadow-[#34C759]/30 hover:shadow-2xl hover:shadow-[#34C759]/40 transition-all duration-300 rounded-2xl text-lg font-semibold transform hover:scale-105 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  {uploadingPhotos ? "Uploading Photos..." : "Creating Lead..."}
                </>
              ) : (
                "Create Lead"
              )}
            </Button>
          )}
        </div>
      </form>
    </Form>
  ), [form, onSubmit, currentStep, isSubmitting, uploadingPhotos, Step1Content, Step2Content, Step3Content, nextStep, prevStep, isStep1Valid, isStep2Valid, handleClose, embedded, ProgressIndicator]);

  // Render based on mode
  if (embedded) {
    return <FormContent />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-gray-900 border border-white/10 p-0">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-white">Create New Lead</DialogTitle>
            <DialogDescription className="text-white/60">
              Follow the steps to create a new lead for your team
            </DialogDescription>
          </DialogHeader>
          <FormContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
