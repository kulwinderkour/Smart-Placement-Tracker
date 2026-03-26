import React, { useRef, useEffect, useState } from 'react';
import { 
  Zap, 
  FileText, 
  LayoutDashboard, 
  Video, 
  MessageSquare, 
  Bell,
  Users,
  Target
} from 'lucide-react';
import './MagicBento.css';

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
  icon?: React.ReactNode;
  content?: React.ReactNode;
}

const BentoCard: React.FC<BentoCardProps> = ({
  color = '#3b82f6',
  title = 'Feature',
  description = 'Description',
  label = 'Learn more',
  textAutoHide = false,
  disableAnimations = false,
  icon,
  content
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableAnimations || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
  };

  const handleMouseLeave = () => {
    if (disableAnimations || !cardRef.current) return;
    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  return (
    <div
      ref={cardRef}
      className="magic-bento-card"
      style={{
        background: `linear-gradient(135deg, ${color}15, ${color}25)`,
        border: `1px solid ${color}40`,
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseLeave();
      }}
    >
      {/* Glow effect */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
          opacity: isHovered ? 0.6 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none'
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {icon && (
          <div style={{
            fontSize: '2rem',
            marginBottom: '1rem',
            color: color
          }}>
            {icon}
          </div>
        )}
        
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: '#ffffff'
        }}>
          {title}
        </h3>
        
        <p style={{
          fontSize: '0.875rem',
          color: '#a0a0a0',
          lineHeight: '1.5',
          marginBottom: '1rem'
        }}>
          {description}
        </p>
      </div>

      {/* Label */}
      {label && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: color,
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          {label}
          <Target size={16} />
        </div>
      )}

      {/* Additional content */}
      {content && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {content}
        </div>
      )}
    </div>
  );
};

interface MagicBentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  children?: React.ReactNode;
}

const MagicBento: React.FC<MagicBentoProps> = ({
  textAutoHide = false,
  enableStars = false,
  enableSpotlight = false,
  children
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [mouseInside, setMouseInside] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;

    const cards = gridRef.current.querySelectorAll('.magic-bento-card');
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const maxDistance = Math.max(centerX, centerY);
      const intensity = Math.max(0, 1 - distance / maxDistance);

      (card as HTMLElement).style.setProperty('--glow-intensity', intensity.toString());
    });
  };

  const handleMouseEnter = () => setMouseInside(true);
  const handleMouseLeave = () => {
    setMouseInside(false);
    if (gridRef.current) {
      const cards = gridRef.current.querySelectorAll('.magic-bento-card');
      cards.forEach((card) => {
        (card as HTMLElement).style.setProperty('--glow-intensity', '0');
      });
    }
  };

  return (
    <div
      ref={gridRef}
      className="magic-bento-grid"
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        padding: '2rem'
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children || (
        <>
          <BentoCard
            color="#3b82f6"
            icon={<Zap />}
            title="Lightning Fast"
            description="Experience blazing fast performance with our optimized infrastructure"
            label="Explore features"
          />
          <BentoCard
            color="#10b981"
            icon={<FileText />}
            title="Smart Analytics"
            description="Get detailed insights and analytics to make informed decisions"
            label="View analytics"
          />
          <BentoCard
            color="#f59e0b"
            icon={<LayoutDashboard />}
            title="Intuitive Dashboard"
            description="Beautiful and user-friendly interface designed for productivity"
            label="Take tour"
          />
          <BentoCard
            color="#ef4444"
            icon={<Video />}
            title="Video Integration"
            description="Seamless video conferencing and collaboration tools"
            label="Start meeting"
          />
          <BentoCard
            color="#8b5cf6"
            icon={<MessageSquare />}
            title="Real-time Chat"
            description="Connect with your team through instant messaging"
            label="Open chat"
          />
          <BentoCard
            color="#06b6d4"
            icon={<Bell />}
            title="Smart Notifications"
            description="Stay updated with intelligent notification system"
            label="Configure"
          />
          <BentoCard
            color="#84cc16"
            icon={<Users />}
            title="Team Collaboration"
            description="Work together efficiently with powerful collaboration tools"
            label="Invite team"
          />
          <BentoCard
            color="#f97316"
            icon={<Target />}
            title="Goal Tracking"
            description="Set and track your goals with our comprehensive system"
            label="Set goals"
          />
        </>
      )}
    </div>
  );
};

export default MagicBento;
