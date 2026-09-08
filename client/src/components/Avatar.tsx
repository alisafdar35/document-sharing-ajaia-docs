import { avatarColor, initials } from '../lib/format';
import type { UserRef } from '../lib/types';

type AvatarProps = {
  user: UserRef;
  size?: 'sm' | 'md';
  title?: string;
};

export function Avatar({ user, size = 'md', title }: AvatarProps) {
  const dimensions = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${dimensions} ${avatarColor(user.id)}`}
      title={title ?? `${user.name} <${user.email}>`}
      aria-hidden="true"
    >
      {initials(user.name)}
    </span>
  );
}
