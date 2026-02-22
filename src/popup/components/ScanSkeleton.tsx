export default function ScanSkeleton() {
    return (
        <div className="bs-glass overflow-hidden">
            {/* Header skeleton */}
            <div className="p-4 flex items-start justify-between">
                <div className="flex items-start gap-3 w-full">
                    <div className="w-8 h-8 rounded-full bg-bs-bg-tertiary animate-pulse flex-shrink-0" />
                    <div className="flex flex-col gap-2 w-full pt-1">
                        <div className="h-4 bg-bs-bg-tertiary rounded animate-pulse w-32" />
                        <div className="h-3 bg-bs-bg-tertiary rounded animate-pulse w-48" />
                    </div>
                </div>
                <div className="w-16 h-6 rounded-full bg-bs-bg-tertiary animate-pulse flex-shrink-0" />
            </div>

            {/* Summary skeleton */}
            <div className="px-4 pb-3">
                <div className="bg-bs-bg-tertiary/40 rounded-lg p-3 flex flex-col gap-2">
                    <div className="h-2 bg-bs-bg-tertiary rounded animate-pulse w-full" />
                    <div className="h-2 bg-bs-bg-tertiary rounded animate-pulse w-5/6" />
                    <div className="h-2 bg-bs-bg-tertiary rounded animate-pulse w-4/6" />
                </div>
            </div>

            {/* Clause items skeleton */}
            <div className="px-4 pb-4 flex flex-col gap-1.5">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-bs-bg-tertiary/30 p-3 rounded-lg flex items-start gap-3 border border-bs-border/30">
                        <div className="w-6 h-6 rounded-md bg-bs-bg-tertiary animate-pulse flex-shrink-0" />
                        <div className="w-full flex flex-col gap-2 pt-1">
                            <div className="h-3 bg-bs-bg-tertiary rounded animate-pulse w-24" />
                            <div className="h-2 bg-bs-bg-tertiary rounded animate-pulse w-full" />
                            <div className="h-2 bg-bs-bg-tertiary rounded animate-pulse w-3/4" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-4 pb-4">
                <div className="h-8 rounded-lg bg-bs-bg-tertiary/60 animate-pulse w-full" />
            </div>
        </div>
    );
}
