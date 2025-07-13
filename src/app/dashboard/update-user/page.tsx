"use client";

import React, {useState, useRef, useEffect} from "react";
import {useSearchParams, useRouter} from "next/navigation";
import {useAuth} from "@/hooks/use-auth";
import {db, storage} from "@/lib/firebase";
import {ref, uploadBytesResumable, getDownloadURL} from "firebase/storage";
import {doc, updateDoc, writeBatch, serverTimestamp, collection, query, onSnapshot, deleteDoc} from "firebase/firestore";
import {useToast} from "@/hooks/use-toast";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Camera, Upload, Loader2, X, User, Mail, Phone, UserCog, Save, Trash2, ArrowLeft, Building2} from "lucide-react";
import type {AppUser, UserRole} from "@/types";

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

const availableRoles: UserRole[] = ["setter", "closer", "manager", "admin"];

export default function UpdateUserPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {user: currentUser} = useAuth();
  const {toast} = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get user data from URL parameters
  const userDataParam = searchParams.get('user');
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phoneNumber: "",
    role: "setter" as UserRole,
    teamId: ""
  });
  
  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  
  // Avatar upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Initialize user data from URL params
  useEffect(() => {
    if (userDataParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userDataParam)) as AppUser;
        setTargetUser(userData);
        setFormData({
          displayName: userData.displayName || "",
          email: userData.email || "",
          phoneNumber: userData.phoneNumber || "",
          role: userData.role as UserRole,
          teamId: userData.teamId || ""
        });
      } catch (error) {
        console.error("Error parsing user data:", error);
        toast({
          title: "Error",
          description: "Invalid user data provided",
          variant: "destructive",
        });
        router.push("/dashboard/manage-teams");
      }
    } else {
      router.push("/dashboard/manage-teams");
    }
  }, [userDataParam, router, toast]);

  // Load available teams
  useEffect(() => {
    const teamsQuery = query(collection(db, "teams"));
    
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      
      setTeams(teamsData.filter((team) => team.isActive));
      setLoadingTeams(false);
    }, (error) => {
      console.error("Error loading teams:", error);
      setLoadingTeams(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedFile || !targetUser) return null;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `avatars/${targetUser.uid}_${timestamp}.${fileExtension}`;
      
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
      setUploading(false);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!targetUser) return;
    
    setSaving(true);
    
    try {
      let avatarUrl = targetUser.avatarUrl;
      
      // Upload new avatar if selected
      if (selectedFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }
      
      // Prepare update data
      const updateData = {
        displayName: formData.displayName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        role: formData.role,
        teamId: formData.teamId,
        ...(avatarUrl && { avatarUrl }),
        updatedAt: serverTimestamp(),
      };
      
      // Create batch for atomic updates
      const batch = writeBatch(db);
      
      // Update user document
      const userRef = doc(db, "users", targetUser.uid);
      batch.update(userRef, updateData);
      
      // If user is a closer, also update closers collection
      if (formData.role === "closer" || targetUser.role === "closer") {
        const closerRef = doc(db, "closers", targetUser.uid);
        batch.update(closerRef, {
          displayName: formData.displayName.trim(),
          email: formData.email.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          teamId: formData.teamId,
          ...(avatarUrl && { avatarUrl }),
          updatedAt: serverTimestamp(),
        });
      }
      
      // Commit the batch
      await batch.commit();
      
      toast({
        title: "Success",
        description: "User profile updated successfully",
      });
      
      // Clear uploaded file
      clearSelectedFile();
      
      // Navigate back to team management
      router.push("/dashboard/manage-teams");
      
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!targetUser) return;
    
    setDeleting(true);
    
    try {
      // Delete from users collection
      await deleteDoc(doc(db, "users", targetUser.uid));
      
      // If user is a closer, also delete from closers collection
      if (targetUser.role === "closer") {
        await deleteDoc(doc(db, "closers", targetUser.uid));
      }
      
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      
      router.push("/dashboard/manage-teams");
      
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getAvailableRoles = (): UserRole[] => {
    if (!currentUser) return ["setter"];
    
    // Admins can assign any role
    if (currentUser.role === "admin") {
      return availableRoles;
    }
    
    // Managers can assign all roles except admin
    if (currentUser.role === "manager") {
      return availableRoles.filter(role => role !== "admin");
    }
    
    // Others can only assign setter and closer
    return ["setter", "closer"];
  };

  const canDeleteUser = currentUser?.role === "admin" || currentUser?.role === "manager";

  if (!targetUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/manage-teams")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Team Management
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Update User Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Update information for {targetUser.displayName || targetUser.email}
            </p>
          </div>
        </div>

        {/* Avatar Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                {previewUrl ? (
                  <Avatar className="h-20 w-20 ring-2 ring-border">
                    <AvatarImage src={previewUrl} alt="Preview" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold text-xl">
                      {(targetUser.displayName || targetUser.email || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-20 w-20 ring-2 ring-border">
                    <AvatarImage src={targetUser.avatarUrl || undefined} alt={targetUser.displayName || "User"} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold text-xl">
                      {(targetUser.displayName || targetUser.email || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                
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
                  disabled={uploading || saving}
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
                    className="flex items-center gap-2 text-red-600"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}

                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Max file size: 5MB. Supported: JPG, PNG, GIF
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
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
                <Label htmlFor="email">Email Address *</Label>
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
                <Label htmlFor="phoneNumber">Phone Number</Label>
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
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: string) => handleFormChange("role", value)}
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="teamId">Team Assignment</Label>
                <Select 
                  value={formData.teamId} 
                  onValueChange={(value: string) => handleFormChange("teamId", value)}
                  disabled={saving || loadingTeams}
                >
                  <SelectTrigger id="teamId">
                    <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select a team"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span>{team.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/manage-teams")}
                  disabled={saving || uploading}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || uploading || !formData.displayName.trim() || !formData.email.trim()}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
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

              {canDeleteUser && (
                <>
                  <Separator />
                  <div className="flex justify-start">
                    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={saving || uploading || deleting}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete User
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm User Deletion</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete <strong>{targetUser.displayName || targetUser.email}</strong>?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteUser}
                            disabled={deleting}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {deleting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete User"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
