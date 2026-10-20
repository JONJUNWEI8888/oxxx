export function BgVideo({ src, className = '' }: { src: string; className?: string }) {
  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      className={`object-cover ${className}`}
    />
  )
}
