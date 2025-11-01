'use client';

interface AIAvatarProps {
  isActive: boolean;
}

export function AIAvatar({ isActive }: AIAvatarProps) {
  return (
    <div className="absolute bottom-6 right-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-1">
      <div className="bg-gray-900 rounded-full p-4 relative">
        {/* AI Icon */}
        <div className="text-3xl">🤖</div>

        {/* Speaking Indicator */}
        {isActive && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Name Label */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <span className="text-white text-xs font-medium bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
          AI Interviewer
        </span>
      </div>
    </div>
  );
}
