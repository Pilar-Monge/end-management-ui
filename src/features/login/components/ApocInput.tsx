import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ApocInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  children?: ReactNode;
}

export function ApocInput({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  children,
}: ApocInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 9,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          color: error ? '#e05050' : focused ? '#7ddb50' : '#3a6020',
          transition: 'color 0.2s',
        }}
      >
        {label}
      </label>

      <div style={{ position: 'relative' }}>
        <motion.div
          animate={{ height: focused ? '100%' : '30%' }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 2,
            background: error ? '#e05050' : focused ? '#7ddb50' : '#2a5018',
            borderRadius: 1,
          }}
        />

        {children ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: '100%',
              background: 'rgba(10,18,8,0.8)',
              border: `1px solid ${error ? 'rgba(224,80,80,0.5)' : focused ? 'rgba(125,219,80,0.4)' : 'rgba(60,96,32,0.3)'}`,
              borderLeft: 'none',
              borderRadius: '0 4px 4px 0',
              color: '#b8f080',
              fontFamily: "'Courier New', monospace",
              fontSize: 12,
              padding: '10px 12px 10px 14px',
              outline: 'none',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
              marginLeft: 2,
              appearance: 'none',
            }}
          >
            {children}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(10,18,8,0.8)',
              border: `1px solid ${error ? 'rgba(224,80,80,0.5)' : focused ? 'rgba(125,219,80,0.4)' : 'rgba(60,96,32,0.3)'}`,
              borderLeft: 'none',
              borderRadius: '0 4px 4px 0',
              color: '#b8f080',
              fontFamily: "'Courier New', monospace",
              fontSize: 13,
              padding: '10px 12px 10px 14px',
              outline: 'none',
              transition: 'border-color 0.2s',
              marginLeft: 2,
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 9,
              color: '#e05050',
              letterSpacing: '1px',
            }}
          >
            ⚠ {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
