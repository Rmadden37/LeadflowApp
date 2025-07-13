"use client";

import _Link from "next/link";
import React, {useState, useEffect, useRef, lazy, Suspense} from "react";
import {useAuth} from "@/hooks/use-auth";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {auth, db, storage} from "@/lib/firebase";
import {updateProfile, sendPasswordResetEmail} from "firebase/auth";
import {doc, updateDoc, getDoc} from "firebase/firestore";
import {ref as storageRef, uploadBytesResumable, getDownloadURL} from "firebase/storage";
import {PremiumProfileImage} from "@/components/premium/premium-images";
import {useToast} from "@/hooks/use-toast";
import {Loader2, User, Mail, ShieldCheck, Edit3, KeyRound, Camera, Users, Bell, Settings, Shield, Database, Palette, LogOut, UserCheck} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose} from "@/components/ui/dialog";

// Lazy load heavy components
const ReactCrop = lazy(() => import("react-image-crop").then(module => ({ default: module.default })));
const NotificationSettings = lazy(() => import("@/components/notifications/notification-settings"));
// const ThemeToggleButton = lazy(() => import("@/components/theme-toggle-button").then(module => ({ default: module.ThemeToggleButton })));

// Import crop types directly
import type {Crop, PixelCrop} from "react-image-crop";
import {centerCrop, makeAspectCrop} from "react-image-crop";


const profileFormSchema = z.object({
  displayName: z.string().min(2, {message: "Display name must be at least 2 characters."}).max(50, {message: "Display name cannot exceed 50 characters."}),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Helper function to preview the crop
async function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: PixelCrop,
  scale = 1,
  rotate = 0,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No 2d context");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio : 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  const rotateRads = (rotate * Math.PI) / 180;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.rotate(rotateRads);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
  );
  ctx.restore();
}


