interface AvatarProps {
  value: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  ring?: boolean
  label?: string
}

const avatarColors: Record<string, [string, string]> = {
  '弈': ['#d7b985', '#8b5f2d'],
  '岚': ['#a8c3ba', '#3f716c'],
  '白': ['#e3e1dc', '#797b7a'],
  '玄': ['#8d9393', '#242929'],
  '竹': ['#b6c79c', '#61734b'],
  '澄': ['#aebfd1', '#47647f'],
  '野': ['#d5b6a0', '#865f4d'],
  '川': ['#9fb9c8', '#426477'],
}

const avatarArtwork: Record<string, number> = {
  '弈': 1,
  '安': 2,
  '云': 3,
  '灯': 4,
  '松': 5,
  '观': 6,
  '石': 7,
  '雨': 8,
  '岚': 2,
  '白': 4,
  '玄': 3,
  '竹': 5,
  '澄': 6,
  '野': 7,
  '川': 8,
  '清': 2,
  '落': 7,
}

function getAvatarArtwork(value: string) {
  const firstCharacter = Array.from(value)[0] ?? ''
  const fallback = ((firstCharacter.codePointAt(0) ?? 0) % 8) + 1
  const index = avatarArtwork[firstCharacter] ?? fallback
  return `/assets/avatars/avatar-${String(index).padStart(2, '0')}.webp`
}

export function Avatar({ value, size = 'md', ring = false, label }: AvatarProps) {
  const [light, dark] = avatarColors[value] ?? avatarColors['弈']
  return (
    <div
      className={`avatar avatar--${size}${ring ? ' avatar--ring' : ''}`}
      style={{ '--avatar-light': light, '--avatar-dark': dark } as React.CSSProperties}
      role="img"
      aria-label={label ?? `${value}的头像`}
    >
      <span className="avatar__fallback" aria-hidden="true">{value}</span>
      <img
        className="avatar__image"
        src={getAvatarArtwork(value)}
        alt=""
        aria-hidden="true"
        draggable={false}
        onError={(event) => { event.currentTarget.hidden = true }}
      />
    </div>
  )
}
