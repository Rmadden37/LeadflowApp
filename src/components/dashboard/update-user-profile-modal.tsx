"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import type {AppUser} from "@/types";

interface UpdateUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
}

// Simple test modal component
const UpdateUserProfileModal = (props: UpdateUserProfileModalProps) => {
  const {isOpen, onClose, user} = props;
  
  console.log("UpdateUserProfileModal rendered with:", {isOpen, user: user?.displayName || user?.email});
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Test Modal</DialogTitle>
            <DialogDescription>
              This is a test modal for {user.displayName || user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p>Modal is working! User: {user.displayName || user.email}</p>
            <p>Modal isOpen: {isOpen ? 'true' : 'false'}</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpdateUserProfileModal;
