"use client";

import React, {useState, useRef, useEffect} from "react";
import {useAuth} from "@/hooks/use-auth";
import {db, storage} from "@/lib/firebase";
import {ref, uploadBytesResumable, getDownloadURL} from "firebase/storage";
import {doc, updateDoc, writeBatch, serverTimestamp} from "firebase/firestore";
import {useToast} from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Camera, Upload, Loader2, X, User, Mail, Phone, UserCog, Save} from "lucide-react";
import type {AppUser, UserRole} from "@/types";

interface UpdateUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
}

const availableRoles: UserRole[] = ["setter", "closer", "manager", "admin"];

export default function UpdateUserProfileModal(props: UpdateUserProfileModalProps) {
  const {isOpen, onClose, user} = props;
  const {user: currentUser} = useAuth();
  const {toast} = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
    role: user.role as UserRole
  });
  
  // Avatar upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        displayName: user.displayName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        role: user.role as UserRole
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
    }
  }, [isOpen, user]);

  // Get available roles based on current user permissions
  const getAvailableRoles = () => {
    if (currentUser?.role === "admin") {
      return availableRoles; // Admins can see all roles including admin
    } else {
      return availableRoles.filter(role => role !== "admin"); // Non-admins can't assign admin role
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedFile || !currentUser) return null;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `avatars/${user.uid}_${timestamp}.${fileExtension}`;
      
      // Create storage reference
      const storageRef = ref(storage, fileName);
      
      // Upload file with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);
      
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error("Upload error:", error);
            setUploading(false);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setUploading(false);
              resolve(downloadURL);
            } catch (error) {
              setUploading(false);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;

    // Check permissions
    if (currentUser.role !== "manager" && currentUser.role !== "admin") {
      toast({
        title: "Unauthorized",
        description: "Only managers and admins can update user profiles.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formData.displayName.trim() || !formData.email.trim()) {
      toast({
        title: "Required Fields",
        description: "Display name and email are required.",
        variant: "destructive",
      });
      return;
    }

    // Additional role change validations
    if (formData.role !== user.role) {
      if (user.uid === currentUser.uid) {
        toast({
          title: "Action Not Allowed", 
          description: "You cannot change your own role.", 
          variant: "destructive"
        });
        return;
      }
      
      if (user.role === "manager" && formData.role !== "manager") {
        if (currentUser.role !== "admin") {
          toast({
            title: "Action Not Allowed", 
            description: "Only admins can demote managers.", 
            variant: "destructive"
          });
          return;
        }
      }
      
      if (user.role === "admin" && formData.role !== "admin") {
        if (currentUser.role !== "admin") {
          toast({
            title: "Action Not Allowed", 
            description: "Only admins can change admin roles.", 
            variant: "destructive"
          });
          return;
        }
      }
    }

    setSaving(true);

    try {
      let photoURL = user.photoURL;

      // Upload avatar if selected
      if (selectedFile) {
        const newPhotoURL = await uploadAvatar();
        if (newPhotoURL) {
          photoURL = newPhotoURL;
        }
      }

      // Prepare batch update
      const batch = writeBatch(db);
      const userDocRef = doc(db, "users", user.uid);

      // Update user document
      const updateData: any = {
        displayName: formData.displayName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        role: formData.role,
        updatedAt: serverTimestamp()
      };

      if (photoURL && photoURL !== user.photoURL) {
        updateData.photoURL = photoURL;
      }

      batch.update(userDocRef, updateData);

      // Handle role changes and closer record updates
      const oldRoleIsCloser = user.role === "closer" || user.role === "manager" || user.role === "admin";
      const newRoleIsCloser = formData.role === "closer" || formData.role === "manager" || formData.role === "admin";

      if (newRoleIsCloser && !oldRoleIsCloser) {
        // User is becoming a closer, manager, or admin
        const closerDocRef = doc(db, "closers", user.uid);
        batch.set(closerDocRef, {
          uid: user.uid,
          name: formData.displayName.trim(),
          teamId: user.teamId,
          status: "Off Duty",
          role: formData.role,
          avatarUrl: photoURL || null,
          phone: formData.phoneNumber.trim() || null,
          lineupOrder: new Date().getTime(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (oldRoleIsCloser && !newRoleIsCloser) {
        // User is no longer a closer, manager, or admin
        const closerDocRef = doc(db, "closers", user.uid);
        batch.delete(closerDocRef);
      } else if (oldRoleIsCloser && newRoleIsCloser && user.role !== formData.role) {
        // User is changing between closer/manager/admin roles
        const closerDocRef = doc(db, "closers", user.uid);
        batch.update(closerDocRef, {
          role: formData.role,
          name: formData.displayName.trim(),
          avatarUrl: photoURL || null,
          phone: formData.phoneNumber.trim() || null,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      toast({
        title: "Profile Updated",
        description: `${formData.displayName}'s profile has been updated successfully.`,
      });

      onClose();
    } catch (error) {
      console.error("Error updating user profile:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update user profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <User className="h-5 w-5" />
            Update User Profile
          </DialogTitle>
          <DialogDescription>
            Update user information, role, and profile picture for {user.displayName || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Profile Picture</Label>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-2 ring-border">
                  <AvatarImage 
                    src={previewUrl || user.photoURL || undefined} 
                    alt={user.displayName || user.email || "User avatar"} 
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold text-xl">
                    {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Upload progress overlay */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="text-white text-xs font-medium">
                      {Math.round(uploadProgress)}%
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || saving}
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Choose Photo
                </Button>

                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSelectedFile}
                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  Max file size: 5MB. Supported: JPG, PNG, GIF
                </p>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Personal Information</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Display Name *
                </Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => handleFormChange("displayName", e.target.value)}
                  placeholder="Enter display name"
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="Enter email address"
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleFormChange("phoneNumber", e.target.value)}
                  placeholder="Enter phone number"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Role
                </Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => handleFormChange("role", value)}
                  disabled={saving}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRoles().map((role) => (
                      <SelectItem key={role} value={role} className="capitalize">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving || uploading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploading || !formData.displayName.trim() || !formData.email.trim()}
            className="flex-1 sm:flex-none"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
