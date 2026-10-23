import Link from "next/link";

// Renders "Display Name @username", or just "@username" when no display
// name is set — used anywhere we credit a specific action to a person
// (comments, feed) so it's unambiguous which account did it.
export function UserHandle({
  username,
  name,
  className = "font-medium hover:underline",
}: {
  username: string;
  name: string | null;
  className?: string;
}) {
  return (
    <Link href={`/profile/${username}`} className={className}>
      {name && <span>{name} </span>}
      <span className={name ? "text-neutral-500 font-normal" : ""}>@{username}</span>
    </Link>
  );
}
