
import React from 'react';
import Image from 'next/image';

// Mock data for demonstration
const closers = [
  { id: 1, name: 'Alice', avatar: '/avatars/alice.png' },
  { id: 2, name: 'Bob', avatar: '/avatars/bob.png' },
  { id: 3, name: 'Charlie', avatar: '/avatars/charlie.png' },
];

const CloserLineup = () => {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Up Next</h2>
      <div className="frosted-glass-card p-4">
        <div className="flex justify-between items-center">
          {closers.map((closer, index) => (
            <div key={closer.id} className="flex items-center space-x-3">
              <Image
                src={closer.avatar}
                alt={closer.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />
              <Image
                src={closer.avatar}
                alt={closer.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />
              <p className="text-[var(--text-primary)]">{closer.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CloserLineup;
