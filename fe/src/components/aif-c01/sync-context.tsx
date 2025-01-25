import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from './types';

interface SyncContextType {
    activeItem: {
        type: 'subtitle' | 'summary' | null;
        id: number | null;
        time: number | null;
        trigger?: ScrollTrigger;
    };
    setActiveItem: (item: SyncContextType['activeItem']) => void;
    pendingScroll: {
        // targetId?: number;
        sourceIndex?: number;
        sequence?: number;
        trigger?: ScrollTrigger;
    } | null;
    setPendingScroll: (scroll: SyncContextType['pendingScroll']) => void;
}

const SyncContext = createContext<SyncContextType | null>(null);


export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
    const [activeItem, setActiveItem] = useState<SyncContextType['activeItem']>({
        type: null,
        id: null,
        time: null
    });
    const [pendingScroll, setPendingScroll] = useState<SyncContextType['pendingScroll']>(null);

    return (
        <SyncContext.Provider value={{ activeItem, setActiveItem, pendingScroll, setPendingScroll }}>
            {children}
        </SyncContext.Provider>
    );
};

// sync-context.tsx
export function useSync() {
    const context = useContext(SyncContext);
    if (!context) throw new Error('useSync must be used within SyncProvider');
    return context;
}

export function useScrollSync(type: 'subtitle' | 'summary') {
    const { activeItem, pendingScroll, setPendingScroll } = useSync();
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [targetKey, setTargetKey] = useState<{key: string, trigger: ScrollTrigger} | null>(null);

    const setItemRef = (key: string, element: HTMLDivElement | null) => {
        const prefixedKey = `${type}:${key}`;
        if (element) {
            itemRefs.current.set(prefixedKey, element);
        } else {
            itemRefs.current.delete(prefixedKey);
        }
    };

    const getItemRef = (key: string) => {
        const prefixedKey = `${type}:${key}`;
        return itemRefs.current.get(prefixedKey);
    };

    useEffect(() => {
        if (!pendingScroll) return;
        const { sourceIndex, sequence, trigger } = pendingScroll;
        if (!sourceIndex || !sequence) return;

        if (type === 'subtitle' && activeItem?.type === 'summary') {
            const key = `${sourceIndex}-${sequence}`;
            setTargetKey({ 
                key, 
                trigger: trigger || ScrollTrigger.SHORTCUT // 기본값으로 SHORTCUT 사용
            });
            setPendingScroll(null);
        }
    }, [pendingScroll, type, activeItem]);

    useEffect(() => {
        if (targetKey) {
            console.debug(`Scroll triggered by ${targetKey.trigger} to key: ${targetKey.key}`);
            const targetElement = getItemRef(targetKey.key);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // setTargetKey(null);  // 스크롤 후 초기화
            }
        }
    }, [targetKey]);

    return { setItemRef, itemRefs, getItemRef, setTargetKey };
}

// Types
interface FixedSizeList {
    scrollToItem: (index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start') => void;
}