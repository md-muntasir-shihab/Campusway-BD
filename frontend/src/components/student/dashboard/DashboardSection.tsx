import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;
    delay?: number;
    className?: string;
}

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: (d: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, delay: d * 0.06, ease: 'easeOut' as const },
    }),
};

export default function DashboardSection({ children, delay = 0, className = '' }: Props) {
    return (
        <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={delay}
            className={className}
        >
            {children}
        </motion.section>
    );
}
