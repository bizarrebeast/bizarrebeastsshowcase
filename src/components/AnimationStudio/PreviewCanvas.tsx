import React, { useRef, useEffect } from 'react';
import type { ActionBlockInstance, AnimationState } from './types';
import { calculateAnimation } from './animationEngine';

interface PreviewCanvasProps {
  blocks: ActionBlockInstance[];
  animationState: AnimationState;
  isPlaying: boolean;
  currentTime: number;
  width?: number;
  height?: number;
  sprites?: Array<{ id: string; name: string; src: string }>;
}

const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  blocks,
  animationState,
  isPlaying,
  currentTime,
  width = 800,
  height = 600,
  sprites = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Get current animation values
    const animation = calculateAnimation(blocks, currentTime);
    
    // Draw character placeholder
    ctx.save();
    ctx.translate(width / 2 + animation.x, height / 2 + animation.y);
    ctx.rotate(animation.rotation * Math.PI / 180);
    ctx.scale(animation.scaleX, animation.scaleY);

    // Draw character rectangle (placeholder for sprites)
    ctx.fillStyle = animation.color || '#4F46E5';
    ctx.fillRect(-40, -60, 80, 120);

    // Draw direction indicator
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(40, -10);
    ctx.lineTo(40, 10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Draw effects
    if (animation.effects) {
      animation.effects.forEach(effect => {
        if (effect.type === 'trail') {
          ctx.save();
          ctx.globalAlpha = effect.opacity || 0.3;
          ctx.fillStyle = effect.color || '#4F46E5';
          effect.positions?.forEach((pos, i) => {
            ctx.globalAlpha = (0.3 * (i + 1)) / (effect.positions?.length || 1);
            ctx.fillRect(
              width / 2 + pos.x - 20,
              height / 2 + pos.y - 30,
              40,
              60
            );
          });
          ctx.restore();
        }
      });
    }

    // Draw info text
    if (blocks.length > 0 && animationState.currentBlockIndex < blocks.length) {
      const currentBlock = blocks[animationState.currentBlockIndex];
      ctx.fillStyle = '#FFF';
      ctx.font = '14px monospace';
      ctx.fillText(`Current: ${currentBlock.name}`, 10, 20);
      ctx.fillText(`Time: ${Math.round(currentTime)}ms`, 10, 40);
      ctx.fillText(`Block: ${animationState.currentBlockIndex + 1}/${blocks.length}`, 10, 60);
    }

  }, [blocks, animationState, currentTime, width, height]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white font-bold mb-4">Preview</h3>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="bg-gray-900 rounded"
      />
      <div className="mt-4 flex justify-center gap-4">
        <div className="text-center">
          <div className="text-gray-400 text-xs">Position</div>
          <div className="text-white text-sm">
            X: {Math.round(animationState.x)} Y: {Math.round(animationState.y)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400 text-xs">Rotation</div>
          <div className="text-white text-sm">
            {Math.round(animationState.rotation)}°
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400 text-xs">Scale</div>
          <div className="text-white text-sm">
            {animationState.scale.toFixed(2)}x
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewCanvas;