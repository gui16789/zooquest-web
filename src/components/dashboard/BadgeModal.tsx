import { BadgeMeta } from "@/domain/badges/catalog";
import { Button } from "@/components/ui/Button";

interface BadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: BadgeMeta;
  isOwned: boolean;
  awardedAt?: string;
  progress?: {
    current: number;
    target: number;
    label?: string;
  };
  specialState?: "KP_DISABLED";
}

export function BadgeModal({
  isOpen,
  onClose,
  meta,
  isOwned,
  awardedAt,
  progress,
  specialState,
}: BadgeModalProps) {
  if (!isOpen) return null;

  const percent = progress
    ? Math.min(100, Math.max(0, (progress.current / progress.target) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200 transition-all sm:max-w-md">
        {/* Header / Image Area */}
        <div className={`relative flex h-48 w-full items-center justify-center bg-gradient-to-br ${isOwned ? "from-blue-50 to-indigo-50" : "from-zinc-100 to-zinc-200"}`}>
          <div className={`relative h-32 w-32 transition-transform duration-700 ${isOwned ? "scale-100" : "scale-90 grayscale opacity-60"}`}>
            <img
              src={meta.assetPath}
              alt={meta.name}
              className="h-full w-full object-contain drop-shadow-xl"
              onError={(e) => {
                e.currentTarget.src = meta.fallbackAssetPath;
              }}
            />
            {/* Lock Overlay for Locked Items */}
            {!isOwned && !specialState && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-zinc-900/20 p-2 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
              </div>
            )}
             {/* KP Disabled Overlay */}
             {specialState === "KP_DISABLED" && (
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="rounded-full bg-zinc-800/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                   未启用
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-1 text-center text-xl font-black text-zinc-900">
            {meta.name}
          </div>
          
          <div className="mb-6 text-center text-sm text-zinc-500">
            {specialState === "KP_DISABLED" ? "该徽章暂未启用（需要 KP 统计表数据支持）" : meta.description || "完成特定挑战以解锁此荣誉。"}
          </div>

          {isOwned ? (
            <div className="rounded-xl bg-green-50 p-4 text-center ring-1 ring-green-100">
              <div className="text-xs font-bold uppercase tracking-wider text-green-800">已获得</div>
              <div className="mt-1 text-sm font-medium text-green-700">
                {awardedAt ? new Date(awardedAt).toLocaleDateString() : "Unknown Date"}
              </div>
            </div>
          ) : specialState === "KP_DISABLED" ? (
             <div className="rounded-xl bg-zinc-100 p-4 text-center ring-1 ring-zinc-200">
              <div className="text-xs font-bold text-zinc-400">系统维护中</div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
                <span>当前进度</span>
                <span>{progress?.current ?? 0} / {progress?.target ?? "?"}</span>
              </div>
              
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="text-center text-xs text-zinc-400">
                {progress?.label || "继续努力！"}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Button variant="ghost" onClick={onClose} className="text-zinc-500 hover:text-zinc-900">
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
