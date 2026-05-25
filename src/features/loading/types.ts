export interface AnimationConfig {
  duration: number;
  type: "spring" | "tween";
  stiffness: number;
  damping: number;
  accentColor: string;
  autoplay: boolean;
  autoDelay: number;
}

export interface ServiceDetail {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  features: string[];
  icon: string;
  techStack: string[];
}

export interface PortfolioProject {
  id: string;
  title: string;
  category: string;
  description: string;
  stats: string;
  imageAlt: string;
  color: string;
}