export default function ProfilePage() {
  const {user, firebaseUser, loading: authLoading, logout} = useAuth();
  const {toast} = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  // Profile picture state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [upImgSrc, setUpImgSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    if (user?.displayName) {
      form.reset({displayName: user.displayName});
    }
  }, [user, form]);

  const handleUpdateProfile = async (values: ProfileFormValues) => {
    if (!firebaseUser || !user) {
      toast({title: "Error", description: "User not found.", variant: "destructive"});
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await updateProfile(firebaseUser, {displayName: values.displayName});
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {displayName: values.displayName});

      if (user.role === "closer") {
        const closerDocRef = doc(db, "closers", user.uid);
        const closerDocSnap = await getDoc(closerDocRef);
        if (closerDocSnap.exists()) {
          await updateDoc(closerDocRef, {name: values.displayName});
        }
      }

      toast({
        title: "Profile Updated",
        description: "Your display name has been successfully updated.",
      });
      form.reset({displayName: values.displayName});
    } catch (_error: unknown) {
      toast({
        title: "Update Failed",
        description: "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({title: "Error", description: "Email address not found.", variant: "destructive"});
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your inbox for a password reset link. You will be logged out.",
      });
      setTimeout(async () => {
        await logout();
      }, 3000);
    } catch (_error: unknown) {
      toast({
        title: "Request Failed",
        description: "Could not send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () => setUpImgSrc(reader.result?.toString() || ""));
      reader.readAsDataURL(e.target.files[0]);
      setIsPhotoModalOpen(true);
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const {width, height} = e.currentTarget;
    // Use px unit and width for compatibility with react-image-crop v10+
    const initialCrop = centerCrop(
      makeAspectCrop({unit: "px", width: Math.floor(Math.min(width, height) * 0.9), height: Math.floor(Math.min(width, height) * 0.9)}, 1, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  }

  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      previewCanvasRef.current
    ) {
      canvasPreview(
        imgRef.current,
        previewCanvasRef.current,
        completedCrop
      );
    }
  }, [completedCrop]);


  const handleUploadCroppedImage = async () => {
    if (!completedCrop || !previewCanvasRef.current || !user) {
      toast({title: "Error", description: "Crop details or user not available.", variant: "destructive"});
      return;
    }
    
    console.log('Starting upload process...');
    console.log('User:', user.uid);
    console.log('Completed crop:', completedCrop);
    
    setIsUploadingPhoto(true);
    const canvas = previewCanvasRef.current;
    
    console.log('Creating blob from canvas...');
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        toast({title: "Error", description: "Could not create image blob.", variant: "destructive"});
        setIsUploadingPhoto(false);
        return;
      }

      console.log('Blob created successfully:', blob.size, 'bytes');
      const fileRef = storageRef(storage, `profile_pictures/${user.uid}/profile.png`);
      console.log('Storage ref created:', fileRef.fullPath);
      
      try {
        // Use uploadBytesResumable for better error handling and progress tracking
        console.log('Starting Firebase upload...');
        const uploadTask = uploadBytesResumable(fileRef, blob, {contentType: "image/png"});
        
        // Wait for upload completion with proper error handling
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              // Optional: Add progress tracking here if needed
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Upload progress:', Math.round(progress) + '%');
            },
            (error) => {
              console.error('Upload error:', error);
              console.error('Error code:', error.code);
              console.error('Error message:', error.message);
              reject(error);
            },
            () => {
              console.log('Upload completed successfully');
              resolve(uploadTask.snapshot);
            }
          );
        });

        console.log('Getting download URL...');
        const downloadURL = await getDownloadURL(fileRef);
        console.log('Download URL obtained:', downloadURL);

        console.log('Updating user document...');
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {avatarUrl: downloadURL});

        if (user.role === "closer") {
          console.log('Updating closer document...');
          const closerDocRef = doc(db, "closers", user.uid);
          const closerDocSnap = await getDoc(closerDocRef);
          if (closerDocSnap.exists()) {
            await updateDoc(closerDocRef, {avatarUrl: downloadURL});
          }
        }

        console.log('Upload process completed successfully');
        toast({title: "Profile Photo Updated", description: "Your new photo is now active."});
        setIsPhotoModalOpen(false);
        setUpImgSrc("");
      } catch (error: unknown) {
        console.error('Profile photo upload error:', error);
        console.error('Error details:', {
          code: (error as any)?.code,
          message: (error as any)?.message,
          stack: (error as any)?.stack
        });
        toast({
          title: "Upload Failed",
          description: (error as any)?.message || "Could not upload profile picture. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingPhoto(false);
      }
    }, "image/png", 0.95);
  };


  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <p className="text-destructive">User not found. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="ios-settings-container">
      {/* iOS Profile Header */}
      <div className="ios-profile-header">
        <div className="ios-profile-avatar">          {user.avatarUrl ? (
            <PremiumProfileImage 
              src={user.avatarUrl}
              name={user.displayName || user.email || "User"}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 
            (user.email ? user.email.substring(0, 2).toUpperCase() : "U")
          )}
        </div>
        <div className="ios-profile-name">
          {user.displayName || "User"}
        </div>
        <div className="ios-profile-email">
          {user.email}
        </div>
      </div>

      {/* Personal Information Group */}
      <div className="ios-settings-group">
        <div className="ios-settings-group-title">Personal Information</div>
        <div className="ios-settings-card">
          <div className="ios-settings-row" onClick={() => document.getElementById("photoInput")?.click()}>
            <div className="ios-settings-icon" style={{ background: 'var(--ios-blue)' }}>
              <Camera size={16} />
            </div>
            <div className="ios-settings-content">
              <div className="ios-settings-title">Profile Photo</div>
              <div className="ios-settings-subtitle">
                {isUploadingPhoto ? "Uploading..." : "Tap to change photo"}
              </div>
            </div>
            <div className="ios-settings-chevron">›</div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateProfile)}>
              <FormField
                control={form.control}
                name="displayName"
                render={({field}) => (
                  <div className="ios-settings-row">
                    <div className="ios-settings-icon" style={{ background: 'var(--ios-green)' }}>
                      <Edit3 size={16} />
                    </div>
                    <div className="ios-settings-content">
                      <div className="ios-settings-title">Display Name</div>
                      <Input 
                        {...field} 
                        placeholder="Your Name" 
                        className="border-none bg-transparent p-0 text-var(--ios-text-secondary) text-sm focus:ring-0"
                      />
                    </div>
                  </div>
                )}
              />
              <div className="ios-settings-row">
                <Button 
                  type="submit" 
                  disabled={isUpdatingProfile} 
                  className="w-full bg-var(--ios-blue) hover:bg-var(--ios-blue-dark) border-0 rounded-lg h-12"
                >
                  {isUpdatingProfile ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Account Information Group */}
      <div className="ios-settings-group">
        <div className="ios-settings-group-title">Account Information</div>
        <div className="ios-settings-card">
          <div className="ios-settings-row">
            <div className="ios-settings-icon" style={{ background: 'var(--ios-gray)' }}>
              <Mail size={16} />
            </div>
            <div className="ios-settings-content">
              <div className="ios-settings-title">Email</div>
              <div className="ios-settings-subtitle">{user.email}</div>
            </div>
          </div>
          
          <div className="ios-settings-row">
            <div className="ios-settings-icon" style={{ background: 'var(--ios-orange)' }}>
              <ShieldCheck size={16} />
            </div>
            <div className="ios-settings-content">
              <div className="ios-settings-title">Role</div>
              <div className="ios-settings-subtitle capitalize">{user.role}</div>
            </div>
          </div>

          {user.teamId && (
            <div className="ios-settings-row">
              <div className="ios-settings-icon" style={{ background: 'var(--ios-purple)' }}>
                <Users size={16} />
              </div>
              <div className="ios-settings-content">
                <div className="ios-settings-title">Team ID</div>
                <div className="ios-settings-subtitle">{user.teamId}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Group */}
      <div className="ios-settings-group">
        <div className="ios-settings-group-title">Security</div>
        <div className="ios-settings-card">
          <div className="ios-settings-row" onClick={handlePasswordReset}>
            <div className="ios-settings-icon" style={{ background: 'var(--ios-red)' }}>
              <KeyRound size={16} />
            </div>
            <div className="ios-settings-content">
              <div className="ios-settings-title">Reset Password</div>
              <div className="ios-settings-subtitle">Send reset link to email</div>
            </div>
            <div className="ios-settings-chevron">›</div>
          </div>
        </div>
      </div>

      {/* Notifications Group */}
      <div className="ios-settings-group">
        <div className="ios-settings-group-title">Notifications</div>
        <div className="ios-settings-card">
          <div className="ios-settings-row">
            <div className="ios-settings-icon" style={{ background: 'var(--ios-red)' }}>
              <Bell size={16} />
            </div>
            <div className="ios-settings-content">
              <div className="ios-settings-title">Push Notifications</div>
              <div className="ios-settings-subtitle">Configure notification preferences</div>
            </div>
          </div>
          <div className="p-4">
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--ios-blue)]" />
                <span className="ml-2 text-sm text-[var(--ios-text-secondary)]">Loading notifications...</span>
              </div>
            }>
              <NotificationSettings />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Preferences Group */}
      <div className="ios-settings-group">
        <div className="ios-settings-group-title">Preferences</div>
        <div className="ios-settings-card">
          <div className="ios-settings-row">
            <div className="ios-settings-icon" style={{ background: 'var(--ios-indigo)' }}>
              <Palette size={16} />
            </div>
            <div className="ios-settings-content">
              <div className="ios-settings-title">Theme</div>
              <div className="ios-settings-subtitle">Light, dark, or system</div>
            </div>
            <div className="ios-settings-action">
              {/* <Suspense fallback={<div>Loading theme toggle...</div>}><ThemeToggleButton /></Suspense> */}
              {/* Theme toggle button removed during legacy cleanup. Implement new theme toggle if needed. */}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tools Group - Only for Admin Users */}
      {user.role === 'admin' && (
        <div className="ios-settings-group">
          <div className="ios-settings-group-title">Administration</div>
          <div className="ios-settings-card">
            <div className="ios-settings-row" onClick={() => window.location.href = '/dashboard/admin-tools'}>
              <div className="ios-settings-icon" style={{ background: 'var(--ios-red)' }}>
                <Settings size={16} />
              </div>
              <div className="ios-settings-content">
                <div className="ios-settings-title">System Administration</div>
                <div className="ios-settings-subtitle">Manage system settings</div>
              </div>
              <div className="ios-settings-chevron">›</div>
            </div>
            
            <div className="ios-settings-row" onClick={() => window.location.href = '/dashboard/admin-tools/users'}>
              <div className="ios-settings-icon" style={{ background: 'var(--ios-blue)' }}>
                <UserCheck size={16} />
              </div>
              <div className="ios-settings-content">
                <div className="ios-settings-title">User Management</div>
                <div className="ios-settings-subtitle">Manage accounts and permissions</div>
              </div>
              <div className="ios-settings-chevron">›</div>
            </div>
            
            <div className="ios-settings-row" onClick={() => window.location.href = '/dashboard/admin-tools/database'}>
              <div className="ios-settings-icon" style={{ background: 'var(--ios-purple)' }}>
                <Database size={16} />
              </div>
              <div className="ios-settings-content">
                <div className="ios-settings-title">Database Management</div>
                <div className="ios-settings-subtitle">Database maintenance tools</div>
              </div>
              <div className="ios-settings-chevron">›</div>
            </div>
          </div>
        </div>
      )}

      {/* Account Actions Group */}
      <div className="ios-settings-group">
        <div className="ios-settings-card">
          <div className="ios-settings-row" onClick={logout}>
            <div className="ios-settings-icon" style={{ background: 'var(--ios-red)' }}>
              <LogOut size={16} />
            </div>
            <div className="ios-settings-content">
              <div className="ios-settings-title" style={{ color: 'var(--ios-red)' }}>Sign Out</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input for photo upload */}
      <input type="file" id="photoInput" accept="image/*" onChange={onSelectFile} className="hidden" />

      {/* Photo Cropping Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPhotoModalOpen(false);
          setUpImgSrc("");
        } else {
          setIsPhotoModalOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Your Photo</DialogTitle>
            <DialogDescription>
              Adjust the selection to crop your photo. A 1x1 aspect ratio is maintained.
            </DialogDescription>
          </DialogHeader>
          {upImgSrc && (
            <div className="flex flex-col items-center space-y-4">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                minWidth={100}
                minHeight={100}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  alt="Profile picture to crop"
                  src={upImgSrc}
                  onLoad={onImageLoad}
                  style={{ maxBlockSize: "70vh" }}
                />
              </ReactCrop>
              <div>
                <h4 className="text-sm font-medium mb-1">Preview:</h4>
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    border: "1px solid black",
                    objectFit: "contain",
                    inlineSize: completedCrop?.width ?? 0,
                    blockSize: completedCrop?.height ?? 0,
                    borderRadius: "50%",
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {
                setUpImgSrc(""); setCrop(undefined);
              }} disabled={isUploadingPhoto}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleUploadCroppedImage} disabled={isUploadingPhoto || !completedCrop?.width}>
              {isUploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Cropped Photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

