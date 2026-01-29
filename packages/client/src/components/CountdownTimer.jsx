import { useState, useEffect, useRef } from 'react';

/*
 * Server-synced countdown timer
 * Uses timeOffset to calculate accurate remaining time
 */
function CountdownTimer({ endTime, timeOffset = 0, onEnd }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const hasEndedRef = useRef(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            // use server time (local + offset)
            const serverNow = Date.now() + timeOffset;
            const remaining = endTime - serverNow;

            if (remaining <= 0) {
                if (!hasEndedRef.current) {
                    hasEndedRef.current = true;
                    onEnd?.();
                }
                return 0;
            }

            return remaining;
        };

        // initial calculation
        setTimeLeft(calculateTimeLeft());

        // update every 100ms for smooth display
        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 100);

        return () => clearInterval(interval);
    }, [endTime, timeOffset, onEnd]);

    if (timeLeft === null) {
        return <div className="countdown loading">--:--</div>;
    }

    if (timeLeft <= 0) {
        return <div className="countdown ended">ENDED</div>;
    }

    // format time
    const totalSeconds = Math.floor(timeLeft / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((timeLeft % 1000) / 100);

    // urgency levels
    const isUrgent = totalSeconds < 30;
    const isCritical = totalSeconds < 10;

    return (
        <div className={`countdown ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''}`}>
            <span className="countdown-label">Time Left</span>
            <span className="countdown-value">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                <span className="countdown-tenths">.{tenths}</span>
            </span>
        </div>
    );
}

export default CountdownTimer;
