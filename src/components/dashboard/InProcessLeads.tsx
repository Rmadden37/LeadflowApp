
import React from 'react';

// Mock data for demonstration
const leads = [
  { id: 1, name: 'John Doe', assignedTo: 'Jane Smith', avatar: '/avatars/john-doe.png' },
  { id: 2, name: 'Peter Jones', assignedTo: 'Jane Smith', avatar: '/avatars/peter-jones.png' },
];

const LeadCard = ({ lead }: { lead: any }) => (
  <div className="frosted-glass-card p-4 flex items-center space-x-4">
    <img src={lead.avatar} alt={lead.name} className="w-10 h-10 rounded-full" />
    <div>
      <p className="text-[var(--text-primary)] font-semibold">{lead.name}</p>
      <p className="text-[var(--text-secondary)] text-sm">Assigned to {lead.assignedTo}</p>
    </div>
  </div>
);

const InProcessLeads = () => {
  return (
    <div className="space-y-4">
      {leads.map(lead => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
};

export default InProcessLeads;
