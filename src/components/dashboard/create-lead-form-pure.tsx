"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";

interface CreateLeadFormPureProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  embedded?: boolean;
}

export default function CreateLeadFormPure({ isOpen, onClose, onSuccess, embedded = false }: CreateLeadFormPureProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        photoUrls: [],
      };

      // Handle scheduled appointment
      if (dispatchType === 'scheduled' && appointmentDate && appointmentTime) {
        const [hours, minutes] = appointmentTime.split(':').map(Number);
        const scheduledDateTime = new Date(appointmentDate);
        scheduledDateTime.setHours(hours, minutes, 0, 0);
        leadData.scheduledAppointmentTime = Timestamp.fromDate(scheduledDateTime);
      }

      await addDoc(collection(db, "leads"), leadData);

      toast({
        title: "Lead created successfully",
        description: `Lead for ${customerName} has been created.`,
      });

      // Reset form
      formRef.current?.reset();
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

  const toggleScheduledSection = (show: boolean) => {
    const section = document.getElementById('scheduled-section');
    if (section) {
      section.style.display = show ? 'block' : 'none';
    }
  };

  const formContent = (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .pure-form-container {
            max-width: 100%;
            padding: 0;
            color: #e5e5e5;
          }

          .pure-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .pure-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .pure-label {
            font-size: 16px;
            font-weight: 500;
            color: #e5e5e5;
            margin: 0;
          }

          .pure-input {
            width: 100%;
            height: 56px;
            padding: 16px;
            font-size: 16px !important;
            line-height: 1.4;
            background: rgba(255, 255, 255, 0.05);
            border: 1.5px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            color: #e5e5e5;
            transition: all 0.2s ease;
            box-sizing: border-box;
            outline: none;
            -webkit-appearance: none;
            appearance: none;
          }

          .pure-input:focus {
            border-color: #007AFF;
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
          }

          .pure-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          .pure-radio-group {
            display: flex;
            gap: 20px;
            margin-top: 8px;
          }

          .pure-radio-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .pure-radio {
            width: 16px;
            height: 16px;
            accent-color: #007AFF;
          }

          .pure-radio-label {
            font-size: 16px;
            color: #e5e5e5;
            cursor: pointer;
            margin: 0;
          }

          .pure-checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
          }

          .pure-checkbox {
            width: 16px;
            height: 16px;
            accent-color: #007AFF;
          }

          .pure-checkbox-label {
            font-size: 14px;
            color: #e5e5e5;
            cursor: pointer;
            margin: 0;
          }

          .pure-scheduled-section {
            background: rgba(255, 255, 255, 0.03);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: none;
          }

          .pure-buttons {
            display: flex;
            gap: 16px;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }

          .pure-btn {
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

          .pure-btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #e5e5e5;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .pure-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
          }

          .pure-btn-primary {
            background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%);
            color: white;
            box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
          }

          .pure-btn-primary:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(0, 122, 255, 0.4);
          }

          .pure-btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .pure-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @media (max-width: 640px) {
            .pure-radio-group {
              flex-direction: column;
              gap: 12px;
            }
            
            .pure-buttons {
              flex-direction: column;
            }
          }
        `
      }} />

      <div className="pure-form-container">
        <form ref={formRef} className="pure-form" onSubmit={handleSubmit}>
          {/* Customer Name */}
          <div className="pure-field">
            <label htmlFor="customerName" className="pure-label">Customer Name</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              className="pure-input"
              placeholder="Enter customer name"
              required
              minLength={2}
              autoComplete="name"
            />
          </div>

          {/* Phone Number */}
          <div className="pure-field">
            <label htmlFor="customerPhone" className="pure-label">Phone Number</label>
            <input
              type="tel"
              id="customerPhone"
              name="customerPhone"
              className="pure-input"
              placeholder="(555) 123-4567"
              required
              pattern="[0-9\s\(\)\-\+]+"
              minLength={10}
              autoComplete="tel"
            />
          </div>

          {/* Address */}
          <div className="pure-field">
            <label htmlFor="address" className="pure-label">Location</label>
            <input
              type="text"
              id="address"
              name="address"
              className="pure-input"
              placeholder="Enter location or address"
              required
              minLength={5}
              autoComplete="address-line1"
            />
          </div>

          {/* Dispatch Type */}
          <div className="pure-field">
            <label className="pure-label">Dispatch Type</label>
            <div className="pure-radio-group">
              <div className="pure-radio-item">
                <input
                  type="radio"
                  id="immediate"
                  name="dispatchType"
                  value="immediate"
                  className="pure-radio"
                  defaultChecked
                  onChange={() => toggleScheduledSection(false)}
                />
                <label htmlFor="immediate" className="pure-radio-label">Immediate Dispatch</label>
              </div>
              <div className="pure-radio-item">
                <input
                  type="radio"
                  id="scheduled"
                  name="dispatchType"
                  value="scheduled"
                  className="pure-radio"
                  onChange={() => toggleScheduledSection(true)}
                />
                <label htmlFor="scheduled" className="pure-radio-label">Scheduled Dispatch</label>
              </div>
            </div>
          </div>

          {/* Assign to Self */}
          {["manager", "closer", "admin"].includes(user?.role || "") && (
            <div className="pure-field">
              <label className="pure-label">Assignment</label>
              <div className="pure-checkbox-group">
                <input
                  type="checkbox"
                  id="assignToSelf"
                  name="assignToSelf"
                  className="pure-checkbox"
                />
                <label htmlFor="assignToSelf" className="pure-checkbox-label">
                  Assign this lead to me
                </label>
              </div>
            </div>
          )}

          {/* Scheduled Appointment Section */}
          <div id="scheduled-section" className="pure-scheduled-section">
            <h4 style={{ margin: '0 0 16px 0', color: '#e5e5e5', fontSize: '16px', fontWeight: '500' }}>
              Schedule Appointment
            </h4>
            
            <div className="pure-field">
              <label htmlFor="appointmentDate" className="pure-label">Date</label>
              <input
                type="date"
                id="appointmentDate"
                name="appointmentDate"
                className="pure-input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="pure-field">
              <label htmlFor="appointmentTime" className="pure-label">Time</label>
              <input
                type="time"
                id="appointmentTime"
                name="appointmentTime"
                className="pure-input"
                defaultValue="17:00"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="pure-buttons">
            <button
              type="button"
              className="pure-btn pure-btn-secondary"
              onClick={() => {
                if (onClose) onClose();
              }}
            >
              {embedded ? 'Back' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="pure-btn pure-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="pure-spinner"></div>
                  Creating...
                </>
              ) : (
                'Create Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );

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
