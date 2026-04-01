export default function AlertBadge({ count }) {
  if (!count || count === 0) return null;
  return (
    <span className="ml-auto bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}
