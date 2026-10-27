import { useEffect } from 'react';
import type { RefObject } from 'react';

export const useOutsideClick = <T extends HTMLElement>(
    ref: RefObject<T | null>,
    callback: () => void,
): void => {
    useEffect(() => {
        const handleClick = (event: MouseEvent | TouchEvent) => {
            if (!event.target) return;

            if (
                ref.current &&
                event.target instanceof Node &&
                !ref.current.contains(event.target)
            ) {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('touchstart', handleClick);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('touchstart', handleClick);
        };
    }, [ref, callback]);
};
