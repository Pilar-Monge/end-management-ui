
import { motion } from 'framer-motion';
interface SkeletonRowProps {
  cols: number;
}

function SkeletonRow({ cols }: SkeletonRowProps) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px' }}>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              height: '20px',
              background: 'rgba(125, 219, 80, 0.1)',
              borderRadius: '4px',
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export function LoadingSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div
      style={{
        width: '100%',
        background: 'rgba(10,18,8,0.5)',
        border: '1px solid rgba(74,138,48,0.2)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        background: 'rgba(10,18,8,0.5)',
        border: '1px dashed rgba(74,138,48,0.3)',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          marginBottom: '16px',
        }}
      >
        ∅
      </div>
      <h3
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: '16px',
          letterSpacing: '2px',
          color: '#7ddb50',
          margin: '0 0 8px',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: '12px',
          color: '#3a6020',
          letterSpacing: '1px',
          margin: '0 0 24px',
        }}
      >
        {description}
      </p>
      {action && (
        <motion.button
          onClick={action.onClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: 'rgba(74,138,48,0.14)',
            border: '1px solid rgba(74,138,48,0.5)',
            borderRadius: '4px',
            color: '#7ddb50',
            fontFamily: "'Courier New', monospace",
            fontSize: '11px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            padding: '10px 18px',
            cursor: 'pointer',
          }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '24px',
        background: 'rgba(224,80,80,0.08)',
        border: '1px solid rgba(224,80,80,0.3)',
        borderRadius: '8px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '32px',
          marginBottom: '12px',
        }}
      >
        ⚠
      </div>
      <h3
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: '14px',
          letterSpacing: '2px',
          color: '#e08080',
          margin: '0 0 8px',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: '11px',
          color: '#c06060',
          letterSpacing: '0.5px',
          margin: '0 0 20px',
        }}
      >
        {message}
      </p>
      {onRetry && (
        <motion.button
          onClick={onRetry}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: 'rgba(224,80,80,0.14)',
            border: '1px solid rgba(224,80,80,0.5)',
            borderRadius: '4px',
            color: '#e08080',
            fontFamily: "'Courier New', monospace",
            fontSize: '11px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            padding: '10px 18px',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </motion.button>
      )}
    </motion.div>
  );
}
