'use client';

import { useState } from 'react';

interface CountryOption { iso: string; name: string; dial: string; flag: string; placeholder: string; }

// Not exhaustive, but covers the regions this portal actually recruits
// across (UAE + India, per the job posting "Region" field) plus the most
// common candidate countries beyond that — with a "Other" fallback so no
// one is ever blocked from applying.
const COUNTRIES: CountryOption[] = [
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { iso: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', placeholder: '98765 43210' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦', placeholder: '50 123 4567' },
  { iso: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦', placeholder: '3312 3456' },
  { iso: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭', placeholder: '3600 1234' },
  { iso: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲', placeholder: '9212 3456' },
  { iso: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼', placeholder: '500 12345' },
  { iso: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰', placeholder: '301 2345678' },
  { iso: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭', placeholder: '917 123 4567' },
  { iso: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬', placeholder: '100 123 4567' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', placeholder: '7400 123456' },
  { iso: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', placeholder: '(201) 555-0123' },
  { iso: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', placeholder: '(204) 555-0123' },
  { iso: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', placeholder: '412 345 678' },
  { iso: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬', placeholder: '8123 4567' },
  { iso: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', placeholder: '802 123 4567' },
  { iso: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦', placeholder: '71 123 4567' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪', placeholder: '151 2345 6789' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { iso: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴', placeholder: '7 9012 3456' },
  { iso: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧', placeholder: '71 123 456' },
  { iso: 'XX', name: 'Other', dial: '', flag: '🌐', placeholder: 'Phone number' },
];

export function PhoneField({ defaultIso = 'AE' }: { defaultIso?: string }) {
  const [countryIso, setCountryIso] = useState(defaultIso);
  const [number, setNumber] = useState('');

  const country = COUNTRIES.find((c) => c.iso === countryIso) ?? COUNTRIES[0];
  const fullValue = number ? `${country.dial ? `${country.dial} ` : ''}${number}`.trim() : '';

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        Phone <span className="text-ink/40 font-normal">(optional)</span>
      </label>
      <div className="flex gap-2">
        <select
          value={countryIso}
          onChange={(e) => setCountryIso(e.target.value)}
          aria-label="Country code"
          className="border border-line rounded-xl px-2.5 py-2.5 text-sm bg-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow max-w-[9.5rem]"
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} {c.dial || '—'}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={country.placeholder}
          className="flex-1 min-w-0 border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow"
        />
      </div>
      {/* The value the form actually submits: dial code + number combined. */}
      <input type="hidden" name="phone" value={fullValue} />
    </div>
  );
}
