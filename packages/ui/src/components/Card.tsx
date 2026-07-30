import { ReactNode } from 'react';

interface Props {
  title?: string;
  children: ReactNode;
}

export function Card({ title, children }: Props) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  );
}
