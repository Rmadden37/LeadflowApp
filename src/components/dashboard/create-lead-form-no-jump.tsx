"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { PhotoUploader } from "@/components/ui/photo-uploader";

interface CreateLeadFormNoJumpProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  embedded?: boolean;
}

// Anti-Jump Lead Form - Always shows all fields to prevent layout shifts
export default function CreateLeadFormNoJump({ isOpen, onClose, onSuccess, embedded = false }: CreateLeadFormNoJumpProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchType, setDispatchType] = useState<'immediate' | 'scheduled'>('immediate');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const customerName = formData.get('customerName') as string;
      const customerPhone = formData.get('customerPhone') as string;
      const address = formData.get('address') as string;
      const dispatchType = formData.get('dispatchType') as string;
      const appointmentDate = formData.get('appointmentDate') as string;
      const appointmentTime = formData.get('appointmentTime') as string;
      const assignToSelf = formData.get('assignToSelf') === 'on';

      // Validate scheduled fields if needed
      if (dispatchType === 'scheduled' && (!appointmentDate || !appointmentTime)) {
        toast({
          title: "Scheduled appointment required",
          description: "Please select both date and time for scheduled appointments.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const leadData: Record<string, unknown> = {
        customerName,
        customerPhone,
        address,
        dispatchType,
        status: dispatchType === "immediate" ? "waiting_assignment" : "scheduled",
        teamId: user.teamId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        setterId: user.uid,
        setterName: user.displayName || user.email,
        assignedCloserId: assignToSelf ? user.uid : null,
        assignedCloserName: assignToSelf ? (user.displayName || user.email) : null,
        dispositionNotes: "",
        photoUrls: photoUrls,
      };

      // Handle scheduled appointment
      if (dispatchType === 'scheduled' && appointmentDate && appointmentTime) {
        const scheduledDateTime = new Date(appointmentDate + 'T' + appointmentTime + ':00');
        leadData.scheduledAppointmentTime = Timestamp.fromDate(scheduledDateTime);
      }

      await addDoc(collection(db, "leads"), leadData);

      // Reset form
      formRef.current?.reset();
      setDispatchType('immediate');
      setPhotoUrls([]);
      
      // Call success callback which will handle toast and navigation
      if (onSuccess) onSuccess();
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

  const formContent = (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .no-jump-form {
            max-width: 100%;
            padding: 0;
            color: #e5e5e5;
            display: flex;
            flex-direction: column;
            gap: 20px;
            background: transparent !important;
            /* Ensure dark theme throughout the form */
          }

          .form-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .form-label {
            font-size: 16px;
            font-weight: 500;
            color: #e5e5e5;
            margin: 0;
          }

          .form-input {
            width: 100%;
            height: 56px;
            padding: 16px;
            font-size: 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1.5px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            color: #e5e5e5;
            transition: all 0.2s ease;
            outline: none;
            -webkit-appearance: none;
            appearance: none;
          }

          .form-input:focus {
            border-color: #007AFF;
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
          }

          .form-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          .radio-group {
            display: flex;
            gap: 20px;
            margin-top: 8px;
          }

          .radio-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .radio-input {
            width: 16px;
            height: 16px;
            accent-color: #007AFF;
            appearance: none;
            -webkit-appearance: none;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            background: transparent;
            position: relative;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .radio-input:checked {
            border-color: #007AFF;
            background: #007AFF;
          }

          .radio-input:checked::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: white;
          }

          .radio-label {
            font-size: 16px;
            color: #e5e5e5;
            cursor: pointer;
            margin: 0;
          }

          .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
          }

          .checkbox-input {
            width: 16px;
            height: 16px;
            accent-color: #007AFF;
            appearance: none;
            -webkit-appearance: none;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 3px;
            background: transparent;
            position: relative;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .checkbox-input:checked {
            border-color: #007AFF;
            background: #007AFF;
          }

          .checkbox-input:checked::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 10px;
            font-weight: bold;
          }

          .checkbox-label {
            font-size: 14px;
            color: #e5e5e5;
            cursor: pointer;
            margin: 0;
          }

          .scheduled-fields {
            background: rgba(255, 255, 255, 0.03);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            gap: 20px; /* Increased from 16px for better spacing */
            opacity: ${dispatchType === 'scheduled' ? '1' : '0.4'};
            transition: opacity 0.2s ease;
          }

          .scheduled-fields h4 {
            margin: 0;
            color: #e5e5e5;
            font-size: 16px;
            font-weight: 500;
          }

          .form-buttons {
            display: flex;
            gap: 16px;
            margin-top: 24px;
            padding-top: 20px;
            /* REMOVED border-top to fix hard line issue on dashboard */
            /* border-top: 1px solid rgba(255, 255, 255, 0.1); */
          }

          .form-btn {
            flex: 1;
            height: 56px;
            padding: 16px 24px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #e5e5e5;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
          }

          .btn-primary {
            background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%);
            color: white;
            box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
          }

          .btn-primary:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(0, 122, 255, 0.4);
          }

          .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            /* REDUCED opacity to fix hard line issue on dashboard */
            border-top: 2px solid rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @media (max-width: 640px) {
            .radio-group {
              flex-direction: column;
              gap: 12px;
            }
            
            .form-buttons {
              flex-direction: column;
            }
          }
        `
      }} />

      <div className="no-jump-form">
        <form ref={formRef} onSubmit={handleSubmit}>
          {/* Customer Name */}
          <div className="form-field">
            <label htmlFor="customerName" className="form-label">Customer Name</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              className="form-input"
              placeholder="Enter customer name"
              required
              minLength={2}
              autoComplete="name"
            />
          </div>

          {/* Phone Number */}
          <div className="form-field">
            <label htmlFor="customerPhone" className="form-label">Phone Number</label>
            <input
              type="tel"
              id="customerPhone"
              name="customerPhone"
              className="form-input"
              placeholder="(555) 123-4567"
              required
              pattern="[0-9\\s\\(\\)\\-\\+]+"
              minLength={10}
              autoComplete="tel"
            />
          </div>

          {/* Address */}
          <div className="form-field">
            <label htmlFor="address" className="form-label">Location</label>
            <input
              type="text"
              id="address"
              name="address"
              className="form-input"
              placeholder="Enter location or address"
              required
              minLength={5}
              autoComplete="address-line1"
            />
          </div>

          {/* Dispatch Type */}
          <div className="form-field">
            <label className="form-label">Dispatch Type</label>
            <div className="radio-group">
              <div className="radio-item">
                <input
                  type="radio"
                  id="immediate"
                  name="dispatchType"
                  value="immediate"
                  className="radio-input"
                  checked={dispatchType === 'immediate'}
                  onChange={() => setDispatchType('immediate')}
                />
                <label htmlFor="immediate" className="radio-label">Immediate</label>
              </div>
              <div className="radio-item">
                <input
                  type="radio"
                  id="scheduled"
                  name="dispatchType"
                  value="scheduled"
                  className="radio-input"
                  checked={dispatchType === 'scheduled'}
                  onChange={() => setDispatchType('scheduled')}
                />
                <label htmlFor="scheduled" className="radio-label">Scheduled</label>
              </div>
            </div>
          </div>

          {/* Assign to Self */}
          {["manager", "closer", "admin"].includes(user?.role || "") && (
            <div className="form-field">
              <label className="form-label">Assignment</label>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="assignToSelf"
                  name="assignToSelf"
                  className="checkbox-input"
                />
                <label htmlFor="assignToSelf" className="checkbox-label">
                  Assign this lead to me
                </label>
              </div>
            </div>
          )}

          {/* Scheduled Fields - Always visible, just faded when not needed */}
          <div className="scheduled-fields">
            <h4>Schedule Appointment</h4>
            
            <div className="form-field">
              <label htmlFor="appointmentDate" className="form-label">Date</label>
              <input
                type="date"
                id="appointmentDate"
                name="appointmentDate"
                className="form-input"
                min={new Date().toISOString().split('T')[0]}
                disabled={dispatchType !== 'scheduled'}
                required={dispatchType === 'scheduled'}
              />
            </div>

            <div className="form-field">
              <label htmlFor="appointmentTime" className="form-label">Time</label>
              <input
                type="time"
                id="appointmentTime"
                name="appointmentTime"
                className="form-input"
                defaultValue="17:00"
                disabled={dispatchType !== 'scheduled'}
                required={dispatchType === 'scheduled'}
              />
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="form-field">
            <PhotoUploader
              onPhotosChange={setPhotoUrls}
              maxPhotos={5}
              folder="leads"
              label="Lead Photos"
            />
          </div>

          {/* Submit Buttons - Swapped order: Create Lead left, Back right */}
          <div className="form-buttons">
            <button
              type="submit"
              className="form-btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner"></div>
                  Creating...
                </>
              ) : (
                'Create Lead'
              )}
            </button>
            <button
              type="button"
              className="form-btn btn-secondary"
              onClick={() => {
                if (onClose) onClose();
              }}
            >
              {embedded ? 'Back' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </>
  );

  // Render based on mode
  if (embedded) {
    return formContent;
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'block' : 'hidden'}`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div className="relative max-w-lg w-full max-h-[90vh] overflow-y-auto bg-gray-900 rounded-2xl p-6 border border-white/10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-white text-xl"
        >
          ×
        </button>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Create New Lead</h2>
          <p className="text-gray-300 text-sm">Fill out the form below to create a new lead.</p>
        </div>
        
        {formContent}
      </div>
    </div>
  );
}
