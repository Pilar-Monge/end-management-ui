import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AnimationConfig } from "../types";
import SplashIntro from "../components/SplashIntro";
import "../loading.css";

export default function LoadingPage() {
  const navigate = useNavigate();
  
  const [animConfig] = useState<AnimationConfig>({
    duration: 1.1,
    type: "spring",
    stiffness: 120,
    damping: 18,
    accentColor: "royal",
    autoplay: false,
    autoDelay: 600,
  });

  const [isTransitionTriggered, setIsTransitionTriggered] = useState(false);

  useEffect(() => {
    const loadHomepage = async () => {
      try {
        await import("../../main-homepage");
      } catch (e) {
        console.warn("Error precargando main-homepage:", e);
      }
    };
    
    loadHomepage();
  }, []);

  const handleTransitionComplete = useCallback(() => {
    navigate("/main-homepage", { replace: true });
  }, [navigate]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      overflow: "hidden",
      minHeight: "100vh",
      backgroundColor: "#020617",
      color: "rgb(241, 245, 249)",
      userSelect: "none",
      zIndex: 9998
    }}>
      
      <SplashIntro
        config={animConfig}
        onTransitionComplete={handleTransitionComplete}
        isTriggered={isTransitionTriggered}
        setTriggered={setIsTransitionTriggered}
      />
    </div>
  );
}
