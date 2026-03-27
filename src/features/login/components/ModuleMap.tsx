import { motion } from 'framer-motion';
import { MODULES } from '../../../shared/constants/app';

interface ModuleMapProps {
  userRole: string;
  onNavigate: (path: string) => void;
}

export function ModuleMap({ userRole, onNavigate }: ModuleMapProps) {
  const available = MODULES.filter((moduleItem) => moduleItem.roles.includes(userRole));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 680 }}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <div
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 9,
            letterSpacing: '4px',
            color: '#3a6020',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Acceso concedido — {userRole.replace('_', ' ')}
        </div>
        <h2
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: 26,
            fontWeight: 800,
            color: '#b8f080',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            margin: 0,
            textShadow: '0 0 30px rgba(100,220,60,0.3)',
          }}
        >
          Centro de control
        </h2>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
        }}
      >
        {available.map((moduleItem, index) => (
          <motion.button
            key={moduleItem.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onNavigate(moduleItem.path)}
            whileHover={{ scale: 1.04, borderColor: `${moduleItem.color}99` }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'rgba(10,18,8,0.7)',
              border: `1px solid ${moduleItem.color}44`,
              borderRadius: 8,
              padding: '18px 14px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              outline: 'none',
              transition: 'border-color 0.2s',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${moduleItem.color}88, transparent)`,
              }}
            />

            <span style={{ fontSize: 20, color: moduleItem.color }}>{moduleItem.icon}</span>

            <div>
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 11,
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  color: '#b8f080',
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}
              >
                {moduleItem.label}
              </div>
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 9,
                  color: '#3a6020',
                  letterSpacing: '1px',
                }}
              >
                {moduleItem.description}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          textAlign: 'center',
          marginTop: 24,
          fontFamily: "'Courier New', monospace",
          fontSize: 9,
          letterSpacing: '2px',
          color: '#1e3810',
          textTransform: 'uppercase',
        }}
      >
        {available.length} módulos disponibles para tu rol
      </motion.div>
    </motion.div>
  );
}
