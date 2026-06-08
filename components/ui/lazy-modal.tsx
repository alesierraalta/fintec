'use client';

import dynamic from 'next/dynamic';
import { ModalProps } from './modal';

// Dynamically load the Modal component (which includes framer-motion)
// This reduces the initial bundle by deferring framer-motion loading
const Modal = dynamic(
  () => import('./modal').then((mod) => ({ default: mod.Modal })),
  { ssr: false }
);

export function LazyModal(props: ModalProps) {
  return <Modal {...props} />;
}

export type { ModalProps };
export default LazyModal;
