import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { ScrollTrigger } from './types';
import { debug } from "@/lib/utils"

export interface TimeState {
    currentTimeMs: number;
    pendingTimeMs: number | null;
    disableCount: number;
}

export interface SyncContextType {
    activeItem: {
        type: 'subtitle' | 'summary' | 'timestamp' | 'slide' | null;
        id: number | null;
        time: number | null;
        trigger?: ScrollTrigger;
    };
    setActiveItem: (item: SyncContextType['activeItem']) => void;
    pendingScroll: {
        targetId?: number;
        trigger?: ScrollTrigger;
    } | null;
    setPendingScroll: (scroll: SyncContextType['pendingScroll']) => void;
    timeState: TimeState;
    setCurrentTime: (time: number) => void;
    seekTo: (time: number) => void;
    enableTimeUpdate: () => void;
    disableTimeUpdate: () => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
    const [activeItem, setActiveItem] = useState<SyncContextType['activeItem']>({
        type: null,
        id: null,
        time: null
    });
    const [pendingScroll, setPendingScroll] = useState<SyncContextType['pendingScroll']>(null);
    const [timeState, setTimeState] = useState<TimeState>({
        currentTimeMs: 0,
        pendingTimeMs: null,
        disableCount: 0,
    });

    const setCurrentTime = useCallback((time: number) => {
        if (timeState.disableCount === 0) {
            setTimeState(prev => ({ ...prev, currentTimeMs: time }));
        }
    }, [timeState.disableCount]);

    const seekTo = useCallback((time: number) => {
        // debug(`seekTo: ${time}, disableCount: ${timeState.disableCount}`);
        setTimeState(prev => ({
            ...prev,
            currentTimeMs: prev.disableCount === 0 ? time : prev.currentTimeMs,
            pendingTimeMs: prev.disableCount !== 0 ? time : null
        }));
    }, []);

    const enableTimeUpdate = useCallback(() => {
        debug(`enableTimeUpdate: ${timeState.disableCount}`);
        setTimeState(prev => ({
            ...prev,
            disableCount: Math.max(0, prev.disableCount - 1),
            currentTimeMs: prev.disableCount === 1 && prev.pendingTimeMs !== null 
                ? prev.pendingTimeMs 
                : prev.currentTimeMs,
            pendingTimeMs: prev.disableCount === 1 ? null : prev.pendingTimeMs
        }));
    }, []);

    const disableTimeUpdate = useCallback(() => {
        debug(`disableTimeUpdate: ${timeState.disableCount}`);
        setTimeState(prev => ({
            ...prev,
            disableCount: prev.disableCount + 1
        }));
    }, []);

    return (
        <SyncContext.Provider value={{
            activeItem,
            setActiveItem,
            pendingScroll,
            setPendingScroll,
            timeState,
            setCurrentTime,
            seekTo,
            enableTimeUpdate,
            disableTimeUpdate
        }}>
            {children}
        </SyncContext.Provider>
    );
};

export function useSync() {
    const context = useContext(SyncContext);
    if (!context) throw new Error('useSync must be used within SyncProvider');
    return context;
}

export function useItemsRefSync(type: 'subtitle' | 'summary' | 'timestamp'|'slide'| 'all') {
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const setItemRef = (key: string, element: HTMLDivElement | null) => {
        const prefixedKey = `${type}:${key}`;
        if (element) {
            itemRefs.current.set(prefixedKey, element);
        } else {
            itemRefs.current.delete(prefixedKey);
        }
    };

    const getItemRef = (key: string) => {
        //not support : all
        const prefixedKey = `${type}:${key}`;
        return itemRefs.current.get(prefixedKey);
    };

    const getTypeRefs = (searchType: string) => {
        const refs = new Map<string, HTMLDivElement>();
        const prefix = `${searchType}:`;
        
        for (const [key, value] of itemRefs.current.entries()) {
            if (key.startsWith(prefix)) {
                refs.set(key.replace(prefix, ''), value);
            }
        }
        return refs;
    };

    return {
        setItemRef,
        getItemRef,
        getTypeRefs
    };
}

// Types
interface FixedSizeList {
    scrollToItem: (index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start') => void;
}