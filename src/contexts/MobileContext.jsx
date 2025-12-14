import React, { createContext, useContext, useState, useEffect } from 'react';

const MobileContext = createContext();

export const useMobile = () => {
    const context = useContext(MobileContext);
    if (!context) {
        throw new Error('useMobile must be used within a MobileProvider');
    }
    return context;
};

export const MobileProvider = ({ children }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close drawer when switching to desktop
    useEffect(() => {
        if (!isMobile) {
            setIsDrawerOpen(false);
        }
    }, [isMobile]);

    // Close drawer on navigation (will be called from Sidebar)
    const closeDrawer = () => setIsDrawerOpen(false);
    const openDrawer = () => setIsDrawerOpen(true);
    const toggleDrawer = () => setIsDrawerOpen(prev => !prev);

    return (
        <MobileContext.Provider value={{
            isMobile,
            isDrawerOpen,
            openDrawer,
            closeDrawer,
            toggleDrawer
        }}>
            {children}
        </MobileContext.Provider>
    );
};

export default MobileContext;
