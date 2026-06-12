import {
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";

const SCENE =
  "https://prod.spline.design/l88s5-l7Vu1AfHLi/scene.splinecode";

type SplineProps = { scene: string; style?: CSSProperties };

export function HeroSpline({ style }: { style?: CSSProperties }) {
  const [Spline, setSpline] = useState<ComponentType<SplineProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@splinetool/react-spline").then((mod) => {
      if (!cancelled) setSpline(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Spline) return null;
  return <Spline scene={SCENE} style={style ?? { width: "100%", height: "100%" }} />;
}
