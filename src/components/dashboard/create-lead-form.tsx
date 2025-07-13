"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";

interface CreateLeadFormProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  embedded?: boolean;
}

// Pure HTML/CSS Form - No React Hook Form complexity or Fiber reconciliation issues
export default function CreateLeadForm({ isOpen, onClose, onSuccess, embedded = false }: CreateLeadFormProps) {
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
        // Fix timezone bug: create date in local timezone consistently
        const scheduledDateTime = new Date(appointmentDate + 'T' + appointmentTime + ':00');
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
          /* 🌟 AURELIAN'S PREMIUM iOS FORM DESIGN SYSTEM */
          /* ============================================== */
          
          .pure-form-container {
            max-width: 100%;
            padding: 0;
            color: rgba(255, 255, 255, 0.95);
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
            backdrop-filter: blur(20px) saturate(180%);
            border-radius: 20px;
            overflow: hidden;
          }

          .pure-form {
            display: flex;
            flex-direction: column;
            gap: 24px;
            padding: 4px;
          }

          .pure-field {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          /* 🏷️ iOS LABELS - Premium Typography */
          .pure-label {
            font-size: 17px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            margin: 0;
            letter-spacing: -0.02em;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
          }

          /* 📱 iOS INPUT FIELDS - Native Design Language */
          .pure-input {
            width: 100%;
            height: 56px;
            padding: 16px 20px;
            font-size: 17px;
            line-height: 1.4;
            background: rgba(255, 255, 255, 0.06);
            border: 1.5px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            color: rgba(255, 255, 255, 0.95);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-sizing: border-box;
            outline: none;
            -webkit-appearance: none;
            appearance: none;
            backdrop-filter: blur(10px);
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
          }

          .pure-input:focus {
            border-color: #007AFF;
            background: rgba(255, 255, 255, 0.1);
            box-shadow: 
              0 0 0 4px rgba(0, 122, 255, 0.12),
              0 8px 24px rgba(0, 122, 255, 0.15);
            transform: translateY(-1px);
          }

          .pure-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          /* 🎨 iOS RADIO BUTTONS - Settings Style Interface */
          .pure-radio-group {
            display: flex;
            gap: 24px;
            margin-top: 12px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .pure-radio-item {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
          }

          .pure-radio {
            width: 20px;
            height: 20px;
            accent-color: #007AFF;
            appearance: none;
            -webkit-appearance: none;
            border: 2px solid rgba(255, 255, 255, 0.25);
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.02);
            position: relative;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .pure-radio:checked {
            border-color: #007AFF;
            background: #007AFF;
            box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
          }

          .pure-radio:checked::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: white;
          }

          .pure-radio-label {
            font-size: 16px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            cursor: pointer;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
          }

          /* 📋 iOS CHECKBOXES - Native Toggle Style */
          .pure-checkbox-group {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 12px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .pure-checkbox {
            width: 20px;
            height: 20px;
            accent-color: #007AFF;
            appearance: none;
            -webkit-appearance: none;
            border: 2px solid rgba(255, 255, 255, 0.25);
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.02);
            position: relative;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .pure-checkbox:checked {
            border-color: #007AFF;
            background: #007AFF;
            box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
          }

          .pure-checkbox:checked::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 11px;
            font-weight: 700;
          }

          .pure-checkbox-label {
            font-size: 16px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            cursor: pointer;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
          }

          /* 📅 SCHEDULED SECTION - iOS Settings Panel Style */
          .pure-scheduled-section {
            background: linear-gradient(135deg, rgba(0, 122, 255, 0.06) 0%, rgba(0, 122, 255, 0.02) 100%);
            padding: 24px;
            border-radius: 16px;
            border: 1px solid rgba(0, 122, 255, 0.15);
            backdrop-filter: blur(15px);
            display: none;
            margin-top: 8px;
          }

          /* 🎯 PREMIUM BUTTONS - iOS Action Buttons */
          .pure-buttons {
            display: flex;
            gap: 16px;
            margin-top: 32px;
            padding-top: 24px;
          }

          .pure-btn {
            flex: 1;
            height: 56px;
            padding: 16px 24px;
            font-size: 17px;
            font-weight: 600;
            border-radius: 16px;
            border: none;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
            backdrop-filter: blur(10px);
          }

          .pure-btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.15);
          }

          .pure-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-1px);
          }

          .pure-btn-primary {
            background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%);
            color: white;
            box-shadow: 0 8px 24px rgba(0, 122, 255, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .pure-btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(0, 122, 255, 0.35);
            background: linear-gradient(135deg, #1A8CFF 0%, #007AFF 100%);
          }

          .pure-btn-primary:active:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(0, 122, 255, 0.4);
          }

          .pure-btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          /* ⚡ LOADING SPINNER - iOS Activity Indicator */
          .pure-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.25);
            border-top: 2px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* 📱 RESPONSIVE DESIGN - Mobile Optimizations */
          @media (max-width: 640px) {
            .pure-radio-group {
              flex-direction: column;
              gap: 16px;
            }
            
            .pure-buttons {
              flex-direction: column;
            }
            
            .pure-btn {
              width: 100%;
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
            <h4 style={{ 
              margin: '0 0 20px 0', 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '17px', 
              fontWeight: '600',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              letterSpacing: '-0.02em'
            }}>
              📅 Schedule Appointment
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
