import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { HiOutlineTrophy } from 'react-icons/hi2';

const VictoryOverlay = ({ winner, resultMessage, onAction }) => {
  useEffect(() => {
    // Immediate pop
    const duration = 5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00B894', '#00DFB8', '#ffffff']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00B894', '#00DFB8', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Big blast
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
      <div className="max-w-xl w-full text-center space-y-8 animate-scale-up">
        {/* Trophy Icon */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/40 blur-3xl rounded-full scale-110"></div>
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/40 border-4 border-white/20 animate-bounce">
            <HiOutlineTrophy className="text-5xl sm:text-7xl text-white" />
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-4">
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase italic underline decoration-primary decoration-4">
            Congratulations!
          </h2>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {winner?.teamName || 'Winner'}
            </h3>
            <p className="text-xl text-txt-muted font-medium">
              {resultMessage}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <button
            onClick={onAction}
            className="px-10 py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-primary hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-xl"
          >
            Go to Summary
          </button>
        </div>
      </div>
    </div>
  );
};

export default VictoryOverlay;
