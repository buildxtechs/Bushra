'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AdminContext = createContext();

export function AdminProvider({ children }) {
    const [data, setData] = useState({
        categories: [],
        menu: [],
        settings: {},
        inventory: [],
        suppliers: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refreshData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch('/api/admin/setup');
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            
            setData({
                categories: result.categories || [],
                menu: result.menu || [],
                settings: result.settings || {},
                inventory: result.inventory || [],
                suppliers: result.suppliers || []
            });
            setError(null);
        } catch (err) {
            console.error('Admin Context Error:', err);
            setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return (
        <AdminContext.Provider value={{ ...data, loading, error, refreshData }}>
            {children}
        </AdminContext.Provider>
    );
}

export function useAdmin() {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
}
