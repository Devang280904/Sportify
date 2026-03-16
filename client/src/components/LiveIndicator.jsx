const LiveIndicator = ({ size = 'sm' }) => {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span className="inline-flex items-center space-x-1.5">
      <span className="relative flex">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 ${sizes[size]}`}></span>
        <span className={`relative inline-flex rounded-full bg-accent ${sizes[size]}`}></span>
      </span>
      <span className="text-accent text-xs font-bold uppercase tracking-wider">LIVE</span>
    </span>
  );
};

export default LiveIndicator;
