"use client";

// Ensure this component is only imported and used in other client components.
// Do NOT use this component directly in a server component or pass non-serializable props from server to here.

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useState, useCallback, useRef, useEffect, ChangeEvent } from "react";
import { Loader2, MapPin, Upload, X, FileImage } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { DispatchType, LeadStatus } from "@/types";
import { LeadNotifications } from "@/lib/notification-service";
import { createPortal } from "react-dom";

// Debounce utility function - STABLE VERSION
const useDebouncedCallback = (callback: Function, delay: number) => {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Create stable debounced function
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]); // Only recreate if delay changes
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
  photos: z.array(z.instanceof(File)).max(5, { message: "Maximum 5 photos allowed." }).optional(),
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
    
    // Validate that the selected date/time is in the future
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
  
  // Photo validation
  if (data.photos) {
    for (let i = 0; i < data.photos.length; i++) {
      const file = data.photos[i];
      if (file.size > 5 * 1024 * 1024) { // 5MB
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

interface CreateLeadFormProps {
  isOpen: boolean;
  onClose?: () => void; // Make optional and properly typed for serialization
  onSuccess?: () => void; // Optional success callback
  embedded?: boolean; // For page embedding vs modal
}

// Ensure this component is only used in client components and not imported into server components.
// Do NOT import or use this component in server components. Only pass serializable props (no functions from server).
export default function CreateLeadForm({ isOpen, onClose, onSuccess, embedded = false }: CreateLeadFormProps) {
  const { user } = useAuth();
  const handleClose = onClose || (() => {});
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressPredictions, setAddressPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit", // Change from "onBlur" to prevent validation on every keystroke
    reValidateMode: "onSubmit", // Only revalidate on submit
    defaultValues: {
      customerName: "",
      customerPhone: "",
      address: "",
      dispatchType: "immediate",
      photos: [],
    },
  });

  const dispatchType = form.watch("dispatchType");
  const photos = form.watch("photos") || [];

  // Set default appointment time to 5:00 PM when scheduled dispatch is selected
  useEffect(() => {
    if (dispatchType === "scheduled" && !form.getValues("appointmentTime")) {
      form.setValue("appointmentTime", "17:00");
    }
  }, [dispatchType, form]);

  // Simplified iOS keyboard fix - prevent viewport manipulation
  useEffect(() => {
    if (isOpen) {
      // Only prevent body scroll, don't manipulate viewport
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Simplified input focus handler - no forced scrolling or focus manipulation
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Simply let the browser handle natural focus behavior
    // Only add minimal scroll margin if needed
    if (window.innerWidth <= 768) {
      e.target.style.scrollMarginBottom = '8rem';
    }
  };

  // Simplified keydown handler - only prevent Enter submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // Simple cleanup for address predictions
  useEffect(() => {
    return () => {
      setShowPredictions(false);
      setAddressPredictions([]);
    };
  }, []);

  // Stable address autocomplete function
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
        setAddressPredictions(data.predictions || []);
        setShowPredictions(true);
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
      setAddressPredictions([]);
      setShowPredictions(false);
    } finally {
      setIsLoadingPredictions(false);
    }
  }, []);

  // Create debounced version using our custom hook
  const fetchAddressPredictions = useDebouncedCallback(fetchAddressPredictionsCore, 300);

  // Handle photo selection
  const handlePhotoSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const currentPhotos = form.getValues("photos") || [];
    
    if (currentPhotos.length + files.length > 5) {
      toast({
        title: "Too many photos",
        description: "Maximum 5 photos allowed.",
        variant: "destructive",
      });
      return;
    }

    // Create preview URLs (browser only)
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
    
    // Update form
    form.setValue("photos", [...currentPhotos, ...files]);
  }, [form, toast]);

  // Remove photo
  const removePhoto = useCallback((index: number) => {
    const currentPhotos = form.getValues("photos") || [];
    const currentPreviews = previewUrls;
    
    // Revoke URL to prevent memory leaks (browser only)
    if (currentPreviews[index] && typeof window !== 'undefined') {
      URL.revokeObjectURL(currentPreviews[index]);
    }
    
    // Update arrays
    const newPhotos = currentPhotos.filter((_, i) => i !== index);
    const newPreviews = currentPreviews.filter((_, i) => i !== index);
    
    form.setValue("photos", newPhotos);
    setPreviewUrls(newPreviews);
  }, [form, previewUrls]);

  // Upload photos to Firebase Storage
  const uploadPhotos = async (photos: File[]): Promise<string[]> => {
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
  };

  // Form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Upload photos if any
      let photoUrls: string[] = [];
      if (values.photos && values.photos.length > 0) {
        photoUrls = await uploadPhotos(values.photos);
      }

      // Prepare lead data
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

      // Add scheduled appointment data if applicable
      if (values.dispatchType === "scheduled" && values.appointmentDate && values.appointmentTime) {
        const [hours, minutes] = values.appointmentTime.split(':').map(Number);
        const scheduledDateTime = new Date(values.appointmentDate);
        scheduledDateTime.setHours(hours, minutes, 0, 0);
        
        leadData.scheduledAppointmentTime = Timestamp.fromDate(scheduledDateTime);
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, "leads"), leadData);

      // Send new lead notification
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
        // Don't fail the lead creation if notification fails
      }

      toast({
        title: "Lead created successfully",
        description: `Lead for ${values.customerName} has been created.`,
      });

      // Reset form and close
      form.reset();
      setPreviewUrls([]);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
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
  };

  // Cleanup preview URLs on unmount (browser only)
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        previewUrls.forEach(url => URL.revokeObjectURL(url));
      }
    };
  }, [previewUrls]);

  // Memoized form content to prevent re-renders
  const FormContent = useCallback(() => (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          try {
            form.handleSubmit(onSubmit)(e);
          } catch (error) {
            console.error('Form submission error:', error);
            e.preventDefault();
          }
        }} 
        className="create-lead-form space-y-4 sm:space-y-6 relative isolate"
      >
            {/* Customer Name */}
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Customer Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="Enter customer name" 
                      className="text-sm sm:text-base ios-input"
                      onFocus={handleInputFocus}
                      onKeyDown={handleKeyDown}
                      autoComplete="name"
                      enterKeyHint="next"
                      data-lpignore="true"
                      spellCheck="false"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Number */}
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      type="tel"
                      inputMode="tel"
                      pattern="[0-9\s\(\)\-\+]*"
                      placeholder="(555) 123-4567" 
                      className="text-sm sm:text-base ios-input"
                      onFocus={handleInputFocus}
                      onKeyDown={handleKeyDown}
                      autoComplete="tel"
                      enterKeyHint="next"
                      data-lpignore="true"
                      spellCheck="false"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address with Autocomplete */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          ref={addressInputRef}
                          placeholder="Enter address"
                          className="pl-10 text-sm sm:text-base"
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(e); // Call field.onChange first
                            fetchAddressPredictions(value); // Then debounced function
                          }}
                          onFocus={handleInputFocus}
                          onKeyDown={handleKeyDown}
                          onBlur={() => {
                            // Longer delay to allow dropdown clicks
                            setTimeout(() => setShowPredictions(false), 200);
                          }}
                          autoComplete="address-line1"
                          enterKeyHint="next"
                        />
                        {isLoadingPredictions && (
                          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* Enhanced Address Predictions Dropdown */}
                      {showPredictions && addressPredictions.length > 0 && (
                        <div 
                          className="absolute top-full left-0 right-0 z-50 address-dropdown max-h-60 overflow-y-auto mt-1"
                        >
                          {addressPredictions.map((prediction) => (
                            <div
                              key={prediction.place_id}
                              className="px-4 py-3 cursor-pointer hover:bg-white/10 text-sm transition-colors duration-150"
                              onMouseDown={(e) => {
                                // Prevent blur event that would lose focus
                                e.preventDefault();
                              }}
                              onClick={() => {
                                field.onChange(prediction.description);
                                setShowPredictions(false);
                                setAddressPredictions([]);
                                // Keep focus on the input after selection
                                setTimeout(() => {
                                  if (addressInputRef.current) {
                                    addressInputRef.current.focus();
                                  }
                                }, 0);
                              }}
                            >
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{prediction.description}</span>
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

            {/* Dispatch Type */}
            <FormField
              control={form.control}
              name="dispatchType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm sm:text-base">Dispatch Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="immediate" id="immediate" />
                        <label htmlFor="immediate" className="text-sm sm:text-base cursor-pointer">
                          Immediate Dispatch
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="scheduled" id="scheduled" />
                        <label htmlFor="scheduled" className="text-sm sm:text-base cursor-pointer">
                          Scheduled Dispatch
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assign to Self - For managers, closers and admins */}
            {["manager", "closer", "admin"].includes(user?.role || "") && (
              <FormField
                control={form.control}
                name="assignedCloserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Assign to Self</FormLabel>
                    <FormDescription className="text-xs sm:text-sm">
                      Assign this lead directly to yourself, bypassing the assignment queue.
                    </FormDescription>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="assignToSelf"
                        checked={field.value === user?.uid}
                        onChange={(e) => {
                          field.onChange(e.target.checked ? user?.uid : "");
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="assignToSelf" className="text-sm cursor-pointer">
                        Assign this lead to me
                      </label>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Scheduled Appointment Fields - Simple Implementation */}
            {dispatchType === "scheduled" && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg isolate">
                <h4 className="font-medium text-sm sm:text-base">Schedule Appointment</h4>
                <div className="text-sm text-muted-foreground">
                  Select a date and time for the scheduled appointment:
                </div>
                
                {/* Date Picker */}
                <FormField
                  control={form.control}
                  name="appointmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="text-sm sm:text-base [&::-webkit-calendar-picker-indicator]:invert"
                          value={field.value ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined;
                            field.onChange(date);
                          }}
                          onFocus={handleInputFocus}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time Picker */}
                <FormField
                  control={form.control}
                  name="appointmentTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          className="text-sm sm:text-base [&::-webkit-calendar-picker-indicator]:invert"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          onFocus={handleInputFocus}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Photo Upload */}
            <FormField
              control={form.control}
              name="photos"
              render={({ field: _field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Photos <span className="text-muted-foreground">(Optional)</span></FormLabel>
                  <FormDescription className="text-xs sm:text-sm">
                    Upload up to 5 photos to help with the lead. Photos are optional and not required for submission.
                  </FormDescription>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Upload Button */}
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={photos.length >= 5}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photos
                        </Button>
                        {photos.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {photos.length}/5 photos
                          </span>
                        )}
                      </div>

                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />

                      {/* Photo Previews */}
                      {photos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {previewUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                                {url ? (
                                  <Image
                                    src={url}
                                    alt={`Preview ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 50vw, 33vw"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <FileImage className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removePhoto(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                                <FileImage className="h-3 w-3 inline mr-1" />
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

            {/* Footer with buttons */}
            <div className={`flex ${embedded ? 'justify-end' : 'flex-col sm:flex-row'} gap-2 sm:gap-4 pt-4 border-t dark:border-turquoise/20`}>
              <Button 
                type="button" 
                onClick={handleClose}
                className="text-sm sm:text-base dark:card-glass dark:glow-ios-blue dark:border-[#007AFF]/30 dark:hover:glow-ios-blue"
              >
                {embedded ? 'Back' : 'Cancel'}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || uploadingPhotos}
                className="text-sm sm:text-base bg-gradient-to-r from-[#007AFF] to-[#0056CC] hover:from-[#007AFF]/90 hover:to-[#0056CC]/90 shadow-lg shadow-[#007AFF]/25 hover:shadow-xl hover:shadow-[#007AFF]/30 transition-all duration-300 border-0 text-white dark:glow-ios-blue"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadingPhotos ? "Uploading..." : "Creating..."}
                  </>
                ) : (
                  "Create Lead"
                )}
              </Button>
            </div>
          </form>
        </Form>
  ), [form, onSubmit, dispatchType, photos, isSubmitting, uploadingPhotos, previewUrls, user, embedded, handleClose, fetchAddressPredictions, showPredictions, addressPredictions, isLoadingPredictions, addressInputRef]);

  // Render based on mode
  if (embedded) {
    return <FormContent />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-gray-900 border border-white/10 p-0">
        <div className="p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg sm:text-xl text-white">Create New Lead</DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-gray-300">
              Fill out the form below to create a new lead.
            </DialogDescription>
          </DialogHeader>
          <FormContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
