import { useState, useCallback } from "react";
import type { AnimationConfig } from "../types";
import SplashIntro from "../components/SplashIntro";
import MainContent from "../components/MainContent";
import "../loading.css";

export default function LoadingPage() {
  const [animConfig, setAnimConfig] = useState<AnimationConfig>({
    duration: 1.1,
    type: "spring",
    stiffness: 120,
    damping: 18,
    accentColor: "royal",
    autoplay: false,
    autoDelay: 600,
  });

  const [showSplash, setShowSplash] = useState(true);
  const [isTransitionTriggered, setIsTransitionTriggered] = useState(false);

  const handleTransitionComplete = useCallback(() => {
  }, []);

  const handleTriggerReplay = useCallback(() => {
    setIsTransitionTriggered(false);
    setShowSplash(true);
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      minHeight: "100vh",
      backgroundColor: "#020617",
      color: "rgb(241, 245, 249)",
      userSelect: "none"
    }}>
      
      <MainContent
        animConfig={animConfig}
        setAnimConfig={setAnimConfig}
        triggerFullReplay={handleTriggerReplay}
        splashActive={showSplash && !isTransitionTriggered}
      />

      {showSplash && (
        <SplashIntro
          config={animConfig}
          onTransitionComplete={() => {
            handleTransitionComplete();
          }}
          isTriggered={isTransitionTriggered}
          setTriggered={setIsTransitionTriggered}
        />
      )}
    </div>
  );
}
