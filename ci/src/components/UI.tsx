import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { X } from "lucide-react";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`button ${variant} ${className}`} {...props} />;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input className="input" {...props} />; }
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select className="select" {...props} />; }
export function Title({ level = 1, children, className = "" }: { level?: 1 | 2 | 3; children: ReactNode; className?: string }) {
  const Tag = `h${level}` as const;
  return <Tag className={`title title-${level} ${className}`}>{children}</Tag>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Progress({ value, tone = "mint" }: { value: number; tone?: string }) { return <span className="progress"><span className={tone} style={{ width: `${Math.min(value, 100)}%` }} /></span>; }
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}><div className="modal-head"><Title level={2}>{title}</Title><Button variant="ghost" aria-label="Close dialog" onClick={onClose}><X size={19} /></Button></div>{children}</section></div>;
}
export function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><span className="empty-mark">0</span><Title level={3}>{title}</Title><p>{text}</p></div>; }
