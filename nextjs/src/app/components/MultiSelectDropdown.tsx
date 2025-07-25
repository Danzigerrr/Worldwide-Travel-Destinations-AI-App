'use client';

import { useState } from 'react';

interface MultiSelectDropdownProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
}

export default function MultiSelectDropdown({ label, options, selected, onChange }: MultiSelectDropdownProps) {
    const toggleValue = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    return (
        <div className="border rounded p-2">
            <span className="font-semibold text-sm block mb-1">{label}</span>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button
                        key={opt}
                        className={`text-sm px-2 py-1 rounded border ${
                            selected.includes(opt) ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        onClick={() => toggleValue(opt)}
                        type="button"
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}
