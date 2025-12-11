import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Watch } from 'lucide-react';

const OverlayUI = ({ mode = 'sphere' }) => {
    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20">
            {/* Header - Positioned above the box */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="absolute top-[10%] text-center w-full"
            >
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter mb-4 drop-shadow-2xl">
                    {mode === 'paired' ? 'Device Paired' : 'Animated Visual Code'}
                </h1>
                <p className="text-white/60 text-base md:text-lg font-light tracking-widest uppercase">
                    {mode === 'sphere' && 'Initializing...'}
                    {mode === 'qr' && 'Scan the star pattern'}
                    {mode === 'paired' && 'Synchronization Complete'}
                </p>
            </motion.div>

            {/* Bottom Status - Positioned below the box */}
            <motion.div
                className="absolute bottom-[10%] pointer-events-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
            >
                {mode !== 'paired' && (
                    <button className="px-6 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-sm text-white/70 hover:text-white transition-all duration-300">
                        Use Manual Code
                    </button>
                )}
            </motion.div>
        </div>
    );
};

export default OverlayUI;
