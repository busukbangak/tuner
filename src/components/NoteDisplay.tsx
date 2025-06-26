import React from 'react';

interface NoteDisplayProps {
  note: string;
  frequency: number;
}

const NoteDisplay: React.FC<NoteDisplayProps> = ({ note, frequency }) => (
  <div>
    <h2>{note}</h2>
    <p>{frequency.toFixed(2)} Hz</p>
  </div>
);

export default NoteDisplay; 