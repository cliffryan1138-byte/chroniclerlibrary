'use client';

import { useRef, useState } from 'react';
import type { FieldDef } from '@/lib/sites';
import type { FieldValue } from '@/lib/frontmatter';

const inputClass =
  'mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-base outline-none focus:border-black/40 dark:border-white/20 dark:bg-black/30';

interface Props {
  field: FieldDef;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  /** Site to upload images into. */
  siteKey: string;
}

export default function FieldInput({ field, value, onChange, siteKey }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const label = (
    <label className="block text-sm font-medium" htmlFor={field.name}>
      {field.label}
      {field.required && <span className="ml-1 text-red-600">*</span>}
    </label>
  );
  const help = field.help ? <p className="mt-1 text-xs opacity-60">{field.help}</p> : null;

  async function upload(file: File) {
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('site', siteKey);
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) {
        setUploadError(body.error || 'Upload failed.');
      } else {
        onChange(body.url);
      }
    } catch {
      setUploadError('Upload failed. Check your connection.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  switch (field.type) {
    case 'boolean':
      return (
        <div className="flex items-start gap-2 py-1">
          <input
            id={field.name}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <div>
            <label className="text-sm font-medium" htmlFor={field.name}>
              {field.label}
            </label>
            {help}
          </div>
        </div>
      );

    case 'select':
      return (
        <div>
          {label}
          <select
            id={field.name}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            <option value="">— choose —</option>
            {field.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {help}
        </div>
      );

    case 'list': {
      const arr = Array.isArray(value) ? value : [];
      return (
        <div>
          {label}
          <input
            id={field.name}
            value={arr.join(', ')}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0),
              )
            }
            placeholder="comma, separated, values"
            className={inputClass}
          />
          {help}
        </div>
      );
    }

    case 'text':
      return (
        <div>
          {label}
          <textarea
            id={field.name}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={inputClass}
          />
          {help}
        </div>
      );

    case 'number':
      return (
        <div>
          {label}
          <input
            id={field.name}
            type="number"
            inputMode={field.integer ? 'numeric' : 'decimal'}
            step={field.integer ? 1 : 0.5}
            min={field.min}
            max={field.max}
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className={inputClass}
          />
          {help}
        </div>
      );

    case 'date':
      return (
        <div>
          {label}
          <input
            id={field.name}
            type="date"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
          {help}
        </div>
      );

    case 'image':
      return (
        <div>
          {label}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              id={field.name}
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value)}
              placeholder="/uploads/2026/photo.jpg or https://…"
              className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-base outline-none focus:border-black/40 dark:border-white/20 dark:bg-black/30"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
          </div>
          {uploadError && <p className="mt-1 text-xs text-red-700">{uploadError}</p>}
          {typeof value === 'string' && value.startsWith('/uploads/') && (
            <p className="mt-1 text-xs opacity-60">
              Uploaded. It appears on the site once this post is committed and the site rebuilds.
            </p>
          )}
          {help}
        </div>
      );

    case 'url':
    case 'string':
    default:
      return (
        <div>
          {label}
          <input
            id={field.name}
            type={field.type === 'url' ? 'url' : 'text'}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
          {help}
        </div>
      );
  }
}
