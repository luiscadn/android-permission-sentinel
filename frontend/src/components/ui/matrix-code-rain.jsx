import React, { useRef, useEffect, useCallback } from "react";

export const Component = ({
  fontSize = 11,
  speed = 0.25,
  density = 4,
  textColor = "#ff0000",
  opacity = 0.38,
} = {}) => {
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const strands = useRef([]);
  const lastTime = useRef(0);
  const cursorBlinkTime = useRef(0);

  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,./<>?";

  const getRandomChar = useCallback(() => {
    return characters.charAt(Math.floor(Math.random() * characters.length));
  }, [characters]);

  const createStrand = useCallback(
    (x, canvasHeight) => {
      const layer = Math.floor(Math.random() * 3);
      const scale = layer === 0 ? 0.8 : layer === 1 ? 1 : 1.2;
      const length = Math.floor(Math.random() * 15) + 15;

      const chars = Array(length)
        .fill(null)
        .map(() => ({
          char: getRandomChar(),
          opacity: 1,
        }));

      return {
        x,
        y: -length * (fontSize * scale),
        speed:
          (Math.random() * 0.3 + 0.7) *
          speed *
          fontSize *
          (layer === 2 ? 1.2 : layer === 1 ? 1 : 0.8),
        length,
        characters: chars,
        showCursor: true,
        layer,
        scale,
      };
    },
    [fontSize, getRandomChar, speed],
  );

  const updateStrands = useCallback(
    (ctx, width, height, deltaTime) => {
      const spacing = fontSize * 1.4;
      const maxStrands = Math.floor(width / spacing) * density * 1.5;

      if (strands.current.length < maxStrands) {
        const availableSlots = Array.from({
          length: Math.floor(width / spacing),
        })
          .map((_, i) => i * spacing)
          .filter((x) => !strands.current.some((strand) => strand.x === x));

        if (availableSlots.length > 0 && Math.random() < 0.12 * density) {
          const x =
            availableSlots[Math.floor(Math.random() * availableSlots.length)];
          strands.current.push(createStrand(x, height));
        }
      }

      cursorBlinkTime.current += deltaTime;
      if (cursorBlinkTime.current >= 500) {
        strands.current.forEach((strand) => {
          strand.showCursor = !strand.showCursor;
        });
        cursorBlinkTime.current = 0;
      }

      ctx.fillStyle = "#050508";
      ctx.fillRect(0, 0, width, height);

      strands.current.sort((a, b) => a.layer - b.layer);

      strands.current = strands.current.filter((strand) => {
        strand.y += strand.speed * deltaTime * 0.05;

        const baseOpacity =
          strand.layer === 0 ? 0.35 : strand.layer === 1 ? 0.65 : 0.95;
        const blur = strand.layer === 0 ? 1 : strand.layer === 1 ? 2 : 4;

        const scaledFontSize = fontSize * strand.scale;
        ctx.font = `${scaledFontSize}px monospace`;
        ctx.shadowBlur = blur;
        ctx.shadowColor = textColor;

        strand.characters.forEach((char, i) => {
          const y = strand.y + i * scaledFontSize;

          if (y > -scaledFontSize && y < height + scaledFontSize) {
            ctx.fillStyle = textColor;
            ctx.globalAlpha = baseOpacity;
            ctx.fillText(char.char, strand.x, y);

            if (i === strand.characters.length - 1 && strand.showCursor) {
              ctx.fillStyle = "#FFFFFF";
              ctx.globalAlpha = baseOpacity;
              ctx.fillRect(strand.x, y + 2, scaledFontSize * 0.8, 2);
            }
          }
        });

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        if (Math.random() < 0.02) {
          const randomIndex = Math.floor(
            Math.random() * strand.characters.length,
          );
          strand.characters[randomIndex].char = getRandomChar();
        }

        return strand.y - strand.length * (fontSize * strand.scale) < height;
      });
    },
    [density, fontSize, getRandomChar, textColor, createStrand],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  const animate = useCallback(
    (time) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const deltaTime = time - lastTime.current;
      lastTime.current = time;

      if (
        canvas.width !== window.innerWidth ||
        canvas.height !== window.innerHeight
      ) {
        resizeCanvas();
      }

      updateStrands(ctx, canvas.width, canvas.height, deltaTime);

      animationFrameId.current = requestAnimationFrame(animate);
    },
    [resizeCanvas, updateStrands],
  );

  useEffect(() => {
    resizeCanvas();
    lastTime.current = performance.now();
    cursorBlinkTime.current = 0;
    animationFrameId.current = requestAnimationFrame(animate);

    window.addEventListener("resize", resizeCanvas);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [animate, resizeCanvas]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        backgroundColor: "#050508",
        opacity: opacity,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

export const MatrixCodeRain = Component;
export default Component;
