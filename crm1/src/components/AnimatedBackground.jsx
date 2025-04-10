import React, { useEffect, useRef } from "react";

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    // Line configuration
    const LINE_COUNT = 50;
    const lines = [];

    class Line {
      constructor() {
        this.reset();
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      }

      reset() {
        const side = Math.floor(Math.random() * 4);
        switch (side) {
          case 0:
            this.x = Math.random() * canvas.width;
            this.y = 0;
            this.angle = Math.PI / 2 + (Math.random() * 0.4 - 0.2);
            break;
          case 1:
            this.x = canvas.width;
            this.y = Math.random() * canvas.height;
            this.angle = Math.PI + (Math.random() * 0.4 - 0.2);
            break;
          case 2:
            this.x = Math.random() * canvas.width;
            this.y = canvas.height;
            this.angle = -Math.PI / 2 + (Math.random() * 0.4 - 0.2);
            break;
          case 3:
            this.x = 0;
            this.y = Math.random() * canvas.height;
            this.angle = 0 + (Math.random() * 0.4 - 0.2);
            break;
        }
        this.length = Math.random() * 100 + 50;
        this.speed = Math.random() * 2 + 1;
        this.width = Math.random() * 2 + 0.5;
        this.opacity = Math.random() * 0.5 + 0.1;
        const hue = Math.random() * 40 + 180;
        this.color = `hsla(${hue}, 100%, 50%, ${this.opacity})`;
      }

      update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        if (
          this.x < -this.length ||
          this.x > canvas.width + this.length ||
          this.y < -this.length ||
          this.y > canvas.height + this.length
        ) {
          this.reset();
        }
      }

      draw() {
        if (!ctx) return;

        const endX = this.x + Math.cos(this.angle) * this.length;
        const endY = this.y + Math.sin(this.angle) * this.length;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);

        const gradient = ctx.createLinearGradient(this.x, this.y, endX, endY);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, `hsla(190, 100%, 50%, 0)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.width;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.save();
        ctx.filter = "blur(4px)";
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.width * 0.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    for (let i = 0; i < LINE_COUNT; i++) {
      lines.push(new Line());
    }

    function animate() {
      if (!ctx || !canvas) return;

      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      lines.forEach((line) => {
        line.update();
        line.draw();
      });

      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.7
      );
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener("resize", setCanvasSize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
  );
};

export default AnimatedBackground;