"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import CreateLeadForm from "@/components/dashboard/create-lead-form";
import CreateLeadFormPure from "@/components/dashboard/create-lead-form-pure";

export default function FormComparisonPage() {
  const [showReactForm, setShowReactForm] = useState(false);
  const [showHtmlForm, setShowHtmlForm] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Form Comparison: React vs Pure HTML/CSS
        </h1>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">React Hook Form (Current)</h2>
            <p className="text-gray-300 mb-4">
              Complex React component with state management, re-renders, and potential jumping issues.
            </p>
            <Button 
              onClick={() => setShowReactForm(true)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Test React Form
            </Button>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Pure HTML/CSS Form</h2>
            <p className="text-gray-300 mb-4">
              Simple HTML form with CSS styling - no React complexity, stable cursor behavior.
            </p>
            <Button 
              onClick={() => setShowHtmlForm(true)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Test HTML Form
            </Button>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Key Differences:</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-red-400 mb-2">React Form Issues:</h4>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• Component re-renders cause input jumping</li>
                <li>• Complex state management</li>
                <li>• Hook dependencies can trigger updates</li>
                <li>• React Hook Form validation re-renders</li>
                <li>• useState/useEffect timing issues</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-400 mb-2">HTML Form Benefits:</h4>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• No re-renders, stable cursor position</li>
                <li>• Native browser form validation</li>
                <li>• Consistent 16px font size prevents iOS zoom</li>
                <li>• Direct DOM manipulation</li>
                <li>• Predictable behavior</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* React Form Modal */}
      <CreateLeadForm 
        isOpen={showReactForm}
        onClose={() => setShowReactForm(false)}
        onSuccess={() => setShowReactForm(false)}
      />

      {/* HTML Form Modal */}              <CreateLeadFormPure
        isOpen={showHtmlForm}
        onClose={() => setShowHtmlForm(false)}
        onSuccess={() => setShowHtmlForm(false)}
      />
    </div>
  );
}
