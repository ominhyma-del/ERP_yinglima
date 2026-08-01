import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface MultiEmailInputProps {
  label: string;
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  required?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A real "multiple emails" input — chips you can add to and remove from —
 * instead of a single <input type="email"> bound to one string.
 *
 * Both the Supplier and Buyer forms label their email field "(Multiple)"
 * per spec, but the previous implementation only ever stored one email.
 * This component is the actual fix: it stores string[], validates each
 * entry as a normal-looking email before adding it, and prevents
 * duplicates within the same list.
 */
export const MultiEmailInput: React.FC<MultiEmailInputProps> = ({
  label,
  emails,
  onChange,
  placeholder = 'name@company.com',
  required = false,
}) => {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addEmail = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    if (emails.some((e) => e.toLowerCase() === trimmed.toLowerCase())) {
      setError('This email is already added.');
      return;
    }

    onChange([...emails, trimmed]);
    setDraft('');
    setError(null);
  };

  const removeEmail = (email: string) => {
    onChange(emails.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <div>
      <label className="text-xs text-slate-700 font-semibold block mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {emails.map((email) => (
            <span
              key={email}
              className="bg-blue-100 text-blue-900 text-[11px] font-semibold px-2 py-1 rounded flex items-center gap-1"
            >
              {email}
              <X
                size={12}
                className="cursor-pointer hover:text-rose-600"
                onClick={() => removeEmail(email)}
              />
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <input
          type="email"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={addEmail}
          className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white font-medium"
        />
        <button
          type="button"
          onClick={addEmail}
          className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
          title="Add email"
        >
          <Plus size={14} />
        </button>
      </div>
      {error && <p className="text-[10px] text-rose-600 font-bold mt-1">{error}</p>}
      <p className="text-[10px] text-slate-400 mt-1">Press Enter, comma, or click away to add. Multiple emails supported.</p>
    </div>
  );
};
